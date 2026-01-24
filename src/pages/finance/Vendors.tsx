import { useEffect, useState } from 'react'
import { financeApi } from '../../utils/api'

export default function Finance_Vendors(){
  type Vendor = { id: string; name: string; phone?: string; address?: string }
  const [list, setList] = useState<Vendor[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)

  useEffect(()=>{ load() }, [])

  async function load(){
    try {
      const res: any = await financeApi.vendors()
      const rows: Vendor[] = (res?.vendors||[]).map((v:any)=>({ id: String(v._id||v.id), name: String(v.name||''), phone: v.phone?String(v.phone):undefined, address: v.address?String(v.address):undefined }))
      setList(rows)
    } catch { setList([]) }
  }

  async function add(e: React.FormEvent){
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await financeApi.createVendor({ name: name.trim(), phone: phone.trim()||undefined, address: address.trim()||undefined })
      setName(''); setPhone(''); setAddress('')
      await load()
    } finally { setLoading(false) }
  }

  async function saveEdit(){
    if (!editing) return
    setLoading(true)
    try {
      await financeApi.updateVendor(editing.id, { name: editing.name, phone: editing.phone, address: editing.address })
      setEditing(null)
      await load()
    } finally { setLoading(false) }
  }

  async function remove(id: string){
    if (!confirm('Delete this vendor?')) return
    try { await financeApi.deleteVendor(id); await load() } catch {}
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 space-y-6">
      <div className="text-2xl font-bold text-slate-800">Vendors</div>

      <form onSubmit={add} className="rounded-xl border border-slate-200 bg-white p-4 grid gap-3 md:grid-cols-4">
        <input value={name} onChange={e=>setName(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Vendor name" required />
        <input value={phone} onChange={e=>setPhone(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Phone (optional)" />
        <input value={address} onChange={e=>setAddress(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-1" placeholder="Address (optional)" />
        <div className="flex items-center justify-end">
          <button disabled={loading||!name.trim()} className="btn">{loading?'Saving...':'Add Vendor'}</button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Phone</th>
              <th className="px-4 py-2 font-medium">Address</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {list.map(v => (
              <tr key={v.id}>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <input value={editing.name} onChange={e=>setEditing({ ...editing!, name: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-sm w-full" />
                  ) : v.name}
                </td>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <input value={editing.phone||''} onChange={e=>setEditing({ ...editing!, phone: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-sm w-full" />
                  ) : (v.phone||'-')}
                </td>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <input value={editing.address||''} onChange={e=>setEditing({ ...editing!, address: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-sm w-full" />
                  ) : (v.address||'-')}
                </td>
                <td className="px-4 py-2">
                  {editing?.id===v.id ? (
                    <div className="flex gap-2">
                      <button type="button" onClick={saveEdit} className="btn">Save</button>
                      <button type="button" onClick={()=>setEditing(null)} className="btn-outline-navy">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>setEditing(v)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">Edit</button>
                      <button type="button" onClick={()=>remove(v.id)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {list.length===0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>No vendors</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
