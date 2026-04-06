# components/common

Reusable, role-agnostic UI components.

> **Rule:** Always import from this folder. Never use native `<input>` or `<select>` elements directly in pages or features.

## Components

| Folder / File | Export | Description |
|---|---|---|
| `Input/Input.jsx` | `Input` | Controlled text input with label, error, character count, multiline |
| `select/Select.jsx` | `Select` | Styled single-value dropdown |
| `select/MultiSelect.jsx` | `MultiSelect` (legacy) | Multi-value select (prefer `multiSelect/MultiSelect.jsx`) |
| `multiSelect/MultiSelect.jsx` | `MultiSelect` | Full-featured multi-select with chips |
| `Checkbox/Checkbox.jsx` | `Checkbox` | Styled checkbox with label |
| `Toggle/Toggle.jsx` | `Toggle` | Boolean toggle switch |
| `datePicker/DatePicker.jsx` | `DatePicker` | Date picker input |
| `phoneInput/PhoneInput.jsx` | `PhoneInput` | Phone number input with country code |
| `searchFilter/SearchFilter.jsx` | `SearchFilter` | Main search bar + collapsible filter panel |
| `scrollTabs/ScrollTabs.jsx` | `ScrollTabs` | Horizontally scrollable tab bar |
| `table/NormalTable.jsx` | `CommonTable` | Generic sortable table with optional drag-to-reorder |
| `table/FinancialDataTable.jsx` | `FinancialDataTable` | Financial ratio entry table with quarter columns |
| `card/FormulaBuilderListingCard.jsx` | `FormulaCard` | Card for formula/criteria list views |
| `modals/Modals.jsx` | `ConfirmModal`, `SendForApprovalModal` | Shared modal dialogs |
| `financialData/FinancialDataForm.jsx` | `FinancialDataForm` | Add / Edit / View financial data form wrapper |
| `financialData/ApprovalHistoryModal.jsx` | `ApprovalHistoryModal` | Approval action log modal |
| `financialData/SendApprovalModal.jsx` | `SendApprovalModal` | Send-for-approval modal (standalone) |
| `formulaBuilder/FormulaBuilderView.jsx` | `FormulaBuilderView` | Formula drag-and-drop builder |
| `formulaBuilder/FormulaListView.jsx` | `FormulaListView` | Formula list display |
| `config/SimpleConfigListPage.jsx` | `SimpleConfigListPage` | Generic CRUD list page for setup entities |
| `report/RatiosPanel.jsx` | `RatiosPanel` | Ratio breakdown panel used in reports |
| `index.jsx` | `StatusBadge`, `SortIconTable` | Micro-components re-exported for convenience |
