import React from 'react'

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export const Avatar = ({ src, alt, name, size = 'md', className = '' }: AvatarProps) => {
  const sizeClasses = {
    sm: 'avatar-sm',
    md: 'avatar',
    lg: 'avatar-lg',
    xl: 'avatar-xl',
  }

  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={`avatar ${sizeClasses[size]} ${className}`}
        style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: 'inherit' }}
      />
    )
  }

  // Gerar cor baseada no nome para consistência
  const getColorFromName = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = hash % 360
    return `hsl(${hue}, 55%, 45%)`
  }

  const bgColor = name ? getColorFromName(name) : 'var(--color-primary)'

  return (
    <div
      className={`avatar ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={name || 'Avatar'}
    >
      {initials || '?'}
    </div>
  )
}