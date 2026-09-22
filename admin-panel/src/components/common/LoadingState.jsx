import React from 'react';
import { IconLoader2 } from './Icons';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200/70 rounded ${className}`} />;
}

export function Spinner({ size = 20, className = '', label }) {
  return (
    <div className={`inline-flex items-center gap-2 text-gray-500 ${className}`}>
      <IconLoader2 size={size} className="text-brand-600" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

export default function LoadingState({
  lines = 4,
  type = 'skeleton',
  label = 'Loading...',
  className = '',
}) {
  if (type === 'spinner') {
    return (
      <div className={`flex items-center justify-center py-10 ${className}`}>
        <Spinner label={label} size={24} />
      </div>
    );
  }

  return (
    <div className={`space-y-3 py-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => {
        const width = 80 + Math.round(Math.random() * 20);
        return (
          <Skeleton
            key={i}
            style={{ width: `${width}%` }}
            className="h-4"
          />
        );
      })}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200/60 p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2 w-2/3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
      <Skeleton className="h-5 w-36" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 6 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/60 bg-white">
      <div className="border-b border-gray-100 px-6 py-4">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-4 border-b border-gray-100 pb-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 flex-1 ${c === cols - 1 ? 'w-16 flex-none ml-auto' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
