import { Router } from 'express'
import * as OPD from '../controllers/opd.controller'
import * as IPD from '../controllers/ipd.controller'
import * as Prescriptions from '../controllers/prescriptions.controller'
import * as Staff from '../controllers/staff.controller'
import * as Expense from '../controllers/expense.controller'
import * as Tokens from '../controllers/tokens.controller'
import * as BedMgmt from '../controllers/bed_mgmt.controller'
import * as Shifts from '../controllers/shifts.controller'
import * as Attendance from '../controllers/attendance.controller'
import * as Audit from '../controllers/audit.controller'
import * as Settings from '../controllers/settings.controller'
import * as FinanceCtl from '../controllers/finance.controller'
import * as Referrals from '../controllers/referrals.controller'
import * as FinanceAccounts from '../controllers/finance_accounts.controller'
import * as Patients from '../controllers/patients.controller'
import * as IPDRec from '../controllers/ipd_records.controller'
import * as Notifications from '../controllers/notifications.controller'
import * as Master from '../controllers/master.controller'
import * as Users from '../controllers/users.controller'
import * as CashSession from '../controllers/cash_session.controller'
import * as IpdReferrals from '../controllers/ipd_referrals.controller'
import * as IpdDocs from '../controllers/ipd_docs.controller'
import * as DocSchedules from '../controllers/doctor_schedule.controller'
import * as Appointments from '../controllers/appointments.controller'
import * as Equipment from '../controllers/equipment.controller'
import * as Store from '../controllers/store.controller'
import * as SidebarPerms from '../controllers/sidebarPermission.controller'
import { auth } from '../../../common/middleware/auth'

const r = Router()

// Masters
r.get('/departments', Master.listDepartments)
r.post('/departments', Master.createDepartment)
r.put('/departments/:id', Master.updateDepartment)
r.delete('/departments/:id', Master.removeDepartment)

r.get('/doctors', Master.listDoctors)
r.post('/doctors', Master.createDoctor)
r.put('/doctors/:id', Master.updateDoctor)
r.delete('/doctors/:id', Master.removeDoctor)

// Doctor Schedules
r.get('/doctor-schedules', DocSchedules.list)
r.post('/doctor-schedules/weekly-pattern', DocSchedules.applyWeeklyPattern)
r.put('/doctor-schedules/:id', DocSchedules.update)
r.delete('/doctor-schedules/:id', DocSchedules.remove)

// Appointments (separate from tokens)
r.get('/appointments', Appointments.list)
r.post('/appointments', Appointments.create)
r.put('/appointments/:id', Appointments.update)
r.patch('/appointments/:id/status', Appointments.updateStatus)
r.post('/appointments/:id/convert-to-token', Appointments.convertToToken)
r.delete('/appointments/:id', Appointments.remove)

// OPD
r.post('/opd/encounters', OPD.createEncounter)
r.get('/opd/quote-price', OPD.quotePrice)

// Prescriptions (OPD)
r.post('/opd/prescriptions', Prescriptions.create)
r.get('/opd/prescriptions', Prescriptions.list)
r.get('/opd/prescriptions/:id', Prescriptions.getById)
r.put('/opd/prescriptions/:id', Prescriptions.update)
r.delete('/opd/prescriptions/:id', Prescriptions.remove)

// Referrals (OPD)
r.post('/opd/referrals', Referrals.create)
r.get('/opd/referrals', Referrals.list)
r.patch('/opd/referrals/:id/status', Referrals.updateStatus)
r.delete('/opd/referrals/:id', Referrals.remove)

// IPD
r.post('/ipd/admissions', IPD.admit)
r.patch('/ipd/admissions/:id/discharge', IPD.discharge)
r.get('/ipd/admissions', IPD.list)
r.get('/ipd/admissions/:id', IPD.getById)
r.patch('/ipd/admissions/:id/transfer-bed', IPD.transferBed)
r.post('/ipd/admissions/from-token', IPD.admitFromToken)

