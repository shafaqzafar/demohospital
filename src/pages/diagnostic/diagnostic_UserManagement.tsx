import { useEffect, useState } from 'react'
import { diagnosticApi } from '../../utils/api'

type User = { id: string; username: string; role: 'admin' | 'technician' | 'reception' }

export default function Diagnostic_UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<User['role']>('technician')
  const [newPassword, setNewPassword] = useState('')
  const [tick, setTick] = useState(0)
  const [notice, setNotice] = useState<{ text: string; kind: 'success'|'error' } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await diagnosticApi.listUsers()
        if (!mounted) return
        const list: User[] = (res.items || res || []).map((u: any) => ({ id: u._id, username: u.username, role: u.role }))
        setUsers(list)
      } catch (e) { console.error(e); setUsers([]) }
    })()
    return () => { mounted = false }
  }, [tick])

  const addUser = async () => {
    if (!newUsername.trim()) { alert('Username is required'); return }
    if (!newPassword || newPassword.length < 4) { alert('Password must be at least 4 characters'); return }
    try {
      await diagnosticApi.createUser({ username: newUsername.trim(), password: newPassword, role: newRole })
      setNewUsername(''); setNewPassword(''); setNewRole('technician'); setTick(prev=>prev+1)
    } catch (e) { console.error(e) }
  }

  const requestDelete = (id: string) => { setDeleteId(id); setDeleteOpen(true) }
  const performDelete = async () => {
    const id = deleteId; if (!id) { setDeleteOpen(false); return }
    try { await diagnosticApi.deleteUser(id); setTick(prev=>prev+1); setNotice({ text: 'User deleted', kind: 'success' }) }
    catch (e){ console.error(e); setNotice({ text: 'Failed to delete user', kind: 'error' }) }
    finally { setDeleteOpen(false); setDeleteId(null); try { setTimeout(()=> setNotice(null), 2500) } catch {} }
  }

  const editUser = async (id: string) => {
    const name = prompt('Edit username (leave blank to skip)') || undefined
    const pass = prompt('New password (optional)') || undefined
    const role = prompt('Role (admin/technician/reception, leave blank to keep)') as any || undefined
    try { await diagnosticApi.updateUser(id, { username: name, password: pass, role }); setTick(prev=>prev+1) } catch (e) { console.error(e) }
  }

  return (
    <div className="min-h-[70dvh] rounded-xl bg-gradient-to-br from-indigo-500/30 via-fuchsia-300/30 to-cyan-300/30 p-6">
      <div className="mx-auto w-full max-w-3xl rounded-xl bg-white p-6 shadow">
        <div className="mb-4 text-xl font-bold text-slate-800">User Management</div>
        {notice && (
          <div className={`mb-3 rounded-md border px-3 py-2 text-sm ${notice.kind==='success'? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{notice.text}</div>
        )}

        <div className="mb-3 text-sm font-medium text-slate-700">All Users</div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Username</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button onClick={()=>editUser(u.id)} className="rounded-md bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-700">Edit</button>
                      <button onClick={()=>requestDelete(u.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-sm font-medium text-slate-700">Add New User</div>
        <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto]">
          <input value={newUsername} onChange={e=>setNewUsername(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Username" />
          <select value={newRole} onChange={e=>setNewRole(e.target.value as User['role'])} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="technician">Technician</option>
            <option value="reception">Reception</option>
            <option value="admin">Admin</option>
          </select>
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Password" />
          <button onClick={addUser} className="btn">Add User</button>
        </div>
      </div>
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="border-b border-slate-200 px-5 py-3 text-base font-semibold text-slate-800">Confirm Delete</div>
            <div className="px-5 py-4 text-sm text-slate-700">Delete this user?</div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button onClick={()=>{ setDeleteOpen(false); setDeleteId(null) }} className="btn-outline-navy">Cancel</button>
              <button onClick={performDelete} className="btn bg-rose-600 hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
