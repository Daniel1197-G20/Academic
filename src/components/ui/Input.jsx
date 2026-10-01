import React, { forwardRef } from 'react';

export const Input = forwardRef(function Input({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  id,
  type = 'text',
  disabled = false,
  ...props
}, ref) {
  const inputId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-xs font-semibold text-ink tracking-tight"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-muted pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          className={`w-full bg-white text-ink text-sm rounded-btn px-3.5 py-2.5 
            border shadow-tactile-inset-sm transition-all duration-150
            placeholder:text-muted/60
            focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic focus:shadow-tactile-inset-sm
            disabled:opacity-50 disabled:bg-canvas disabled:cursor-not-allowed disabled:shadow-none
            ${Icon ? 'pl-9' : ''}
            ${error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border hover:border-gray-400'}
            ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-danger font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

export const Select = forwardRef(function Select({
  label,
  error,
  helperText,
  options = [],
  className = '',
  id,
  disabled = false,
  ...props
}, ref) {
  const selectId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={selectId} 
          className="block text-xs font-semibold text-ink tracking-tight"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none bg-white text-ink text-sm rounded-btn px-3.5 py-2.5 pr-9
            border shadow-tactile-inset-sm transition-all duration-150
            focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic focus:shadow-tactile-inset-sm
            disabled:opacity-50 disabled:bg-canvas disabled:cursor-not-allowed disabled:shadow-none
            ${error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border hover:border-gray-400'}
            ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-ink">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error ? (
        <p className="text-xs text-danger font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({
  label,
  error,
  helperText,
  className = '',
  id,
  rows = 3,
  disabled = false,
  ...props
}, ref) {
  const textareaId = id || (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={textareaId} 
          className="block text-xs font-semibold text-ink tracking-tight"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-white text-ink text-sm rounded-btn px-3.5 py-2.5 
          border shadow-tactile-inset-sm transition-all duration-150
          placeholder:text-muted/60
          focus:outline-none focus:border-academic focus:ring-1 focus:ring-academic focus:shadow-tactile-inset-sm
          disabled:opacity-50 disabled:bg-canvas disabled:cursor-not-allowed disabled:shadow-none
          ${error ? 'border-danger focus:border-danger focus:ring-danger' : 'border-border hover:border-gray-400'}
          ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-xs text-danger font-medium mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-muted mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
