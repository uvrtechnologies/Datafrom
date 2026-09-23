import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { IconArrowLeft, IconCheck, IconLoader2, IconLock, IconUser, IconUsers } from '../components/common/Icons';

const inputClass = 'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all';

export default function AddAdmin() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', mobileNumber: '', password: '', role: 'admin' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters.');
    if (!/^[6-9]\d{9}$/.test(form.mobileNumber.trim())) return setError('Please enter a valid 10-digit Indian mobile number.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');

    setSaving(true);
    try {
      const { data } = await api.post('/admin/admins', { ...form, name: form.name.trim(), email: form.email.trim() });
      setSuccess(data.message || 'Admin account created successfully.');
      setForm({ name: '', email: '', mobileNumber: '', password: '', role: 'admin' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the admin account.');
    } finally {
      setSaving(false);
    }
  };

  if (admin?.role !== 'superadmin') {
    return (
      <AdminLayout title="Add Admin">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <IconLock size={30} className="mx-auto text-red-600" />
          <h1 className="mt-3 font-serif text-2xl font-black text-red-900">Access denied</h1>
          <p className="mt-2 text-sm text-red-700">Only a superadmin can create admin accounts.</p>
          <Link to="/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">Back to dashboard</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Add Admin">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start gap-3">
          <button type="button" onClick={() => navigate('/dashboard')} className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-800" aria-label="Back to dashboard"><IconArrowLeft size={18} /></button>
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-600">Administration</p><h1 className="mt-1 font-serif text-3xl font-black text-navy-900">Add Admin</h1><p className="mt-1 text-sm text-gray-500">Create a secure login for another member of the administration team.</p></div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-7">
          {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><IconCheck size={16} />{success}</div>}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2"><span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700"><IconUser size={16} />Full name</span><input required maxLength={80} className={inputClass} value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="e.g. Operations Manager" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-gray-700">Email address</span><input required type="email" autoComplete="email" className={inputClass} value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder="admin@example.com" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-gray-700">Mobile number</span><input required inputMode="numeric" maxLength={10} className={inputClass} value={form.mobileNumber} onChange={(event) => setField('mobileNumber', event.target.value.replace(/\D/g, ''))} placeholder="9876543210" /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-gray-700">Temporary password</span><input required minLength={8} type="password" autoComplete="new-password" className={inputClass} value={form.password} onChange={(event) => setField('password', event.target.value)} placeholder="At least 8 characters" /></label>
            <label className="block"><span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700"><IconUsers size={16} />Access level</span><select className={inputClass} value={form.role} onChange={(event) => setField('role', event.target.value)}><option value="admin">Admin</option><option value="viewer">Viewer</option></select></label>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={() => navigate('/dashboard')} disabled={saving} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{saving ? <IconLoader2 size={16} /> : <IconCheck size={16} />} {saving ? 'Creating...' : 'Create Admin'}</button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
