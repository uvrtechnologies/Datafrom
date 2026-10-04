import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable, Spinner } from '../components/common/LoadingState';
import { IconAlertCircle, IconBriefcase, IconBuilding2, IconSearch } from '../components/common/Icons';
import api from '../services/api';

const PAGE_SIZE = 20;

const LIST_CONFIG = {
  'business-owners': {
    title: 'Business Owners',
    endpoint: 'business-owners',
    description: 'Business owner records only, without family member details.',
    icon: IconBuilding2,
    columns: [
      ['Business Name', 'businessName'],
      ['Business Type', 'businessType'],
      ['Industry', 'industry'],
      ['Designation', 'designation'],
      ['Years in Business', 'yearsInBusiness'],
    ],
  },
  professionals: {
    title: 'Professionals',
    endpoint: 'professionals',
    description: 'Professional records only, without family member details.',
    icon: IconBriefcase,
    columns: [
      ['Profession', 'profession'],
      ['Organization', 'organization'],
      ['Designation', 'designation'],
      ['Employer', 'employer'],
      ['Years of Experience', 'yearsExperience'],
    ],
  },
};

function displayName(person) {
  const name = [person.firstName, person.surname].filter(Boolean).join(' ').trim();
  return name || person.fullName || '—';
}

export default function OccupationList({ type }) {
  const config = LIST_CONFIG[type];
  const Icon = config.icon;
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecords = useCallback(async (page, recordSearch) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/admin/occupations/${config.endpoint}`, {
        params: { page, limit: PAGE_SIZE, search: recordSearch || undefined },
      });
      setRecords(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to load ${config.title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchRecords(1, query);
  }, [fetchRecords, query]);

  const fromRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * PAGE_SIZE + 1;
  const toRecord = Math.min(pagination.page * PAGE_SIZE, pagination.total);

  return (
    <AdminLayout title={config.title}>
      <div className="mb-6">
        <h2 className="font-serif font-black text-navy-900 text-2xl sm:text-3xl leading-tight">
          {config.title}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{config.description}</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <IconAlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <form
        className="mb-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search.trim());
        }}
      >
        <div className="relative flex-1">
          <IconSearch size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${config.title.toLowerCase()} by name, mobile, or work details...`}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-navy-900">{config.title} List</h3>
          <span className="text-xs font-medium text-gray-500">
            {pagination.total} {pagination.total === 1 ? 'record' : 'records'}
          </span>
        </div>
        {loading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={config.columns.length + 2} /></div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={<Icon size={28} />}
            title={`No ${config.title.toLowerCase()} found`}
            description={query ? 'Try a different search.' : `There are no ${config.title.toLowerCase()} records yet.`}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Mobile</th>
                    <th className="px-5 py-3">Occupation</th>
                    {config.columns.map(([label]) => <th key={label} className="px-5 py-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((person) => (
                    <tr key={person._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-semibold text-slate-800">{displayName(person)}</td>
                      <td className="px-5 py-4 text-slate-600">{person.mobileNumber || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{person.occupationType || '—'}</td>
                      {config.columns.map(([, key]) => (
                        <td key={key} className="px-5 py-4 text-slate-600">{person[key] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
              <span className="text-xs text-gray-500">
                Showing {fromRecord}–{toRecord} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchRecords(pagination.page - 1, query)}
                  disabled={loading || pagination.page <= 1}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
                <button
                  type="button"
                  onClick={() => fetchRecords(pagination.page + 1, query)}
                  disabled={loading || pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        {loading && <div className="flex justify-center pb-4"><Spinner label={`Loading ${config.title.toLowerCase()}...`} /></div>}
      </div>
    </AdminLayout>
  );
}