// IPD Referrals
r.post('/ipd/referrals', IpdReferrals.create)
r.get('/ipd/referrals', IpdReferrals.list)
r.get('/ipd/referrals/:id', IpdReferrals.getById)
r.patch('/ipd/referrals/:id', IpdReferrals.update)
r.patch('/ipd/referrals/:id/status', IpdReferrals.updateStatus)
r.post('/ipd/referrals/:id/admit', IpdReferrals.admit)

// IPD Records - Vitals
r.post('/ipd/admissions/:encounterId/vitals', IPDRec.createVital)
r.get('/ipd/admissions/:encounterId/vitals', IPDRec.listVitals)
r.put('/ipd/vitals/:id', IPDRec.updateVital)
r.delete('/ipd/vitals/:id', IPDRec.removeVital)

// IPD Records - Notes
r.post('/ipd/admissions/:encounterId/notes', IPDRec.createNote)
r.get('/ipd/admissions/:encounterId/notes', IPDRec.listNotes)
r.put('/ipd/notes/:id', IPDRec.updateNote)
r.delete('/ipd/notes/:id', IPDRec.removeNote)

// IPD Records - Clinical Notes (Unified)
r.post('/ipd/admissions/:encounterId/clinical-notes', IPDRec.createClinicalNote)
r.get('/ipd/admissions/:encounterId/clinical-notes', IPDRec.listClinicalNotes)
r.put('/ipd/clinical-notes/:id', IPDRec.updateClinicalNote)
r.delete('/ipd/clinical-notes/:id', IPDRec.removeClinicalNote)

// IPD Records - Doctor Visits
r.post('/ipd/admissions/:encounterId/doctor-visits', IPDRec.createDoctorVisit)
r.get('/ipd/admissions/:encounterId/doctor-visits', IPDRec.listDoctorVisits)
r.put('/ipd/doctor-visits/:id', IPDRec.updateDoctorVisit)
r.delete('/ipd/doctor-visits/:id', IPDRec.removeDoctorVisit)

// IPD Records - Medication Orders
r.post('/ipd/admissions/:encounterId/med-orders', IPDRec.createMedicationOrder)
r.get('/ipd/admissions/:encounterId/med-orders', IPDRec.listMedicationOrders)
r.put('/ipd/med-orders/:id', IPDRec.updateMedicationOrder)
r.delete('/ipd/med-orders/:id', IPDRec.removeMedicationOrder)

// IPD Records - Medication Administration (MAR)
r.post('/ipd/med-orders/:orderId/admins', IPDRec.createMedicationAdmin)
r.get('/ipd/med-orders/:orderId/admins', IPDRec.listMedicationAdmins)
r.put('/ipd/med-admins/:id', IPDRec.updateMedicationAdmin)
r.delete('/ipd/med-admins/:id', IPDRec.removeMedicationAdmin)

// IPD Records - Lab Links
r.post('/ipd/admissions/:encounterId/lab-links', IPDRec.createLabLink)
r.get('/ipd/admissions/:encounterId/lab-links', IPDRec.listLabLinks)
r.put('/ipd/lab-links/:id', IPDRec.updateLabLink)
r.delete('/ipd/lab-links/:id', IPDRec.removeLabLink)

// IPD Records - Billing Items
r.post('/ipd/admissions/:encounterId/billing/items', IPDRec.createBillingItem)
r.get('/ipd/admissions/:encounterId/billing/items', IPDRec.listBillingItems)
r.put('/ipd/billing/items/:id', IPDRec.updateBillingItem)
r.delete('/ipd/billing/items/:id', IPDRec.removeBillingItem)

// IPD Records - Payments
r.post('/ipd/admissions/:encounterId/billing/payments', IPDRec.createPayment)
r.get('/ipd/admissions/:encounterId/billing/payments', IPDRec.listPayments)
r.put('/ipd/billing/payments/:id', IPDRec.updatePayment)
r.delete('/ipd/billing/payments/:id', IPDRec.removePayment)

