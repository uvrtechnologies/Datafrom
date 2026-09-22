import React from 'react';

/**
 * Centers content in a phone-width card, matching the "DataSync Pro" mockups.
 * Still looks fine on desktop (just centered) since the mockups are mobile-first.
 */
export default function MobileShell({ children, header = true }) {
  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 flex flex-col items-center">
      <div className="w-full max-w-md">
        {header && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-bold">DS</div>
            <span className="font-serif font-bold text-brand-700 text-lg">DataSync Pro</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
