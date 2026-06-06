# 股票追蹤系統設計文件

**版本：** 1.0.0
**最後更新：** 2026-06-06

---

## 概覽

本系統由三個 Notion Database 組成，透過 Relation 互相關聯：

```
股票交易紀錄 Database
    └── 每筆買賣交易的明細
    └── 計算當沖股數、FIFO剩餘股數

股票代號 Database
    └── 每檔股票的匯總資料
    └── 計算成本、損益、報酬率等

資產 Database
    └── 所有股票的匯總資料
    └── 計算剩餘現金、總損益等
```

---

## 股票交易紀錄 Database

### 欄位清單

| 欄位 | 類型 | 說明 | 依賴欄位 |
| --- | --- | --- | --- |
| 紀錄 | Title (Auto) | 自動命名，格式：日期 ▲/▼ 股數 | 成交日期、交易、股數 |
| 股票代號 | Relation | 關聯至股票代號 Database | — |
| 交易 | Select | 現買(普)、現沖買(普)、現賣(普)、現沖賣(普) 等 | — |
| 股數 | Number | 手動填寫本筆交易股數 | — |
| 成交價 | Number | 手動填寫本筆成交價格 | — |
| 價金 | Formula | `成交價 * 股數` | 成交價、股數 |
| 手續費 | Formula | `floor(價金 * (0.1425 / 100))` | 價金 |
| 當沖股數 | Formula | 本筆中屬於當沖的股數 | 交易紀錄、股票代號、成交日期、交易、股數、ID |
| 交易稅 | Formula | 賣出交易稅 | 股票代號、交易、股數、成交價、當沖股數 |
| 收付金額 | Formula | 實際收付金額（含手續費與交易稅） | 交易、價金、手續費、交易稅 |
| FIFO剩餘股數 | Formula | 此批次買入目前尚未賣出的股數 | 交易紀錄、股票代號、交易、ID、股數、當沖股數 |
| 成交日期 | Date (Auto) | 交易成交日期 | — |
| 類別 | Formula | 依股票代號判斷 ETF/個股、現股/零股 | 股票代號、股數 |
| 交易紀錄 | Rollup | • Relation: `股票代號` • Target property: `股票交易紀錄` • Calculate: `Show original` | 股票代號 |
| ID | ID | 資料庫自動流水號，用於排序判斷先後順序 | — |

---

## 資料庫 Automations

```jsx
When `any` triggers occur
    └── `股票` is edited
    └── `成交日期` is edited
    └── `交易` is set to `現買(普)`, `現沖買(普)`, `現賣(普)`, or `現沖賣(普)`
Do
    └── Set `紀錄` to `My value`

`My value`:
if (context("Trigger page").prop("成交日期"), formatDate(context("Trigger page").prop("成交日期"), "YYYYMMDD"), "") +
if (context("Trigger page").prop("交易"), if (contains(context("Trigger page").prop("交易"), "買"), " ▲ ", " ▼ "), "") +
if (context("Trigger page").prop("股數"), format(context("Trigger page").prop("股數")), "")
```

```jsx
When
    └── Page added
Do
    └── Set `成交日期` to `Date triggered`
```

---

## 公式定義

### 價金

```jsx
prop("成交價") * prop("股數")
```

---

### 手續費

```jsx
floor(prop("價金") * (0.1425 / 100))
```

---

### 當沖股數

同一檔股票、同一天的買賣中，買賣對沖的部分。