// IPD Discharge Documents
r.get('/ipd/admissions/:id/discharge-summary', IpdDocs.getDischargeSummary)
r.put('/ipd/admissions/:id/discharge-summary', IpdDocs.upsertDischargeSummary)
r.get('/ipd/admissions/:id/discharge-summary/print', IpdDocs.printDischargeSummary)
r.get('/ipd/admissions/:id/discharge-summary/print-pdf', IpdDocs.printDischargeSummaryPdf)

// IPD Short Stay
r.get('/ipd/admissions/:id/short-stay', IpdDocs.getShortStay)
r.put('/ipd/admissions/:id/short-stay', IpdDocs.upsertShortStay)

r.get('/ipd/admissions/:id/death-certificate', IpdDocs.getDeathCertificate)
r.put('/ipd/admissions/:id/death-certificate', IpdDocs.upsertDeathCertificate)
r.get('/ipd/admissions/:id/death-certificate/print', IpdDocs.printDeathCertificate)
r.get('/ipd/admissions/:id/birth-certificate', IpdDocs.getBirthCertificate)
r.put('/ipd/admissions/:id/birth-certificate', IpdDocs.upsertBirthCertificate)
r.get('/ipd/admissions/:id/birth-certificate/print', IpdDocs.printBirthCertificate)
r.get('/ipd/admissions/:id/received-death', IpdDocs.getReceivedDeath)
r.put('/ipd/admissions/:id/received-death', IpdDocs.upsertReceivedDeath)
r.get('/ipd/admissions/:id/received-death/print', IpdDocs.printReceivedDeath)

// IPD Forms: PDF Print
r.get('/ipd/admissions/:id/death-certificate/print-pdf', IpdDocs.printDeathCertificatePdf)
r.get('/ipd/admissions/:id/received-death/print-pdf', IpdDocs.printReceivedDeathPdf)
r.get('/ipd/admissions/:id/birth-certificate/print-pdf', IpdDocs.printBirthCertificatePdf)

// IPD Forms: Lists for standalone pages
r.get('/ipd/forms/received-deaths', IpdDocs.listReceivedDeaths)
r.get('/ipd/forms/death-certificates', IpdDocs.listDeathCertificates)
r.get('/ipd/forms/birth-certificates', IpdDocs.listBirthCertificates)
r.get('/ipd/forms/short-stays', IpdDocs.listShortStays)
r.get('/ipd/forms/discharge-summaries', IpdDocs.listDischargeSummaries)
// Birth Certificates Standalone (no encounter)
r.post('/ipd/forms/birth-certificates', IpdDocs.createBirthCertificateStandalone)
r.get('/ipd/forms/birth-certificates/:id', IpdDocs.getBirthCertificateById)
r.put('/ipd/forms/birth-certificates/:id', IpdDocs.updateBirthCertificateStandalone)
r.delete('/ipd/forms/birth-certificates/:id', IpdDocs.deleteBirthCertificateById)
r.get('/ipd/forms/birth-certificates/:id/print', IpdDocs.printBirthCertificateById)
r.get('/ipd/forms/birth-certificates/:id/print-pdf', IpdDocs.printBirthCertificateByIdPdf)

// IPD Forms: Deletes (by encounter)
r.delete('/ipd/admissions/:id/received-death', IpdDocs.deleteReceivedDeath)
r.delete('/ipd/admissions/:id/death-certificate', IpdDocs.deleteDeathCertificate)
r.delete('/ipd/admissions/:id/birth-certificate', IpdDocs.deleteBirthCertificate)
r.delete('/ipd/admissions/:id/short-stay', IpdDocs.deleteShortStay)
r.delete('/ipd/admissions/:id/discharge-summary', IpdDocs.deleteDischargeSummary)


// IPD Final Invoice
r.get('/ipd/admissions/:id/final-invoice', IpdDocs.getFinalInvoice)
r.get('/ipd/admissions/:id/final-invoice/print', IpdDocs.printFinalInvoice)

// Tokens (OPD)
r.post('/tokens/opd', Tokens.createOpd)
r.get('/tokens', Tokens.list)
r.patch('/tokens/:id/status', Tokens.updateStatus)
r.put('/tokens/:id', Tokens.update)

