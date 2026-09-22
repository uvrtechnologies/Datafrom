import React from 'react';

const LABELS = ['Personal', 'Address', 'Family', 'Additional', 'Review'];

export default function StepDots({ current, total = 5 }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between text-xs font-semibold text-brand-600 mb-2">
        <span>STEP {current} OF {total}</span>
        <span className="text-gray-600">{LABELS[current - 1]}</span>
      </div>
      <div className="flex items-center">
        {Array.from({ length: total }).map((_, i) => {
          const num = i + 1;
          const done = num < current;
          const active = num === current;
          return (
            <React.Fragment key={num}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                  ${done ? 'bg-green-500 text-white' : active ? 'border-2 border-brand-600 text-brand-600 bg-white' : 'border-2 border-gray-200 text-gray-300 bg-white'}`}
              >
                {done ? '✓' : num}
              </div>
              {num < total && <div className={`h-0.5 flex-1 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
