import { Request, Response } from 'express'
import { LabOrder } from '../models/Order'
import { LabAuditLog } from '../models/AuditLog'
import { orderCreateSchema, orderQuerySchema, orderTrackUpdateSchema } from '../validators/order'
import { LabCounter } from '../models/Counter'
import { LabResult } from '../models/Result'
import { LabInventoryItem } from '../models/InventoryItem'
import { LabTest } from '../models/Test'
import { resolveTestPrice } from '../../corporate/utils/price'
import { CorporateTransaction } from '../../corporate/models/Transaction'
import { CorporateCompany } from '../../corporate/models/Company'

async function nextToken(date?: Date){
  const d = date || new Date()
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
  const yyyymmdd = `${y}${m}${day}`
  const key = `lab_token_${yyyymmdd}`
  let c: any = await LabCounter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  if (c && Number(c.seq) === 1){
    try {
      const prefix = `D${day}${m}${y}-`
      const rx = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const docs: any[] = await LabOrder.find({ tokenNo: rx }).select('tokenNo').lean()
      const maxSeq = (docs||[]).reduce((mx, o: any) => {
        try {
          const s = String(o?.tokenNo || '')
          const part = s.split('-')[1] || ''
          const n = parseInt(part, 10)
          return isNaN(n) ? mx : Math.max(mx, n)
        } catch { return mx }
      }, 0)
      if (maxSeq > 0){
        c = await LabCounter.findOneAndUpdate({ _id: key, seq: 1 }, { $set: { seq: maxSeq + 1 } }, { new: true }) || c
      }
    } catch {}
  }
  const seq = String((c?.seq || 1)).padStart(3,'0')
  return `D${day}${m}${y}-${seq}`
}

export async function list(req: Request, res: Response){
  const parsed = orderQuerySchema.safeParse(req.query)
  const { q, status, from, to, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (q){
    const rx = new RegExp(String(q), 'i')
    filter.$or = [ { 'patient.fullName': rx }, { 'patient.phone': rx }, { tokenNo: rx }, { 'patient.mrn': rx } ]
  }
  if (status) filter.status = status
  if (from || to){
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) { const end = new Date(to); end.setHours(23,59,59,999); filter.createdAt.$lte = end }
  }
  const lim = Math.min(500, Number(limit || 20))
  const pg = Math.max(1, Number(page || 1))
  const skip = (pg - 1) * lim
  const [items, total] = await Promise.all([
    LabOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
    LabOrder.countDocuments(filter),
  ])
  const totalPages = Math.max(1, Math.ceil((total || 0) / lim))
  res.json({ items, total, page: pg, totalPages })
}

