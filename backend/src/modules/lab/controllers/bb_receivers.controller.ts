import { Request, Response } from 'express'
import { LabBBReceiver } from '../models/BBReceiver'
import { bbReceiverCreateSchema, bbReceiverQuerySchema, bbReceiverUpdateSchema } from '../validators/bb_receiver'

export async function list(req: Request, res: Response){
  const parsed = bbReceiverQuerySchema.safeParse(req.query)
  const { q, status, type, page, limit } = parsed.success ? parsed.data as any : {}
  const filter: any = {}
  if (q) {
    const rx = new RegExp(q, 'i')
    filter.$or = [ { name: rx }, { cnic: rx }, { mrNumber: rx }, { pid: rx }, { ward: rx } ]
  }
  if (status) filter.status = status
  if (type) filter.type = type
  const effectiveLimit = Number(limit || 10)
  const currentPage = Math.max(1, Number(page || 1))
  const skip = (currentPage - 1) * effectiveLimit
  const total = await LabBBReceiver.countDocuments(filter)
  const items = await LabBBReceiver.find(filter).sort({ createdAt: -1 }).skip(skip).limit(effectiveLimit).lean()
  const totalPages = Math.max(1, Math.ceil(total / effectiveLimit))
  res.json({ items, total, page: currentPage, totalPages })
}

export async function create(req: Request, res: Response){
  const data = bbReceiverCreateSchema.parse(req.body)
  const code = (data as any).code || `RCV-${Date.now().toString().slice(-5)}`
  const doc = await LabBBReceiver.create({ code, status: 'PENDING', ...data })
  res.status(201).json(doc)
}

export async function update(req: Request, res: Response){
  const { id } = req.params
  const data = bbReceiverUpdateSchema.parse(req.body)
  const doc = await LabBBReceiver.findByIdAndUpdate(id, { $set: data }, { new: true })
  res.json(doc)
}

export async function remove(req: Request, res: Response){
  const { id } = req.params
  await LabBBReceiver.findByIdAndDelete(id)
  res.json({ ok: true })
}