```jsx
let(
  same,
  prop("交易紀錄").filter(
    current.prop("股票代號") == prop("股票代號")
    and current.prop("成交日期") == prop("成交日期")
  ),
  buy_qty,
  same.filter(contains(current.prop("交易"), "買") and mod(current.prop("股數"), 1000) == 0).map(current.prop("股數")).sum(),
  sell_qty,
  same.filter(contains(current.prop("交易"), "賣") and mod(current.prop("股數"), 1000) == 0).map(current.prop("股數")).sum(),
  daytrade_qty,
  min(buy_qty, sell_qty),
  prior_buy_qty,
  same.filter(
    contains(current.prop("交易"), "買")
    and mod(current.prop("股數"), 1000) == 0
    and current.prop("ID") < prop("ID")
  ).map(current.prop("股數")).sum(),
  prior_sell_qty,
  same.filter(
    contains(current.prop("交易"), "賣")
    and mod(current.prop("股數"), 1000) == 0
    and current.prop("ID") < prop("ID")
  ).map(current.prop("股數")).sum(),
  remaining_buy,
  max(daytrade_qty - prior_buy_qty, 0),
  remaining_sell,
  max(daytrade_qty - prior_sell_qty, 0),
  if(
    mod(prop("股數"), 1000) != 0,
    0,
    if(
      contains(prop("交易"), "買"),
      min(prop("股數"), remaining_buy),
      if(
        contains(prop("交易"), "賣"),
        min(prop("股數"), remaining_sell),
        0
      )
    )
  )
)
```

**邏輯說明：**

- 只處理整張（股數為 1000 的倍數），零股不計入當沖
- 當日買賣各取 min，決定當沖總量
- 依 ID 順序分配當沖股數給每一筆交易

---

### 交易稅

```jsx
let(
  code,
  format(prop("股票代號")).trim(),
  is_sell,
  contains(prop("交易"), "賣"),
  is_bond,
  code.substring(length(code) - 1) == "B",
  is_etf,
  code.substring(0, 2) == "00",
  daytrade_qty,
  prop("當沖股數"),
  normal_qty,
  prop("股數") - daytrade_qty,
  if(
    not(is_sell) or is_bond,
    0,
    if(
      is_etf,
      floor(prop("股數") * prop("成交價") * 0.1 / 100),
      floor(daytrade_qty * prop("成交價") * 0.15 / 100) +
      floor(normal_qty * prop("成交價") * 0.3 / 100)
    )
  )
)
```

---

### 收付金額

```jsx
if(
  contains(prop("交易"), "賣"),
  (prop("價金") - prop("手續費") - prop("交易稅")),
  -(prop("價金") + prop("手續費"))
)
```

- 買入：負數（付出）
- 賣出：正數（收入）

---

### FIFO剩餘股數

依買入先後順序（FIFO），計算此批次買入目前尚未被賣出消耗的股數。

```jsx
let(
  same, prop("交易紀錄").filter(current.prop("股票代號") == prop("股票代號")),

  /* 這筆買入之前，所有非當沖買入的累計股數 */
  prior_buy_cum,
  same.filter(
    contains(current.prop("交易"), "買") and
    current.prop("ID") < prop("ID")
  ).map(current.prop("股數") - current.prop("當沖股數")).sum(),

  /* 所有非當沖賣出的累計股數 */
  total_sell,
  same.filter(
    contains(current.prop("交易"), "賣")
  ).map(current.prop("股數") - current.prop("當沖股數")).sum(),

  /* 這筆的非當沖股數 */
  inventory_qty, prop("股數") - prop("當沖股數"),

  if(
    not contains(prop("交易"), "買") or inventory_qty == 0,
    empty(),
    max(0, min(inventory_qty, prior_buy_cum + inventory_qty - total_sell))
  )
)
```

**邏輯說明：**

- 賣出列回傳 `empty()`
- 完全當沖的買入回傳 `empty()`
- 依 FIFO 順序計算每批次的剩餘庫存股數

---

### 類別

```jsx
if(
  format(prop("股票代號")).trim().substring(0, 2) == "00",
  style("ETF", "green_background"),
  style("個股", "blue_background")
) + " - " +
if(
  mod(prop("股數"), 1000) == 0,
  style("現股", "gray_background"),
  style("零股", "gray_background")
)
```

---

## 股票代號 Database

### 欄位清單

