import { useEffect, useState } from 'react'
import { labApi } from '../../utils/api'
import { Link } from 'react-router-dom'

export default function Aesthetic_Patients(){
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [limit, setLimit] = useState(10)
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ setList([]) }, [])

  const search = async ()=>{
    setLoading(true)
    try{
      const phoneDigits = (phone || '').replace(/\D+/g,'')
      const res: any = await labApi.searchPatients({ phone: phoneDigits || undefined, name: name || undefined, limit })
      setList(Array.isArray(res?.patients) ? res.patients : [])
    } catch {
      setList([])
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="text-lg font-semibold">Patients</div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm">Phone</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="11-digit phone" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Full name" />
          </div>
          <div>
            <label className="mb-1 block text-sm">Limit</label>
            <select value={limit} onChange={e=>setLimit(parseInt(e.target.value))} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div className="mt-3"><button onClick={search} className="btn">Search</button></div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">MRN</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Gender</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p._id} className="border-t border-slate-200">
                <td className="px-3 py-2">{p.mrn || '-'}</td>
                <td className="px-3 py-2">{p.fullName || '-'}</td>
                <td className="px-3 py-2">{p.phoneNormalized || '-'}</td>
                <td className="px-3 py-2">{p.gender || '-'}</td>
                <td className="px-3 py-2">
                  {p.mrn ? (
                    <Link to={`/aesthetic/patients/mrn/${encodeURIComponent(p.mrn)}`} className="btn-outline-navy text-xs">Open</Link>
                  ) : (
                    <span className="text-xs text-slate-500">No MRN</span>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && !loading && (
              <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={5}>No results</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
