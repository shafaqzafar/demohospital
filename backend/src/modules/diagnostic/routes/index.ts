import { Router } from 'express'
import * as Tests from '../controllers/tests.controller'
import * as Settings from '../controllers/settings.controller'
import * as Orders from '../controllers/orders.controller'
import * as Results from '../controllers/results.controller'
import * as Users from '../controllers/users.controller'
import * as Audit from '../controllers/audit.controller'
import * as Auth from '../controllers/auth.controller'

const r = Router()

// Auth
r.post('/login', Auth.login)
r.post('/logout', Auth.logout)

// Tests (Catalog for Diagnostics)
r.get('/tests', Tests.list)
r.post('/tests', Tests.create)
r.put('/tests/:id', Tests.update)
r.delete('/tests/:id', Tests.remove)

// Settings
r.get('/settings', Settings.get)
r.put('/settings', Settings.update)

// Orders (Sample Intake for Diagnostics)
r.get('/orders', Orders.list)
r.post('/orders', Orders.create)
r.put('/orders/:id', Orders.update)
r.put('/orders/:id/track', Orders.updateTrack)
r.put('/orders/:id/items/:testId/track', Orders.updateItemTrack)
r.delete('/orders/:id/items/:testId', Orders.removeItem)
r.delete('/orders/:id', Orders.remove)

// Results
r.get('/results', Results.list)
r.post('/results', Results.create)
r.get('/results/:id', Results.get)
r.put('/results/:id', Results.update)
r.delete('/results/:id', Results.remove)

// Audit Logs
r.get('/audit-logs', Audit.list)
r.post('/audit-logs', Audit.create)

// Users
r.get('/users', Users.list)
r.post('/users', Users.create)
r.put('/users/:id', Users.update)
r.delete('/users/:id', Users.remove)

export default r