// Staff
r.get('/staff', Staff.list)
r.post('/staff', Staff.create)
r.put('/staff/:id', Staff.update)
r.delete('/staff/:id', Staff.remove)

// Users (Hospital App Users)
r.get('/users', Users.list)
r.post('/users', Users.create)
r.put('/users/:id', Users.update)
r.delete('/users/:id', Users.remove)
r.post('/users/login', Users.login)
r.post('/users/logout', Users.logout)

// Sidebar Roles & Permissions (Hospital)
r.get('/sidebar-roles', SidebarPerms.listRoles)
r.post('/sidebar-roles', SidebarPerms.createRole)
r.delete('/sidebar-roles/:role', SidebarPerms.deleteRole)

r.get('/sidebar-permissions', SidebarPerms.getPermissions)
r.put('/sidebar-permissions/:role', SidebarPerms.updatePermissions)
r.post('/sidebar-permissions/:role/reset', SidebarPerms.resetToDefaults)

// Shifts
r.get('/shifts', Shifts.list)
r.post('/shifts', Shifts.create)
r.put('/shifts/:id', Shifts.update)
r.delete('/shifts/:id', Shifts.remove)

// Attendance
r.get('/attendance', Attendance.list)
r.post('/attendance', Attendance.upsert)

// Expenses
r.get('/expenses', Expense.list)
r.post('/expenses', Expense.create)
r.delete('/expenses/:id', Expense.remove)

// Finance (Hospital-owned) Doctor finance
r.post('/finance/manual-doctor-earning', FinanceCtl.postManualDoctorEarning)
r.post('/finance/doctor-payout', FinanceCtl.postDoctorPayout)
r.get('/finance/doctor/:id/balance', FinanceCtl.getDoctorBalance)
r.get('/finance/doctor/:id/payouts', FinanceCtl.listDoctorPayouts)
r.get('/finance/doctor/:id/accruals', FinanceCtl.doctorAccruals)
r.get('/finance/earnings', FinanceCtl.listDoctorEarnings)
r.post('/finance/journal/:id/reverse', FinanceCtl.reverseJournal)

// Finance Accounts: Vendors
r.get('/finance/vendors', FinanceAccounts.listVendors)
r.post('/finance/vendors', FinanceAccounts.createVendor)
r.put('/finance/vendors/:id', FinanceAccounts.updateVendor)
r.delete('/finance/vendors/:id', FinanceAccounts.deleteVendor)

// Finance Accounts: Trial Balance, Balance Sheet, Ledger
r.get('/finance/trial-balance', FinanceAccounts.trialBalance)
r.get('/finance/balance-sheet', FinanceAccounts.balanceSheet)
r.get('/finance/ledger', FinanceAccounts.accountLedger)

// Finance Accounts: Vouchers
r.get('/finance/vouchers', FinanceAccounts.listVouchers)
r.post('/finance/vouchers', FinanceAccounts.createVoucher)

// Finance Accounts: Recurring Payments
r.get('/finance/recurring', FinanceAccounts.listRecurring)
r.post('/finance/recurring', FinanceAccounts.createRecurring)
r.put('/finance/recurring/:id', FinanceAccounts.updateRecurring)
r.delete('/finance/recurring/:id', FinanceAccounts.deleteRecurring)
r.post('/finance/recurring/:id/run', FinanceAccounts.runRecurring)

// Finance Accounts: Combined Cash/Bank across modules
r.get('/finance/combined-cash-bank', FinanceAccounts.combinedCashBank)

// Finance Accounts: Business Day Open/Close
r.get('/finance/day/status', FinanceAccounts.dayStatus)
r.post('/finance/day/open', FinanceAccounts.openDay)
r.post('/finance/day/close', FinanceAccounts.closeDay)

// Cash Sessions (Drawer) — auth required
r.get('/finance/cash-sessions/current', auth, CashSession.current)
r.post('/finance/cash-sessions/open', auth, CashSession.open)
r.post('/finance/cash-sessions/:id/close', auth, CashSession.close)
r.get('/finance/cash-sessions', auth, CashSession.list)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', Audit.create)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', Settings.update)

