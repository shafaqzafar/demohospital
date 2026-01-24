import { useEffect, useState } from 'react'
import { aestheticApi } from '../../utils/api'

type User = { id: string; username: string; role: 'admin' | 'pharmacist' | 'salesman' }

export default function Aesthetic_UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<User['role']>('salesman')
  const [newPassword, setNewPassword] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res: any = await aestheticApi.listUsers()
      const items: any[] = res?.items ?? res ?? []
      setUsers(items.map((u: any) => ({ id: String(u._id || u.id), username: String(u.username || ''), role: (u.role || 'salesman') as User['role'] })))
    } catch (e: any) {
      setError(e?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const addUser = async () => {
    if (!newUsername || !newPassword) return
    try {
      await aestheticApi.createUser({ username: newUsername.trim(), role: newRole, password: newPassword })
      setNewUsername('')
      setNewPassword('')
      setNewRole('salesman')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Failed to add user')
    }
  }

  const removeUser = async (id: string) => {
    if (!confirm('Delete this user?')) return
    try {
      await aestheticApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (e: any) {
      setError(e?.message || 'Failed to delete user')
    }
  }

  const editUser = async (id: string) => {
    const name = prompt('Edit username')
    if (!name) return
    try {
      await aestheticApi.updateUser(id, { username: name.trim() })
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, username: name.trim() } : u)))
    } catch (e: any) {
      setError(e?.message || 'Failed to update user')
    }
  }

  return (
    <div className="min-h-[70dvh] rounded-xl bg-gradient-to-br from-indigo-500/30 via-fuchsia-300/30 to-cyan-300/30 p-6">
      <div className="mx-auto w-full max-w-3xl rounded-xl bg-white p-6 shadow">
        <div className="mb-4 text-xl font-bold text-slate-800">User Management</div>
        {error ? (<div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>) : null}

        <div className="mb-3 text-sm font-medium text-slate-700">All Users {loading ? <span className="ml-2 text-xs opacity-60">Loading...</span> : null}</div>
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
                      <button onClick={()=>removeUser(u.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-700">Delete</button>
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
            <option value="salesman">Salesman</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="admin">Admin</option>
          </select>
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Password" />
          <button onClick={addUser} className="btn">Add User</button>
        </div>
      </div>
    </div>
  )
}
