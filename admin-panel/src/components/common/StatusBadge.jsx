import React from 'react';

const REGISTRY = {
  'Submitted': { tone: 'amber', label: 'SUBMITTED' },
  'Under Review': { tone: 'amber', label: 'UNDER REVIEW' },
  'Verified': { tone: 'green', label: 'VERIFIED' },
  'Working': { tone: 'sky', label: 'WORKING' },
  'Business': { tone: 'amber', label: 'BUSINESS' },
  'Student': { tone: 'emerald', label: 'STUDENT' },
  'Retired': { tone: 'purple', label: 'RETIRED' },
  'Not Working': { tone: 'gray', label: 'NOT WORKING' },
  'Other': { tone: 'pink', label: 'OTHER' },
};

const TONE_STYLES = {
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  green: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200',
  gray: 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200',
  pink: 'bg-pink-50 text-pink-700 ring-1 ring-inset ring-pink-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  blue: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
};

export default function StatusBadge({ status, tone, children, className = '' }) {
  let toneKey = tone;
  let label = children || status;
  if (status && REGISTRY[status]) {
    toneKey = toneKey || REGISTRY[status].tone;
    label = children || REGISTRY[status].label;
  }
  const style = TONE_STYLES[toneKey] || TONE_STYLES.gray;
  return (
    <span
      className={`inline-flex items-center font-bold text-[10px] tracking-wide px-2 py-1 rounded-full whitespace-nowrap ${style} ${className}`}
    >
      {label}
    </span>
  );
}
