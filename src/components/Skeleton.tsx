import React from 'react'

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  className?: string
  lines?: number
}

export const Skeleton = ({ variant = 'text', width, height, className = '', lines = 1 }: SkeletonProps) => {
  const baseStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, var(--color-sand-200) 25%, var(--color-sand-100) 50%, var(--color-sand-200) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 'var(--radius-md)',
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    text: { borderRadius: 'var(--radius-sm)', height: height || '1rem' },
    circular: { borderRadius: '50%' },
    rectangular: { borderRadius: 'var(--radius-lg)' },
    card: { borderRadius: 'var(--radius-xl)' },
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...baseStyle,
              ...variantStyles[variant],
              width: i === lines - 1 ? (width || '60%') : (width || '100%'),
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        width: width || '100%',
        height: height || (variant === 'circular' ? width : undefined),
      }}
    />
  )
}

export const SkeletonCard = ({ lines = 3 }: { lines?: number }) => (
  <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
    <Skeleton variant="rectangular" height={48} width="40%" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  </div>
)

export const SkeletonTableRow = ({ columns = 4 }: { columns?: number }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <Skeleton variant="text" width="80%" />
      </td>
    ))}
  </tr>
)