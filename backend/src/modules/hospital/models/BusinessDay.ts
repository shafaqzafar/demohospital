import { Schema, model, models } from 'mongoose'

const BusinessDaySchema = new Schema({
  dateIso: { type: String, required: true, index: true },
  status: { type: String, enum: ['open','closed'], default: 'open', index: true },
  openedAt: { type: Date, default: () => new Date() },
  closedAt: { type: Date },
  note: { type: String },
}, { timestamps: true })

export type BusinessDayDoc = {
  _id: string
  dateIso: string
  status: 'open'|'closed'
  openedAt: string
  closedAt?: string
  note?: string
}

export const BusinessDay = models.Hospital_Finance_BusinessDay || model('Hospital_Finance_BusinessDay', BusinessDaySchema)
