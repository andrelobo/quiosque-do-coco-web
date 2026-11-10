import React from 'react'

interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  badge?: string | number
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
  variant?: 'line' | 'pills' | 'underline'
}

export const Tabs = ({ tabs, activeTab, onChange, className = '', variant = 'line' }: TabsProps) => {
  const variantClasses = {
    line: 'tabs',
    pills: 'flex gap-1',
    underline: 'tabs',
  }

  return (
    <div className={`${variantClasses[variant]} ${className}`} role="tablist" aria-label="Abas">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          id={`${tab.id}-trigger`}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          className={`tab ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            background: variant === 'pills' && activeTab === tab.id ? 'var(--color-primary-light)' : 'transparent',
            border: 'none',
            borderBottom: variant === 'line' || variant === 'underline' ? (activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent') : 'none',
            borderRadius: variant === 'pills' ? 'var(--radius-full)' : '0',
            marginBottom: variant === 'line' || variant === 'underline' ? '-2px' : '0',
            cursor: tab.disabled ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)',
            whiteSpace: 'nowrap',
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.badge && (
            <span style={{
              background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-sand-200)',
              color: activeTab === tab.id ? 'white' : 'var(--color-sand-700)',
              borderRadius: 'var(--radius-full)',
              padding: '0 var(--space-2)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-bold)',
              minWidth: '20px',
              textAlign: 'center',
            }}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

interface TabPanelProps {
  id: string
  active: boolean
  children: React.ReactNode
}

export const TabPanel = ({ id, active, children }: TabPanelProps) => (
  <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-trigger`} hidden={!active}>
    {active && children}
  </div>
)