| 欄位 | 類型 | 說明 | 依賴欄位 |
| --- | --- | --- | --- |
| 名稱 | Title | 股票代號 | — |
| 類別 | Select | 股票分類 | — |
| 剩餘投資成本 | Formula | FIFO 含手續費的持倉成本 | 股票交易紀錄．FIFO剩餘股數、收付金額、股數 |
| 剩餘成交均價 | Formula | 持倉的 FIFO 加權平均成本價 | 剩餘投資成本、剩餘股數 |
| 市價 | Number | 手動填入現價 | — |
| 剩餘股數 | Formula | 目前持倉股數 | 股票交易紀錄．FIFO剩餘股數 |
| 市值 | Formula | `市價 * 剩餘股數` | 市價、剩餘股數 |
| 高點 | Number (Auto) | 由 Automation 維護，記錄持倉期間最高價 | — |
| 高點回撤率 | Formula | 市價相對高點的漲跌幅 | 市價、高點 |
| 未實現損益 | Formula | `預估收入 - 剩餘投資成本` | 預估收入、剩餘投資成本 |
| 未實現報酬率 | Formula | 未實現損益 / 剩餘投資成本 | 未實現損益、剩餘投資成本 |
| 損益平衡價 | Formula | 回收剩餘投資成本所需的賣出價 | 剩餘投資成本、剩餘股數、股票代號 |
| 預估賣出費用 | Formula | 假設現在賣出的手續費與交易稅 | 市值、股票代號 |
| 預估收入 | Formula | 假設現在賣出的淨收入 | 市值、預估賣出費用、剩餘股數 |
| 淨收付合計 | Formula | 所有交易收付金額加總 | 股票交易紀錄．收付金額 |
| 預估損益 | Formula | `預估收入 + 淨收付合計` | 預估收入、淨收付合計 |
| 預估總報酬率 | Formula | 預估損益 / 買入總成本 | 預估損益、淨收付合計、股票交易紀錄．收付金額 |
| 總損益平衡價 | Formula | 回收含過往損益所需的賣出價 | 淨收付合計、剩餘股數、股票代號 |
| 股票交易紀錄 | Relation | 關聯至股票交易紀錄 Database | — |
| 更新高點 | Checkbox (Auto) | 當市價或剩餘成交均價超過現有高點時自動勾選，作為新高提醒。使用者手動取消勾選後觸發高點更新。 | 剩餘成交均價、市價、高點 |
| 已結清 | Formula | `if(剩餘股數 > 0, false, true)` | 剩餘股數 |

---

## 資料庫 Automations

兩段式高點更新流程：

1. 市價編輯時偵測新高 → 自動勾選 `更新高點`（提醒使用者）
2. 使用者確認後取消勾選 → 觸發高點數值更新

```jsx
When `any` triggers occur
    └── `市價` is edited
Do
    └── Set `更新高點` to `My value`

`My value`:
if(
  or(
    context("Trigger page").prop("剩餘成交均價") > context("Trigger page").prop("高點"),
    context("Trigger page").prop("市價") > context("Trigger page").prop("高點")
  ),
  true,
  context("Trigger page").prop("更新高點")
)
```

```jsx
When `any` triggers occur
    └── `更新高點` set to `unchecked`
Do
    └── Set `高點` to `My value`

`My value`:
ifs(
  context("Trigger page").prop("剩餘股數") == 0, 0,
  max(
    if(empty(context("Trigger page").prop("剩餘成交均價")), 0, context("Trigger page").prop("剩餘成交均價")),
    if(empty(context("Trigger page").prop("市價")), 0, context("Trigger page").prop("市價")),
    if(empty(context("Trigger page").prop("高點")), 0, context("Trigger page").prop("高點"))
  )
)
```

```jsx
When
    └── Page added
Do
    └── Edit `all pages` in `資產`
        └── `股票代號` `Add` `Trigger page`
```

