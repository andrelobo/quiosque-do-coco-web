import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const Card = ({ children, className = '', hover = true, padding = 'md' }: CardProps) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }

  return (
    <div className={`card ${hover ? '' : 'hover:shadow-sm hover:border-[var(--color-border)]'} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = '', action }: { children: React.ReactNode; className?: string; action?: React.ReactNode }) => (
  <div className={`card-header ${className}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
    <div>{children}</div>
    {action && <div>{action}</div>}
  </div>
)

export const CardBody = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`card-body ${className}`}>{children}</div>
)

export const CardFooter = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`card-footer ${className}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
    {children}
  </div>
)