export async function create(req: Request, res: Response){
  const data = orderCreateSchema.parse(req.body)
  if ((data as any).corporateId){
    const comp = await CorporateCompany.findById(String((data as any).corporateId)).lean()
    if (!comp) return res.status(400).json({ error: 'Invalid corporateId' })
    if ((comp as any).active === false) return res.status(400).json({ error: 'Corporate company inactive' })
  }
  const tokenNo = (data as any).tokenNo || await nextToken(new Date())
  const doc = await LabOrder.create({ ...data, tokenNo, status: 'received' })
  // Deduct consumables from inventory (best-effort)
  try {
    const cons = Array.isArray(data.consumables) ? data.consumables : []
    await Promise.all(cons.map(async (c: any) => {
      const key = String(c.item || '').trim().toLowerCase()
      const qty = Math.max(0, Number(c.qty || 0))
      if (!key || qty <= 0) return
      const it = await (LabInventoryItem as any).findOne({ key })
      if (!it) return
      const cur = Math.max(0, Number(it.onHand || 0))
      it.onHand = Math.max(0, cur - qty)
      await it.save()
    }))
  } catch (e){
    console.error('Consumable deduction failed:', e)
  }
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Sample Intake',
      label: 'SAMPLE_INTAKE',
      method: 'POST',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${tokenNo} — ${String((data as any)?.patient?.fullName || '')}`,
    })
  } catch {}
  // Corporate: create ledger lines per test
  try {
    const companyId = (data as any).corporateId ? String((data as any).corporateId) : ''
    if (companyId){
      const testIds = Array.isArray(data.tests)? data.tests : []
      const tests = await LabTest.find({ _id: { $in: testIds } }).lean()
      const map = new Map<string, any>(tests.map(t => [String((t as any)._id), t]))
      const dateIso = new Date().toISOString().slice(0,10)
      for (const tid of testIds){
        const t = map.get(String(tid))
        const listPrice = Number(t?.price || 0)
        const corp = await resolveTestPrice({ companyId, scope: 'LAB', testId: String(tid), defaultPrice: listPrice })
        const baseCorp = Number(corp.price || 0)
        const coPayPct = Math.max(0, Math.min(100, Number((data as any)?.corporateCoPayPercent || 0)))
        const coPayAmt = Math.max(0, baseCorp * (coPayPct/100))
        let net = Math.max(0, baseCorp - coPayAmt)
        const cap = Number((data as any)?.corporateCoverageCap || 0) || 0
        if (cap > 0){
          try {
            const existing = await CorporateTransaction.find({ refType: 'lab_order', refId: String((doc as any)?._id || '') }).select('netToCorporate').lean()
            const used = (existing || []).reduce((s: number, tx: any)=> s + Number(tx?.netToCorporate||0), 0)
            const remaining = Math.max(0, cap - used)
            net = Math.max(0, Math.min(net, remaining))
          } catch {}
        }
        await CorporateTransaction.create({
          companyId,
          patientMrn: String((data as any)?.patient?.mrn || ''),
          patientName: String((data as any)?.patient?.fullName || ''),
          serviceType: 'LAB',
          refType: 'lab_order',
          refId: String((doc as any)?._id || ''),
          itemRef: String(tid),
          dateIso,
          description: `Lab Test${t?.name?`: ${t.name}`:''}`,
          qty: 1,
          unitPrice: listPrice,
          corpUnitPrice: baseCorp,
          coPay: coPayAmt,
          netToCorporate: net,
          corpRuleId: String(corp.appliedRuleId||''),
          status: 'accrued',
        })
      }
    }
  } catch (e) { console.warn('Failed to create corporate transactions for Lab order', e) }
  res.status(201).json(doc)
}

export async function updateTrack(req: Request, res: Response){
  const { id } = req.params
  const patch = orderTrackUpdateSchema.parse(req.body)
  const doc = await LabOrder.findByIdAndUpdate(id, { $set: patch }, { new: true })
  if (!doc) return res.status(404).json({ message: 'Order not found' })
  // Corporate: on returned, create reversals for all items
  try {
    if ((patch as any).status === 'returned'){
      const existing: any[] = await CorporateTransaction.find({ refType: 'lab_order', refId: String(id), status: { $ne: 'reversed' } }).lean()
      for (const tx of existing){
        try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}
        try {
          await CorporateTransaction.create({
            companyId: tx.companyId,
            patientMrn: tx.patientMrn,
            patientName: tx.patientName,
            serviceType: tx.serviceType,
            refType: tx.refType,
            refId: tx.refId,
            itemRef: tx.itemRef,
            dateIso: new Date().toISOString().slice(0,10),
            description: `Reversal: ${tx.description || 'Lab Test'}`,
            qty: tx.qty,
            unitPrice: -Math.abs(Number(tx.unitPrice||0)),
            corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),
            coPay: -Math.abs(Number(tx.coPay||0)),
            netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),
            corpRuleId: tx.corpRuleId,
            status: 'accrued',
            reversalOf: String(tx._id),
          })
        } catch (e) { console.warn('Failed to create corporate reversal for Lab order', e) }
      }
    }
  } catch (e) { console.warn('Corporate reversal (lab updateTrack) failed', e) }
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    const keys = ['status','sampleTime','reportingTime']
    const changed = keys.filter(k => (patch as any)[k] != null).map(k => `${k}=${(patch as any)[k]}`).join(', ')
    await LabAuditLog.create({
      actor,
      action: 'Tracking Update',
      label: 'TRACKING_UPDATE',
      method: 'PUT',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Order ${id}${changed ? ' — ' + changed : ''}`,
    })
  } catch {}
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  // Remove associated results first to avoid orphans
  await LabResult.deleteMany({ orderId: id })
  // Corporate: create reversals before deleting the order
  try {
    const existing: any[] = await CorporateTransaction.find({ refType: 'lab_order', refId: String(id), status: { $ne: 'reversed' } }).lean()
    for (const tx of existing){
      try { await CorporateTransaction.findByIdAndUpdate(String(tx._id), { $set: { status: 'reversed' } }) } catch {}
      try {
        await CorporateTransaction.create({
          companyId: tx.companyId,
          patientMrn: tx.patientMrn,
          patientName: tx.patientName,
          serviceType: tx.serviceType,
          refType: tx.refType,
          refId: tx.refId,
          itemRef: tx.itemRef,
          dateIso: new Date().toISOString().slice(0,10),
          description: `Reversal: ${tx.description || 'Lab Test'}`,
          qty: tx.qty,
          unitPrice: -Math.abs(Number(tx.unitPrice||0)),
          corpUnitPrice: -Math.abs(Number(tx.corpUnitPrice||0)),
          coPay: -Math.abs(Number(tx.coPay||0)),
          netToCorporate: -Math.abs(Number(tx.netToCorporate||0)),
          corpRuleId: tx.corpRuleId,
          status: 'accrued',
          reversalOf: String(tx._id),
        })
      } catch (e) { console.warn('Failed to create corporate reversal for Lab order (delete)', e) }
    }
  } catch (e) { console.warn('Corporate reversal lookup failed for Lab order delete', e) }
  const doc = await LabOrder.findByIdAndDelete(id)
  if (!doc) return res.status(404).json({ message: 'Order not found' })
  try {
    const actor = (req as any).user?.name || (req as any).user?.email || 'system'
    await LabAuditLog.create({
      actor,
      action: 'Delete Sample',
      label: 'DELETE_SAMPLE',
      method: 'DELETE',
      path: req.originalUrl,
      at: new Date().toISOString(),
      detail: `Token ${String((doc as any)?.tokenNo || id)} — ${String((doc as any)?.patient?.fullName || '')}`,
    })
  } catch {}
  res.json({ success: true })
}
