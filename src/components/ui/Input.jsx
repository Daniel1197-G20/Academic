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
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-xs font-medium text-zinc-300 tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-zinc-500 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          className={`w-full bg-[#080A0C] text-zinc-100 text-sm rounded-xl px-3.5 py-2.5 
            border transition-all duration-150 neu-inset
            placeholder:text-zinc-600
            focus:outline-none focus:border-ghost-200/50 focus:ring-1 focus:ring-ghost-200/40
            disabled:opacity-50 disabled:cursor-not-allowed
            ${Icon ? 'pl-9' : ''}
            ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30' : 'border-white/[0.06] hover:border-white/10'}
            ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500 mt-1">{helperText}</p>
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
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label 
          htmlFor={selectId} 
          className="block text-xs font-medium text-zinc-300 tracking-wide"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`w-full appearance-none bg-[#080A0C] text-zinc-100 text-sm rounded-xl px-3.5 py-2.5 pr-9
            border transition-all duration-150 neu-inset
            focus:outline-none focus:border-ghost-200/50 focus:ring-1 focus:ring-ghost-200/40
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500/50' : 'border-white/[0.06] hover:border-white/10'}
            ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0A0C0E] text-zinc-100">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error ? (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
});
