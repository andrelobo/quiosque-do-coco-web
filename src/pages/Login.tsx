import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading } = useAuth()
  const { error: showError } = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as any)?.from?.pathname || '/pdv'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      showError('Preencha todos os campos', 'Usuário e senha são obrigatórios')
      return
    }

    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err: any) {
      showError('Erro ao entrar', err.message || 'Credenciais inválidas')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h1 className="login-title">Quiosque do Coco</h1>
          <p className="login-subtitle">Sistema de atendimento e gestão de turnos</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="Usuário"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Digite seu usuário"
            autoComplete="username"
            required
            leftIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />

          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
            leftIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
          />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting || loading}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="login-footer">
          <p>Credenciais de teste:</p>
          <p style={{ marginTop: 'var(--space-2)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
            admin / admin123<br/>
            responsavel / resp123<br/>
            atendente / atend123
          </p>
        </div>
      </div>
    </div>
  )
}