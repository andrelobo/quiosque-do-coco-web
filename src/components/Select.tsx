import React from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = `${selectId}-error`
    const hintId = `${selectId}-hint`

    return (
      <div className={`select-wrapper ${className}`}>
        {label && (
          <label htmlFor={selectId} className="input-label">
            {label}
            {props.required && (
              <span style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-1)' }}>*</span>
            )}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`input-field select-field ${error ? 'error' : ''}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="input-error" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="input-hint">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
