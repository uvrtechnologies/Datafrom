import React from 'react';

const ACCENTS = {
  slate: 'bg-slate-50 text-slate-600 ring-slate-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  purple: 'bg-purple-50 text-purple-700 ring-purple-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function ChartCard({ title, subtitle, children, action, className = '', height = 280, icon, accent = 'slate' }) {
  const accentClass = ACCENTS[accent] || ACCENTS.slate;

  return (
    <section
      className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-900/[0.03] overflow-hidden flex flex-col ${className}`}
    >
      <header className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-start gap-3 min-w-0">
          {icon && (
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ring-1 ring-inset flex-shrink-0 ${accentClass}`}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 tracking-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 truncate leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0 pt-1">{action}</div>}
      </header>
      <div
        className="flex-1 w-full px-4 sm:px-6 py-4 sm:py-5"
        style={{ height, minHeight: height }}
      >
        {children}
      </div>
    </section>
  );
}
