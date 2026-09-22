import React from 'react';

export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendPositive,
  trendColor,
  iconBg = 'bg-brand-50',
  iconColor = 'text-brand-600',
  onClick,
  className = '',
}) {
  const trendClass =
    trendColor ||
    (trendPositive === undefined
      ? 'bg-gray-50 text-gray-600'
      : trendPositive
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-red-50 text-red-700');

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-300/70 transition-all p-5 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">
            {label}
          </p>
          <p className="mt-2 text-2xl lg:text-3xl font-black text-navy-900 font-sans tracking-tight truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className={`mt-3 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${trendClass}`}>
              <span>
                {trendPositive !== undefined
                  ? trendPositive
                    ? '↗'
                    : '↘'
                  : '•'}
              </span>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div
          className={`flex-shrink-0 ml-3 w-11 h-11 rounded-xl ${iconColor} ${iconBg} flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
