import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  FileText, 
  PhoneIncoming,
  LogOut,
  Building
} from 'lucide-react'

interface Module {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  loginPath: string
}

export default function ModulesPage() {
  const navigate = useNavigate()
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      // Don't redirect, allow access to modules page after module logout
      // User can re-access modules without re-login
    }
  }, [navigate])

  const modules: Module[] = [
    {
      id: 'hospital',
      title: 'Hospital',
      description: 'Appointments, admissions, billing, and EMR.',
      icon: <Stethoscope className="w-8 h-8" />,
      color: 'bg-blue-500',
      loginPath: '/hospital'
    },
    {
      id: 'lab',
      title: 'Laboratory',
      description: 'Lab orders, tests, and results management.',
      icon: <FlaskConical className="w-8 h-8" />,
      color: 'bg-green-500',
      loginPath: '/lab'
    },
    {
      id: 'diagnostic',
      title: 'Diagnostics',
      description: 'Diagnostic tokens, tests, tracking, and reports.',
      icon: <FlaskConical className="w-8 h-8" />,
      color: 'bg-teal-500',
      loginPath: '/diagnostic'
    },
    {
      id: 'pharmacy',
      title: 'Pharmacy',
      description: 'Prescriptions, inventory, and POS.',
      icon: <Pill className="w-8 h-8" />,
      color: 'bg-purple-500',
      loginPath: '/pharmacy'
    },
    {
      id: 'finance',
      title: 'Finance',
      description: 'Financial management and accounting.',
      icon: <FileText className="w-8 h-8" />,
      color: 'bg-yellow-500',
      loginPath: '/finance'
    },
    {
      id: 'reception',
      title: 'Reception',
      description: 'Front-desk, patient registration, and triage.',
      icon: <PhoneIncoming className="w-8 h-8" />,
      color: 'bg-indigo-500',
      loginPath: '/reception'
    }
  ]

  const handleModuleClick = (module: Module) => {
    if (!selectedModules.includes(module.id)) {
      setSelectedModules([...selectedModules, module.id])
    }
    navigate(module.loginPath)
  }

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    setSelectedModules([])
    navigate('/') // Only redirect to main login if they specifically logout from modules page
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Building className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Hospital Suite</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Module</h2>
          <p className="text-gray-600">Choose a module to access its features</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => {
            const isSelected = selectedModules.includes(module.id)
            
            return (
              <div
                key={module.id}
                className={`relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                  isSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''
                }`}
                onClick={() => handleModuleClick(module)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium z-10">
                    ✓ Accessed
                  </div>
                )}
                
                <div className="p-6">
                  <div className={`${module.color} w-16 h-16 rounded-lg flex items-center justify-center text-white mb-4`}>
                    {module.icon}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{module.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{module.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600 font-medium hover:text-blue-800">
                      Access Module →
                    </span>
                    {isSelected && (
                      <span className="text-xs text-green-600 font-medium">Active</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {selectedModules.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Active Sessions:</span> You have accessed {selectedModules.length} module(s)
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
