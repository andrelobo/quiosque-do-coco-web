import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline'
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
  dotColor?: string
}

export const Badge = ({ children, variant = 'neutral', size = 'md', className = '', dot, dotColor }: BadgeProps) => {
  const variantClasses = {
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    neutral: 'badge-neutral',
    outline: 'badge-outline',
  }

  const sizeStyles = {
    sm: { fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' },
    md: { fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-3)' },
  }

  return (
    <span
      className={`badge ${variantClasses[variant]} ${className}`}
      style={{
        ...sizeStyles[size],
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
      }}
    >
      {dot && (
        <span
          className="status-dot"
          style={{ backgroundColor: dotColor || 'currentColor' }}
        />
      )}
      {children}
    </span>
  )
}

// StatusBadge específico para status de pedidos/turnos
export const StatusBadge = ({ status, className = '' }: { status: string; className?: string }) => {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant']; dot?: boolean }> = {
    em_edicao: { label: 'Em Edição', variant: 'neutral' },
    aguardando_pagamento: { label: 'Aguardando Pagamento', variant: 'warning' },
    pago: { label: 'Pago', variant: 'primary', dot: true },
    em_preparo: { label: 'Em Preparo', variant: 'secondary', dot: true },
    pronto: { label: 'Pronto', variant: 'success', dot: true },
    entregue: { label: 'Entregue', variant: 'primary', dot: true },
    cancelado: { label: 'Cancelado', variant: 'danger' },
    pendente: { label: 'Pendente', variant: 'warning' },
    confirmado: { label: 'Confirmado', variant: 'success' },
    nao_confirmado: { label: 'Não Confirmado', variant: 'danger' },
    concluida: { label: 'Concluída', variant: 'success' },
    aberto: { label: 'Aberto', variant: 'primary', dot: true },
    fechado: { label: 'Fechado', variant: 'neutral' },
  }

  const config = statusConfig[status] || { label: status, variant: 'neutral' }

  return <Badge variant={config.variant} dot={config.dot} className={className}>{config.label}</Badge>
}