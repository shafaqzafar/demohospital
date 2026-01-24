import { Schema, model, models } from 'mongoose'

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin','pharmacist','salesman'], default: 'salesman' },
  passwordHash: { type: String, required: true },
}, { timestamps: true, collection: 'aesthetic_users' })

export type AestheticUserDoc = {
  _id: string
  username: string
  role: 'admin'|'pharmacist'|'salesman'
  passwordHash: string
}

export const AestheticUser = models.Aesthetic_User || model('Aesthetic_User', UserSchema)
