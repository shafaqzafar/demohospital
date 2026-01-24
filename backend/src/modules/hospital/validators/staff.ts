import { z } from 'zod'

export const upsertStaffSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['reception','nurse','admin','cashier']),
  phone: z.string().optional(),
  salary: z.number().min(0).optional(),
  shiftId: z.string().optional(),
  active: z.boolean().optional(),
})
