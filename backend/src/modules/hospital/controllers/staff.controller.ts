import { Request, Response } from 'express'
import { HospitalStaff } from '../models/Staff'
import { upsertStaffSchema } from '../validators/staff'

export async function list(_req: Request, res: Response){
  const rows = await HospitalStaff.find().sort({ createdAt: -1 }).lean()
  res.json({ staff: rows })
}

export async function create(req: Request, res: Response){
  const data = upsertStaffSchema.parse(req.body)
  const row = await HospitalStaff.create(data)
  res.status(201).json({ staff: row })
}

export async function update(req: Request, res: Response){
  const data = upsertStaffSchema.parse(req.body)
  const row = await HospitalStaff.findByIdAndUpdate(req.params.id, data, { new: true })
  if (!row) return res.status(404).json({ error: 'Staff not found' })
  res.json({ staff: row })
}

export async function remove(req: Request, res: Response){
  const row = await HospitalStaff.findByIdAndDelete(req.params.id)
  if (!row) return res.status(404).json({ error: 'Staff not found' })
  res.json({ ok: true })
}
