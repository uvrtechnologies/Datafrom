import React from 'react';

export const inputCls =
  'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none';

export function Field({ label, children, required, hint }) {
  return (
    <label className="block mb-4">
      <span className="text-sm font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export function RadioPills({ options, value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-4 mt-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="radio"
            name={name}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="accent-brand-600 w-4 h-4"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export function ChoiceGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition
              ${active ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-brand-400'}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 ${className}`}>
      {title && (
        <h3 className="text-sm font-bold text-brand-700 mb-3 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
