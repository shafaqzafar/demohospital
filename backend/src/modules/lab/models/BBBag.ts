import { Schema, model, models } from 'mongoose'

const BBBagSchema = new Schema({
  bagId: { type: String, index: true },
  donorName: { type: String },
  bloodType: { type: String },
  volume: { type: Number }, // ml
  collectionDate: { type: String }, // yyyy-mm-dd
  expiryDate: { type: String },
  status: { type: String, enum: ['Available','Quarantined','Used','Expired'], default: 'Available' },
  notes: { type: String },
}, { timestamps: true, collection: 'lab_bb_bags' })

export type LabBBBagDoc = {
  _id: string
  bagId?: string
  donorName?: string
  bloodType?: string
  volume?: number
  collectionDate?: string
  expiryDate?: string
  status: 'Available'|'Quarantined'|'Used'|'Expired'
  notes?: string
}

export const LabBBBag = models.Lab_BB_Bag || model('Lab_BB_Bag', BBBagSchema)
