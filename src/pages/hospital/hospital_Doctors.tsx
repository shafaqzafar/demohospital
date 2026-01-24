import { useEffect, useMemo, useState } from 'react'
import Hospital_AddDoctorDialog, { type HospitalDoctorInput } from '../../components/hospital/Hospital_AddDoctorDialog'
import { hospitalApi } from '../../utils/api'

type Doctor = {
  id: string
  name: string
  cnic: string
  specialization: string
  qualification: string
  phone: string
  fee: number
  shares: number
  username: string
  password: string
  createdAt: string
  primaryDepartmentId?: string
  departmentName?: string
}


export default function Hospital_Doctors() {
  const [list, setList] = useState<Doctor[]>([])
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  // moved to dialog component
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', cnic: '', specialization: '', qualification: '', primaryDepartmentId: '', phone: '', fee: '0', shares: '0', username: '', password: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    reload()
  }, [])

  async function reload() {
    try {
      const [docRes, depRes] = await Promise.all([
        hospitalApi.listDoctors(),
        hospitalApi.listDepartments(),
      ])
      const depArray: any[] = ((depRes as any)?.departments || (depRes as any) || []) as any[]
      const deps: Array<{ id: string; name: string }> = depArray.map((x: any) => ({ id: String(x._id || x.id), name: String(x.name || '') }))
      setDepartments(deps)
      const items = (docRes as any).doctors.map((d: any) => {
        const depName = d.primaryDepartmentId ? (deps.find((z: { id: string; name: string }) => z.id === String(d.primaryDepartmentId))?.name || '') : ''
        return {
          id: d._id,
          name: d.name,
          cnic: d.cnic || '',
          specialization: d.specialization || '',
          qualification: d.qualification || '',
          phone: d.phone || '',
          fee: Number(d.opdBaseFee || 0),
          shares: Number(d.shares || 0),
          username: d.username || '',
          password: '',
          createdAt: d.createdAt || new Date().toISOString(),
          primaryDepartmentId: String(d.primaryDepartmentId || ''),
          departmentName: depName,
        } as Doctor
      }) as Doctor[]
      setList(items)
    } catch (e: any) {
      const raw = (e?.message || '').trim()
      let msg = raw
      try { const j = JSON.parse(raw); if (j?.error) msg = j.error } catch {}
      alert(msg || 'Failed to save doctor')
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return list
    return list.filter(d => [d.name, d.username, d.specialization, d.qualification, d.departmentName, d.phone, d.cnic].some(v => String(v || '').toLowerCase().includes(s)))
  }, [q, list])

  const addDoctor = async (addForm: HospitalDoctorInput) => {
    if (!addForm.name.trim()) return
    try {
      await hospitalApi.createDoctor({
        name: addForm.name.trim(),
        opdBaseFee: Number(addForm.fee) || 0,
        username: addForm.username.trim() || undefined,
        password: addForm.password || undefined,
        phone: addForm.phone.trim() || undefined,
        specialization: addForm.specialization.trim() || undefined,
        qualification: addForm.qualification.trim() || undefined,
        primaryDepartmentId: addForm.primaryDepartmentId || undefined,
        shares: Number(addForm.shares) || 0,
        cnic: addForm.cnic.trim() || undefined,
        active: true,
      })
      setShowAdd(false)
      await reload()
    } catch (e: any) {
      const raw = (e?.message || '').trim()
      let msg = raw
      try { const j = JSON.parse(raw); if (j?.error) msg = j.error } catch {}
      alert(msg || 'Failed to add doctor')
    }
  }

  const openEdit = (id: string) => {
    const d = list.find(x => x.id === id)
    if (!d) return
    setEditId(id)
    setEditForm({ name: d.name, cnic: d.cnic, specialization: d.specialization, qualification: d.qualification || '', primaryDepartmentId: d.primaryDepartmentId || '', phone: d.phone, fee: String(d.fee), shares: String(d.shares), username: d.username, password: d.password })
  }
  const saveEdit = async () => {
    if (!editId) return
    if (!editForm.name.trim()) return
    try {
      await hospitalApi.updateDoctor(editId, {
        name: editForm.name.trim(),
        opdBaseFee: Number(editForm.fee) || 0,
        username: editForm.username.trim() || undefined,
        password: editForm.password || undefined,
        phone: editForm.phone.trim() || undefined,
        specialization: editForm.specialization.trim() || undefined,
        qualification: editForm.qualification.trim() || undefined,
        primaryDepartmentId: editForm.primaryDepartmentId || undefined,
        shares: Number(editForm.shares) || 0,
        cnic: editForm.cnic.trim() || undefined,
      })
      setEditId(null)
      setEditForm(prev => ({ ...prev, password: '' }))
      await reload()
    } catch {}
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await hospitalApi.deleteDoctor(deleteId)
    } catch {}
    setDeleteId(null)
    await reload()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Doctors</h2>
        <div className="flex items-center gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search doctors..." className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
          <button onClick={()=>setShowAdd(true)} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">+ Add Doctor</button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Username</th>
              <th className="px-4 py-2 text-left">Specialization</th>
              <th className="px-4 py-2 text-left">Qualification</th>
              <th className="px-4 py-2 text-left">Department</th>
              <th className="px-4 py-2 text-left">Fee</th>
              <th className="px-4 py-2 text-left">Shares (%)</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filtered.map(d => (
              <tr key={d.id}>
                <td className="px-4 py-2 font-medium">{d.name}</td>
                <td className="px-4 py-2">{d.username}</td>
                <td className="px-4 py-2">{d.specialization || '-'}</td>
                <td className="px-4 py-2">{d.qualification || '-'}</td>
                <td className="px-4 py-2">{d.departmentName || '-'}</td>
                <td className="px-4 py-2">Rs. {d.fee.toLocaleString()}</td>
                <td className="px-4 py-2">{d.shares}%</td>
                <td className="px-4 py-2">{d.phone || '-'}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={()=>openEdit(d.id)} className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700">Edit</button>
                    <button onClick={()=>setDeleteId(d.id)} className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={9}>No doctors</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Hospital_AddDoctorDialog open={showAdd} onClose={()=>setShowAdd(false)} onAdd={addDoctor} departments={departments} />

      {editId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Edit Doctor</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Doctor Name</label>
                <input value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">CNIC</label>
                <input value={editForm.cnic} onChange={e=>setEditForm(f=>({ ...f, cnic: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Password</label>
                <input type="password" value={editForm.password} onChange={e=>setEditForm(f=>({ ...f, password: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Specialization</label>
                <input value={editForm.specialization} onChange={e=>setEditForm(f=>({ ...f, specialization: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Qualification</label>
                <input value={editForm.qualification} onChange={e=>setEditForm(f=>({ ...f, qualification: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Department</label>
                <select value={editForm.primaryDepartmentId} onChange={e=>setEditForm(f=>({ ...f, primaryDepartmentId: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200">
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Phone Number</label>
                <input value={editForm.phone} onChange={e=>setEditForm(f=>({ ...f, phone: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Consultation Fee (Rs.)</label>
                <input value={editForm.fee} onChange={e=>setEditForm(f=>({ ...f, fee: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Shares (%)</label>
                <input value={editForm.shares} onChange={e=>setEditForm(f=>({ ...f, shares: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Username</label>
                <input value={editForm.username} onChange={e=>setEditForm(f=>({ ...f, username: e.target.value }))} className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setEditId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={saveEdit} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">Delete Doctor</h3>
            <p className="mt-2 text-sm text-slate-600">Are you sure you want to delete this doctor?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={()=>setDeleteId(null)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
