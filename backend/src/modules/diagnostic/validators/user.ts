import { z } from 'zod'

export const userCreateSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  role: z.enum(['admin','technician','reception']).default('technician'),
})

export const userUpdateSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(4).optional(),
  role: z.enum(['admin','technician','reception']).optional(),
})
