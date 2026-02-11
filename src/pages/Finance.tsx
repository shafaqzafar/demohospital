import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Finance() {
  const navigate = useNavigate()
  useEffect(() => {
    try {
      const isAuthenticated = localStorage.getItem('isAuthenticated')
      if (!isAuthenticated) navigate('/modules')
    } catch {
      navigate('/modules')
    }
  }, [navigate])
  return <div className="px-6 py-10"></div>
}
