import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Login } from './pages/Login'
import { PDV } from './pages/PDV'
import { Shifts } from './pages/Shifts'
import { Products } from './pages/Products'
import { Reports } from './pages/Reports'
import { Stock } from './pages/Stock'
import { Orders } from './pages/Orders'
import { Button } from './components/Button'
import { Avatar } from './components/Avatar'
import { Dropdown } from './components/Dropdown'

// Layout com sidebar
const AppLayout = () => {
  const { user, logout, hasRole } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()

  const navigation = [
    { path: '/pdv', label: 'PDV', icon: '🛒', roles: ['admin', 'responsavel', 'atendente'] },
    { path: '/orders', label: 'Pedidos', icon: '📋', roles: ['admin', 'responsavel', 'atendente'] },
    { path: '/shifts', label: 'Turnos', icon: '🕐', roles: ['admin', 'responsavel', 'atendente'] },
    { path: '/products', label: 'Produtos', icon: '📦', roles: ['admin', 'responsavel'] },
    { path: '/stock', label: 'Estoque', icon: '📊', roles: ['admin', 'responsavel'] },
    { path: '/reports', label: 'Relatórios', icon: '📈', roles: ['admin', 'responsavel'] },
  ]

  const filteredNav = navigation.filter(item => item.roles.includes(user?.role || ''))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`} style={{ 
        width: sidebarOpen ? '260px' : '72px',
        transition: 'width var(--transition-normal)',
      }}>
        <div className="sidebar-header" style={{ padding: sidebarOpen ? 'var(--space-5)' : 'var(--space-4)', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
          <div className="sidebar-logo" style={{ flexShrink: 0 }}>🥥</div>
          {sidebarOpen && <span className="sidebar-title">Quiosque do Coco</span>}
        </div>
        
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {filteredNav.map(item => (
            <a
              key={item.path}
              href={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              style={{ 
                padding: sidebarOpen ? 'var(--space-3)' : 'var(--space-3) var(--space-2)',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
              }}
              onClick={e => {
                e.preventDefault()
                navigate(item.path)
              }}
            >
              <span className="sidebar-icon" style={{ fontSize: 'var(--text-lg)' }} aria-hidden="true">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen ? (
            <>
              <div className="sidebar-user">
                <Avatar name={user?.name} size="md" />
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{user?.name}</div>
                  <div className="sidebar-user-role">{user?.role}</div>
                </div>
              </div>
              <Button variant="ghost" fullWidth onClick={handleLogout} style={{ marginTop: 'var(--space-3)' }}>
                Sair
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={handleLogout} aria-label="Sair" style={{ padding: 'var(--space-2)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content" style={{ 
        marginLeft: sidebarOpen ? '260px' : '72px',
        transition: 'margin-left var(--transition-normal)',
        minHeight: '100vh',
      }}>
        <header className="header">
          <div className="header-inner">
            <div className="header-left">
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Colapsar menu' : 'Expandir menu'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </Button>
              <h1 className="header-title">{filteredNav.find(n => location.pathname.startsWith(n.path))?.label || 'Quiosque do Coco'}</h1>
            </div>
            <div className="header-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <Avatar name={user?.name} size="sm" />
                {sidebarOpen && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{user?.name}</span>}
              </div>
            </div>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// Proteção de rotas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/pdv" element={<PDV />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/shifts" element={<Shifts />} />
        <Route path="/products" element={<Products />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="/" element={<Navigate to="/pdv" replace />} />
      <Route path="*" element={<Navigate to="/pdv" replace />} />
    </Routes>
  )
}

export default App