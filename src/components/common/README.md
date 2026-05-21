# components/common

Reusable, role-agnostic UI components.

> **Rule:** Always import from this folder. Never use native `<input>` or `<select>` elements directly in pages or features.

## Components

| Folder / File | Export | Description |
|---|---|---|
| `Input/Input.jsx` | `Input` | Controlled text input with label, error, character count, multiline |
| `select/Select.jsx` | `Select` | Legacy native dropdown — do not use for new code |
| `select/SearchableSelect.jsx` | `SearchableSelect` | **Standard dropdown** — combobox with search, string[] or {label,value}[] options |
| `select/LazySearchableSelect.jsx` | `LazySearchableSelect` | Server-driven searchable dropdown — delegates filtering + pagination to `fetchFn`; supports `excludeValues`, `selectedLabel`, infinite scroll via IntersectionObserver |
| `select/MultiSelect.jsx` | `MultiSelect` (string[]) | Multi-value select for string arrays |
| `multiSelect/MultiSelect.jsx` | `MultiSelect` ({label,value}[]) | Full-featured multi-select with chips |
| `Checkbox/Checkbox.jsx` | `Checkbox` | Styled checkbox with label |
| `Toggle/Toggle.jsx` | `Toggle` | Boolean toggle switch |
| `datePicker/DatePicker.jsx` | `DatePicker` | Date picker input |
| `phoneInput/PhoneInput.jsx` | `PhoneInput` | Phone number input with country code |
| `searchFilter/SearchFilter.jsx` | `SearchFilter` | Main search bar + collapsible filter panel + applied chips |
| `scrollTabs/ScrollTabs.jsx` | `ScrollTabs` | Horizontally scrollable tab bar |
| `table/NormalTable.jsx` | `CommonTable` | **The only table component** — sortable, draggable, scrollable with infinite scroll slot |
| `table/FinancialDataTable.jsx` | `FinancialDataTable` | Financial ratio entry table with quarter columns |
| `card/FormulaBuilderListingCard.jsx` | `FormulaCard` | Card for formula/criteria list views |
| `Modals/Modals.jsx` | `AdminViewGroupsModal`, `AdminViewDetailEditModal`, `RequestActionModal`, `SendForApprovalModal`, `FormulaModal`, `ConfirmModal` | Shared modal dialogs |
| `financialData/FinancialDataForm.jsx` | `FinancialDataForm` | Add / Edit / View financial data form wrapper |
| `financialData/ApprovalHistoryModal.jsx` | `ApprovalHistoryModal` | Approval action log modal |
| `financialData/SendApprovalModal.jsx` | `SendApprovalModal` | Send-for-approval modal (standalone) |
| `formulaBuilder/FormulaBuilderView.jsx` | `FormulaBuilderView` | Formula drag-and-drop builder |
| `formulaBuilder/FormulaListView.jsx` | `FormulaListView` | Formula list display |
| `config/SimpleConfigListPage.jsx` | `SimpleConfigListPage` | Generic CRUD list page for setup entities |
| `report/RatiosPanel.jsx` | `RatiosPanel` | Ratio breakdown panel used in reports |
| `index.jsx` | `StatusBadge`, `SortIconTable`, `BtnPrimary`, `BtnGold`, `BtnTeal`, etc. | Barrel — import all shared UI from here |

## Select components — when to use which

| Component | When to use |
|---|---|
| `SearchableSelect` | Static list known at render time — string[] or {label,value}[] passed as props |
| `LazySearchableSelect` | Server-driven list — pass `fetchFn(search, page, pageSize) → {items, totalCount}`. Use when: list is large / paginated, or must exclude already-selected items via `excludeValues`. |
| `Select` | Legacy only — do not use in new code |

### LazySearchableSelect props quick reference
```jsx
<LazySearchableSelect
  fetchFn={async (search, page, pageSize) => ({ items: [{label, value, ...extra}], totalCount })}
  value={selectedId}           // controlled value (the item's `value` field)
  onChange={(value, fullOption) => {}}  // fullOption includes all extra fields from fetchFn
  selectedLabel="Display Name" // label to show when dropdown is closed (needed if value may not be in current page)
  excludeValues={[1, 2, 3]}    // hide these values from the list (e.g. already-added items)
  pageSize={10}                 // passed to fetchFn — use 1000 to load all at once
  placeholder="Select..."
  label="Field Label"
  required
  error={false}
  errorMessage=""
  disabled={false}
/>
```
**Cache pattern** — to avoid re-fetching on every dropdown open, store results in a `useRef` inside `fetchFn`:
```js
const cacheRef = useRef(null)
const myFetchFn = useCallback(async (search, page, pageSize) => {
  if (!cacheRef.current) {
    const res = await myApi({ PageSize: 1000, PageNumber: 0 }, { skipLoader: true })
    cacheRef.current = res.items.map(mapToLabelValue)
  }
  const filtered = search
    ? cacheRef.current.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : cacheRef.current
  return { items: filtered, totalCount: filtered.length }
}, [])