// Patients (lookup)
r.get('/patients/search', Patients.search)

// Notifications (Doctor portal)
r.get('/notifications', Notifications.list)
r.patch('/notifications/:id', Notifications.update)
r.get('/notifications/stream', Notifications.stream)

// Bed Management
r.get('/floors', BedMgmt.listFloors)
r.post('/floors', BedMgmt.createFloor)
r.put('/floors/:id', BedMgmt.updateFloor)
r.delete('/floors/:id', BedMgmt.removeFloor)
r.get('/rooms', BedMgmt.listRooms)
r.post('/rooms', BedMgmt.createRoom)
r.put('/rooms/:id', BedMgmt.updateRoom)
r.delete('/rooms/:id', BedMgmt.removeRoom)
r.get('/wards', BedMgmt.listWards)
r.post('/wards', BedMgmt.createWard)
r.put('/wards/:id', BedMgmt.updateWard)
r.delete('/wards/:id', BedMgmt.removeWard)
r.get('/beds', BedMgmt.listBeds)
r.post('/beds', BedMgmt.addBeds)
r.put('/beds/:id', BedMgmt.updateBed)
r.delete('/beds/:id', BedMgmt.removeBed)
r.patch('/beds/:id/status', BedMgmt.updateBedStatus)

// Equipment Management
r.get('/equipment', Equipment.list)
r.post('/equipment', Equipment.create)
r.put('/equipment/:id', Equipment.update)
r.delete('/equipment/:id', Equipment.remove)

// Equipment: PPM
r.get('/equipment/ppm', Equipment.listPPM)
r.post('/equipment/ppm', Equipment.createPPM)

// Equipment: Calibration
r.get('/equipment/calibrations', Equipment.listCalibration)
r.post('/equipment/calibrations', Equipment.createCalibration)

// Equipment: Due Lists
r.get('/equipment/due/ppm', Equipment.duePPM)
r.get('/equipment/due/calibration', Equipment.dueCalibration)

// Equipment: Breakdowns
r.get('/equipment/breakdowns', Equipment.listBreakdowns)
r.post('/equipment/breakdowns', Equipment.createBreakdown)
r.put('/equipment/breakdowns/:id', Equipment.updateBreakdown)

// Equipment: Condemnations
r.get('/equipment/condemnations', Equipment.listCondemnations)
r.post('/equipment/condemnations', Equipment.createCondemnation)
r.put('/equipment/condemnations/:id', Equipment.updateCondemnation)

// Equipment: KPIs
r.get('/equipment/kpis', Equipment.kpis)

// Store Management
// Masters
r.get('/store/categories', Store.listCategories)
r.post('/store/categories', Store.createCategory)
r.put('/store/categories/:id', Store.updateCategory)
r.delete('/store/categories/:id', Store.removeCategory)

r.get('/store/units', Store.listUnits)
r.post('/store/units', Store.createUnit)
r.put('/store/units/:id', Store.updateUnit)
r.delete('/store/units/:id', Store.removeUnit)

r.get('/store/locations', Store.listLocations)
r.post('/store/locations', Store.createLocation)
r.put('/store/locations/:id', Store.updateLocation)
r.delete('/store/locations/:id', Store.removeLocation)

r.get('/store/items', Store.listItems)
r.post('/store/items', Store.createItem)
r.put('/store/items/:id', Store.updateItem)
r.delete('/store/items/:id', Store.removeItem)

// Stock & lots
r.get('/store/lots', Store.listLots)
r.get('/store/stock', Store.stockSummary)

// Transactions
r.get('/store/txns', Store.listTxns)
r.post('/store/receive', Store.receive)
r.post('/store/issue', Store.issue)
r.post('/store/transfer', Store.transfer)
r.post('/store/adjust', Store.adjust)

// Reports
r.get('/store/reports/worth', Store.inventoryWorth)
r.get('/store/reports/low-stock', Store.lowStock)
r.get('/store/reports/expiring', Store.expiring)
r.get('/store/reports/ledger', Store.ledger)

export default r
