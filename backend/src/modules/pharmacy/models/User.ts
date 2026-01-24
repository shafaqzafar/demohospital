import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin','pharmacist','salesman'], default: 'salesman' },
  passwordHash: { type: String, required: true },
}, { timestamps: true })

export type PharmacyUserDoc = {
  _id: string
  username: string
  role: 'admin'|'pharmacist'|'salesman'
  passwordHash: string
}

export const PharmacyUser = models.Pharmacy_User || model('Pharmacy_User', UserSchema)
