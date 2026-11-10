import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  dividerAfter?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  closeOnClick?: boolean
}

export const Dropdown = ({ trigger, items, align = 'right', closeOnClick = true }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return
    item.onClick()
    if (closeOnClick) setIsOpen(false)
  }

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="dropdown-menu"
      style={{
        [align === 'left' ? 'left' : 'right']: 0,
        minWidth: '200px',
        zIndex: 100,
      }}
      role="menu"
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.dividerAfter && index > 0 && (
            <div className="dropdown-divider" role="separator" />
          )}
          <button
            className={`dropdown-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}
          >
            {item.icon && <span style={{ display: 'flex', width: '18px' }}>{item.icon}</span>}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  ) : null

  return (
    <div className="dropdown" ref={triggerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {createPortal(dropdownContent, document.body)}
    </div>
  )
}