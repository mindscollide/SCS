/**
 * src/services/financial.service.js
 * ====================================
 * All Financial Data (Data Entry) related API calls.
 * Each function returns the standard shape from api.js:
 *   { success, data, status }  OR  { success: false, message, status, errors }
 *
 * Usage:
 *   import { fetchRecords, createRecord } from '../services/financial.service'
 */

import { get, post, put } from '../utils/api'

/**
 * Fetch all financial data records for the logged-in data entry user
 * GET /data-entry/financial-data
 */
export const fetchRecords = () => get('data-entry/financial-data')

/**
 * Fetch a single financial data record by ID
 * GET /data-entry/financial-data/:id
 * @param {number|string} id
 */
export const fetchRecordById = (id) => get(`data-entry/financial-data/${id}`)

/**
 * Create a new financial data record
 * POST /data-entry/financial-data
 * @param {object} body
 */
export const createRecord = (body) => post('data-entry/financial-data', body)

/**
 * Update an existing financial data record
 * PUT /data-entry/financial-data/:id
 * @param {number|string} id
 * @param {object} body
 */
export const updateRecord = (id, body) => put(`data-entry/financial-data/${id}`, body)

/**
 * Send a record for manager approval
 * POST /data-entry/send-approval/:id
 * @param {number|string} id
 * @param {string} notes
 */
export const sendForApprovalApi = (id, notes) =>
  post(`data-entry/send-approval/${id}`, { notes })

/**
 * Update a single cell value inside a financial data record
 * PUT /data-entry/financial-data/:id/cell
 * @param {number|string} recordId
 * @param {{ ratioId, classId, colIdx, value }} body
 */
export const updateCellApi = (recordId, body) =>
  put(`data-entry/financial-data/${recordId}/cell`, body)

/**
 * Fetch records pending for approval (manager view)
 * GET /data-entry/pending-approval
 */
export const fetchPendingApprovals = () => get('data-entry/pending-approval')
