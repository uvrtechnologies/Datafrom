import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MobileShell from '../components/MobileShell';

export default function Success() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <MobileShell>
        <div className="bg-white rounded-2xl shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">No submission found.</p>
          <button onClick={() => navigate('/')} className="text-brand-600 font-semibold">Go back home</button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell header={false}>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="h-1.5 bg-green-500" />
        <div className="px-6 py-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-xl bg-green-50 flex items-center justify-center text-green-600 text-3xl mb-5">
            ✓
          </div>
          <h1 className="font-serif font-bold text-navy-900 text-2xl mb-3 leading-snug">
            INFORMATION SUBMITTED SUCCESSFULLY
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Thank you for providing your information. Your information has been successfully recorded.
          </p>

          <div className="bg-brand-50 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-gray-500 tracking-wide">SUBMISSION ID</p>
            <p className="font-mono font-bold text-navy-900 text-lg">{state.submissionId}</p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full rounded-lg bg-brand-600 text-white font-semibold py-3 hover:bg-brand-700"
          >
            Close
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
