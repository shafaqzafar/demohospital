import { Schema, model, models } from 'mongoose'

const ExpenseSchema = new Schema({
  date: { type: String, required: true },
  type: { type: String, enum: ['Rent','Utilities','Supplies','Salaries','Maintenance','Other'], required: true },
  note: { type: String, default: '' },
  amount: { type: Number, required: true },
}, { timestamps: true, collection: 'aesthetic_expenses' })

export type ExpenseDoc = {
  _id: string
  date: string
  type: 'Rent'|'Utilities'|'Supplies'|'Salaries'|'Maintenance'|'Other'
  note?: string
  amount: number
}

export const Expense = models.Aesthetic_Expense || model('Aesthetic_Expense', ExpenseSchema)
