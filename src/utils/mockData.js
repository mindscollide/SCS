// Shared mock data for all pages

export const MOCK_MARKETS = [
  { id: 1, country: 'Pakistan', fullName: 'Pakistan Stock Exchange', shortName: 'PSX', status: 'Active' },
  { id: 2, country: 'Saudi Arabia', fullName: 'Saudi Exchange', shortName: 'TADAWUL', status: 'Active' },
  { id: 3, country: 'UAE', fullName: 'Abu Dhabi Securities Exchange', shortName: 'ADX', status: 'Active' },
  { id: 4, country: 'Malaysia', fullName: 'Bursa Malaysia', shortName: 'BURSA', status: 'Inactive' },
]

export const MOCK_SECTORS = [
  { id: 1, name: 'Banking', status: 'Active' },
  { id: 2, name: 'Cement', status: 'Active' },
  { id: 3, name: 'Textile', status: 'Active' },
  { id: 4, name: 'Oil & Gas', status: 'Active' },
  { id: 5, name: 'Fertilizer', status: 'Inactive' },
]

export const MOCK_QUARTERS = [
  { id: 1, name: 'December 2025', startDate: '2025-10-01', endDate: '2025-12-31', status: 'Active', desc: 'Q2 FY2025-26' },
  { id: 2, name: 'September 2025', startDate: '2025-07-01', endDate: '2025-09-30', status: 'Active', desc: 'Q1 FY2025-26' },
  { id: 3, name: 'June 2025', startDate: '2025-04-01', endDate: '2025-06-30', status: 'Inactive', desc: 'Q4 FY2024-25' },
  { id: 4, name: 'March 2025', startDate: '2025-01-01', endDate: '2025-03-31', status: 'Inactive', desc: 'Q3 FY2024-25' },
]

export const MOCK_COMPANIES = [
  { id: 1, ticker: 'ACBL', name: 'Askari Commercial Bank Ltd', sector: 'Banking', market: 'PSX', annualRep: 'December', freq: 'Quarterly', status: 'Active', exception: false },
  { id: 2, ticker: 'MCB', name: 'MCB Bank Limited', sector: 'Banking', market: 'PSX', annualRep: 'December', freq: 'Quarterly', status: 'Active', exception: false },
  { id: 3, ticker: 'DGKC', name: 'D.G. Khan Cement Company', sector: 'Cement', market: 'PSX', annualRep: 'June', freq: 'Quarterly', status: 'Active', exception: true },
  { id: 4, ticker: 'LUCK', name: 'Lucky Cement Limited', sector: 'Cement', market: 'PSX', annualRep: 'June', freq: 'Quarterly', status: 'Active', exception: false },
  { id: 5, ticker: 'ENGRO', name: 'Engro Corporation Limited', sector: 'Fertilizer', market: 'PSX', annualRep: 'December', freq: 'Quarterly', status: 'Active', exception: false },
]

export const MOCK_USERS = [
  { id: 1, fullName: 'Muhammad Aamir', org: 'Minds Collide (Pvt.) Ltd', email: 'aamir@hilal.com', role: 'Admin', status: 'Active' },
  { id: 2, fullName: 'Sara Ahmed', org: 'Hilal Investments', email: 'sara@hilal.com', role: 'Manager', status: 'Active' },
  { id: 3, fullName: 'Bilal Khan', org: 'Hilal Investments', email: 'bilal@hilal.com', role: 'Data Entry', status: 'Active' },
  { id: 4, fullName: 'Fatima Malik', org: 'Hilal Investments', email: 'fatima@hilal.com', role: 'Data Entry', status: 'Inactive' },
  { id: 5, fullName: 'Usman Qureshi', org: 'Hilal Investments', email: 'usman@hilal.com', role: 'Manager', status: 'Active' },
]

export const MOCK_PENDING_REQUESTS = [
  { id: 1, name: 'Ali Raza', org: 'Al-Baraka Bank', email: 'ali@albaraka.com', mobile: '03001234567', role: 'Data Entry', sentOn: '2026-03-10' },
  { id: 2, name: 'Hina Shah', org: 'Meezan Bank', email: 'hina@meezan.com', mobile: '03121234567', role: 'Manager', sentOn: '2026-03-11' },
]

export const MOCK_PENDING_APPROVALS = [
  { id: 1, quarter: 'December 2025', ticker: 'ACBL', company: 'Askari Commercial Bank Ltd', sector: 'Banking', sentBy: 'Bilal Khan', sentOn: '2026-03-10 09:30' },
  { id: 2, quarter: 'December 2025', ticker: 'MCB', company: 'MCB Bank Limited', sector: 'Banking', sentBy: 'Bilal Khan', sentOn: '2026-03-10 11:00' },
  { id: 3, quarter: 'September 2025', ticker: 'DGKC', company: 'D.G. Khan Cement Company', sector: 'Cement', sentBy: 'Fatima Malik', sentOn: '2026-03-09 14:15' },
]

export const MOCK_FINANCIAL_DATA = [
  { id: 1, quarter: 'December 2025', ticker: 'ACBL', company: 'Askari Commercial Bank Ltd', sector: 'Banking', status: 'In Progress' },
  { id: 2, quarter: 'December 2025', ticker: 'MCB', company: 'MCB Bank Limited', sector: 'Banking', status: 'Pending For Approval' },
  { id: 3, quarter: 'September 2025', ticker: 'DGKC', company: 'D.G. Khan Cement Company', sector: 'Cement', status: 'Approved' },
  { id: 4, quarter: 'September 2025', ticker: 'LUCK', company: 'Lucky Cement Limited', sector: 'Cement', status: 'Declined' },
]

export const MOCK_CLASSIFICATIONS = [
  { id: 1, name: 'Total Assets', desc: 'Sum of all assets', calculated: false, prorated: false, base: '', status: 'Active' },
  { id: 2, name: 'Long-Term Finance', desc: 'Long term borrowings', calculated: false, prorated: false, base: '', status: 'Active' },
  { id: 3, name: 'Islamic Finance (LT)', desc: 'Islamic portion of LT finance', calculated: false, prorated: true, base: 'Long-Term Finance', status: 'Active' },
  { id: 4, name: 'Total Long-Term Finance', desc: 'Calculated total', calculated: true, prorated: false, base: '', status: 'Active' },
  { id: 5, name: 'Revenue', desc: 'Total revenue', calculated: false, prorated: false, base: '', status: 'Active' },
]

export const MOCK_RATIOS = [
  { id: 1, name: 'Interest Bearing Debts to Total Assets', numerator: 'Long-Term Finance', denominator: 'Total Assets', desc: 'Measures debt burden', status: 'Active' },
  { id: 2, name: 'Illiquid Assets to Total Assets', numerator: 'Total Long-Term Finance', denominator: 'Total Assets', desc: 'Measures illiquidity', status: 'Active' },
]

export const MOCK_CRITERIA = [
  { id: 1, name: 'Al-Hilal Standard Criteria', desc: 'Standard Sharia compliance criteria used by Hilal Investments', isDefault: true, status: 'Active', ratios: 3 },
  { id: 2, name: 'AAOIFI Criteria', desc: 'Based on AAOIFI standards for Islamic finance', isDefault: false, status: 'Active', ratios: 5 },
]

export const STATUS_BADGE = {
  'Active': 'badge-success',
  'Inactive': 'badge-muted',
  'In Progress': 'badge-info',
  'Pending For Approval': 'badge-warning',
  'Approved': 'badge-success',
  'Declined': 'badge-danger',
  'Compliant': 'badge-success',
  'Non-Compliant': 'badge-danger',
}
