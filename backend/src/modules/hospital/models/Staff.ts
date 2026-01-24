import { Schema, model, models } from 'mongoose'

const StaffSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['reception','nurse','admin','cashier'], required: true },
  phone: { type: String },
  salary: { type: Number },
  shiftId: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true })

export type HospitalStaffDoc = {
  _id: string
  name: string
  role: 'reception'|'nurse'|'admin'|'cashier'
  phone?: string
  salary?: number
  shiftId?: string
  active: boolean
}

export const HospitalStaff = models.Hospital_Staff || model('Hospital_Staff', StaffSchema)
