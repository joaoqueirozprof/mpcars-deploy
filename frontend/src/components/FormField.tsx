import React from 'react'
import { AlertCircle } from 'lucide-react'

interface FormFieldProps {
  label?: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'time' | 'tel' | 'select' | 'textarea'
  value: string | number
  onChange: (value: string | number) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
  options?: Array<{ value: string | number; label: string }>
  rows?: number
  maxLength?: number
  min?: number
  max?: number
  step?: number
  pattern?: string
  helpText?: string
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder,
  disabled = false,
  options = [],
  rows = 4,
  maxLength,
  min,
  max,
  step,
  pattern,
  helpText,
}) => {
  const hasError = Boolean(error)

  const baseInputClasses = `w-full px-3.5 py-2.5 border rounded-lg
    bg-white text-neutral-900 placeholder-neutral-400
    focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all duration-200
    disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed
    ${
      hasError
        ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
        : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500 hover:border-neutral-400'
    }`

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-neutral-700 mb-2"
        >
          {label}
          {required && <span className="text-danger-600 ml-1">*</span>}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {type === 'select' ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className={baseInputClasses}
          >
            <option value="" disabled>
              {placeholder || 'Selecionar...'}
            </option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={baseInputClasses}
          />
        ) : (
          <input
            id={name}
            type={type}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            className={baseInputClasses}
          />
        )}

        {/* Error icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <AlertCircle size={18} className="text-danger-500" />
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p className="mt-2 text-sm text-danger-600 flex items-center gap-1">
          <span>{error}</span>
        </p>
      )}

      {/* Help text */}
      {helpText && !hasError && (
        <p className="mt-2 text-sm text-neutral-500">{helpText}</p>
      )}

      {/* Character counter for textarea/text with maxLength */}
      {maxLength && (type === 'textarea' || type === 'text') && (
        <p className="mt-2 text-xs text-neutral-400 text-right">
          {String(value).length} / {maxLength}
        </p>
      )}
    </div>
  )
}

export default FormField
