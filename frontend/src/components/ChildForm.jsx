import React from 'react';
import { Field, inputCls } from './formPrimitives';

export default function ChildForm({ child, index, onChange, onRemove }) {
  const set = (key, value) => onChange({ ...child, [key]: value });

  return (
    <div className="border border-brand-100 bg-brand-50/40 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <button type="button" onClick={onRemove} className="text-red-500 text-sm">Remove</button>
      </div>
      <Field label="Full Name">
        <input className={inputCls} placeholder="Child's full name" value={child.fullName} onChange={(e) => set('fullName', e.target.value)} />
      </Field>
      <Field label="Age">
        <input className={inputCls} placeholder="Age" value={child.age} onChange={(e) => set('age', e.target.value)} />
      </Field>
      <Field label="Gender">
        <select className={inputCls} value={child.gender} onChange={(e) => set('gender', e.target.value)}>
          <option value="">Select Gender</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
      </Field>
    </div>
  );
}

export const emptyChild = () => ({ fullName: '', age: '', gender: '' });