---

## 公式定義

### 剩餘投資成本

```jsx
let(
  buys,
  prop("股票交易紀錄").filter(
    contains(current.prop("交易"), "買")
  ),
  buys.map(
    current.prop("FIFO剩餘股數") *
    (current.prop("收付金額") * -1 / current.prop("股數"))
  ).sum()
)
```

---

### 剩餘成交均價

```jsx
if(
  prop("剩餘股數") > 0,
  round(prop("剩餘投資成本") / prop("剩餘股數") * 100) / 100,
  empty()
)
```

> 四捨五入至小數第二位，因為此欄位會被手動複製使用。

---

### 剩餘股數

```jsx
let(
  buys, prop("股票交易紀錄").filter(
    contains(current.prop("交易"), "買")
  ),
  buys.map(current.prop("FIFO剩餘股數")).sum()
)

/*
let(
  records, prop("股票交易紀錄"),
  buy_qty, records.filter(contains(current.prop("交易"), "買")).map(current.prop("股數")).sum(),
  sell_qty, records.filter(contains(current.prop("交易"), "賣")).map(current.prop("股數")).sum(),
  buy_qty - sell_qty
)
*/
```

---

### 市值

```jsx
prop("市價") * prop("剩餘股數")
```

---

### 高點回撤率

```jsx
if(
  not empty(prop("高點")) and prop("高點") > 0,
  (prop("市價") - prop("高點")) / prop("高點"),
  empty()
)
```

> Number format 設為 Percent。正數代表超越高點，負數代表回撤。

---

### 未實現損益

```jsx
prop("預估收入") - prop("剩餘投資成本")
```

---

### 未實現報酬率

```jsx
if(
  prop("剩餘投資成本") > 0,
  prop("未實現損益") / prop("剩餘投資成本"),
  empty()
)
```

> Number format 設為 Percent。

---

### 損益平衡價（純持倉）

回收剩餘投資成本所需的最低賣出價，含預估賣出費用。

```jsx
let(
  code, format(prop("股票代號")).trim(),
  tax_rate, if(
    code.substring(length(code) - 1) == "B", 0,
    if(code.substring(0, 2) == "00", 0.001, 0.003)
  ),
  if(
    prop("剩餘股數") > 0,
    let(
      price, prop("剩餘投資成本") / (prop("剩餘股數") * (1 - 0.001425 - tax_rate)),
      amount, price * prop("剩餘股數"),
      fee, floor(amount * 0.001425),
      tax, floor(amount * tax_rate),
      round((prop("剩餘投資成本") + fee + tax) / prop("剩餘股數") * 100) / 100
    ),
    empty()
  )
)
```

---

### 預估賣出費用

```jsx
let(
  code,
  format(prop("股票代號")).trim(),
  price,
  prop("市值"),
  tax_rate,
  if(code.substring(length(code) - 1) == "B", 0,
  if(code.substring(0, 2) == "00", 0.001,
  0.003)),
  floor(price * 0.001425) + floor(price * tax_rate)
)
```

**交易稅率規則：**

| 條件 | 稅率 |
| --- | --- |
| 代號末碼為 B（債券ETF） | 0% |
| 代號前兩碼為 00（ETF） | 0.1% |
| 其他（一般股票） | 0.3% |

---

### 預估收入

```jsx
if(
  prop("剩餘股數") > 0,
  prop("市值") - prop("預估賣出費用"),
  empty()
)
```

---

### 淨收付合計

```jsx
let(
  records, prop("股票交易紀錄"),
  records.map(current.prop("收付金額")).sum()
)
```

---

### 預估損益

```jsx
prop("預估收入") + prop("淨收付合計")
```

> 含已實現與未實現的總損益。假設現在全部賣出的總損益。

---

### 預估總報酬率

```jsx
if(
  prop("淨收付合計") != 0,
  let(
    buy_cost, prop("股票交易紀錄").filter(
      contains(current.prop("交易"), "買")
    ).map(current.prop("收付金額")).sum() * -1,
    if(buy_cost > 0, prop("預估損益") / buy_cost, empty())
  ),
  empty()
)
```

> Number format 設為 Percent。

---

### 總損益平衡價（含過往損益）

回收含過往已實現損益所需的最低賣出價。

```jsx
let(
  code, format(prop("股票代號")).trim(),
  tax_rate, if(
    code.substring(length(code) - 1) == "B", 0,
    if(code.substring(0, 2) == "00", 0.001, 0.003)
  ),
  if(
    prop("剩餘股數") > 0,
    let(
      target, prop("淨收付合計") * -1,
      amount, target / (1 - 0.001425 - tax_rate),
      fee, floor(amount * 0.001425),
      tax, floor(amount * tax_rate),
      round((target + fee + tax) / prop("剩餘股數") * 100) / 100
    ),
    empty()
  )
)
```

---

## 資產 Database

### 欄位清單

| 欄位 | 類型 | 說明 | 依賴欄位 |
| --- | --- | --- | --- |
| 名稱 | Title | 結算 | — |
| 總投入金額 | Number | 手動填寫投入股票總金額 | — |
| 總淨收付合計 | Rollup | • Relation: `股票代號` • Property: `淨收付合計` • Calculate: `Sum` | 股票代號．淨收付合計 |
| 總預估損益 | Rollup | • Relation: `股票代號` • Property: `預估損益` • Calculate: `Sum` | 股票代號．預估損益 |
| 剩餘現金 | Formula | 投入金額 + 淨收付合計 | 總投入金額、總淨收付合計 |
| 股票代號 | Relation | 關聯至股票代號 Database | — |

---

## 資料庫 Automations

```jsx
NA
```

---

## 公式定義

### 剩餘現金

```jsx
prop("總投入金額") + prop("總淨收付合計")
```

---

## 資料流

```
股票交易紀錄
  ├── 當沖股數
  ├── FIFO剩餘股數（依賴當沖股數）
  └── 收付金額
          ↓
股票代號 Database
  ├── 淨收付合計
  ├── 剩餘股數（from FIFO剩餘股數）
  ├── 剩餘投資成本（from FIFO剩餘股數 × 收付金額）
  ├── 剩餘成交均價（from 剩餘投資成本 ÷ 剩餘股數）
  ├── 市值（市價 × 剩餘股數）
  ├── 預估賣出費用（from 市值）
  ├── 預估收入（from 市值 - 預估賣出費用）
  ├── 未實現損益（from 預估收入 - 剩餘投資成本）
  ├── 未實現報酬率（from 未實現損益 ÷ 剩餘投資成本）
  ├── 預估損益（from 預估收入 + 淨收付合計）
  ├── 預估總報酬率（from 預估損益 ÷ 買入總成本）
  ├── 損益平衡價（from 剩餘投資成本）
  ├── 總損益平衡價（from 淨收付合計）
  └── 高點回撤率（from 市價 vs 高點）
            ↓
資產 Database
```

---

## 注意事項

1. **ID 欄位**：系統自動遞增，FIFO 和當沖計算依賴 ID 排序
2. **交易紀錄欄位**：股票交易紀錄 Database 中的 Rollup 欄位（非資料庫名稱），當沖股數和 FIFO剩餘股數公式需要此欄位取得同股票所有交易，無法移除
3. **手續費計算**：使用 `floor`（無條件捨去），與券商實際計算方式一致
4. **當沖排除**：FIFO 計算使用 `股數 - 當沖股數`，自動排除當沖部分
5. **零股**：當沖股數公式只處理整張（1000 股倍數），零股當沖股數為 0
6. **稅率判斷**：`預估賣出費用`、`損益平衡價`、`總損益平衡價` 三個公式各自內建稅率判斷邏輯，如需調整費率須同步修改三處