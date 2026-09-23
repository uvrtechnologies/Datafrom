import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';
import StatusBadge from '../components/common/StatusBadge';
import { Spinner, SkeletonTable } from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import {
  IconSearch,
  IconSlidersHorizontal,
  IconFileSpreadsheet,
  IconFileText,
  IconEye,
  IconTrash2,
  IconChevronLeft,
  IconChevronRight,
  IconSortAsc,
  IconSortDesc,
  IconX,
  IconFilter,
  IconDatabase,
  IconCalendar,
  IconAlertCircle,
  IconCheck,
  IconUsers,
} from '../components/common/Icons';

const OCCUPATION_TYPES = [
  'Business Owner',
  'Job / Employee',
  'Self Employed',
  'Professional',
  'Farmer',
  'Student',
  'Retired',
  'Not Working',
  'Other',
];

const WORK_STATUSES = ['Working', 'Business', 'Farmer', 'Housewife', 'Not Working', 'Student', 'Retired', 'Other'];

const SORTABLE_COLUMNS = {
  submissionId: { key: 'submissionId', label: 'Record ID' },
  mainMember: { key: 'mainMember.fullName', label: 'Main Member' },
  createdAt: { key: 'createdAt', label: 'Submitted' },
};

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-full hover:bg-brand-100 text-brand-500"
      >
        <IconX size={11} />
      </button>
    </span>
  );
}

function pageWindow(current, total) {
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}

export default function FamiliesTable() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [exportLoading, setExportLoading] = useState({ csv: false, xlsx: false });

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    city: '',
    village: '',
    occupationType: '',
    businessType: '',
    workStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  const [sort, setSort] = useState({ by: 'createdAt', dir: 'desc' });

  // Sync search param to state on mount
  useEffect(() => {
    const s = searchParams.get('search');
    if (s) setSearch(s);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRows = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          limit: pagination.limit,
          search: search.trim() || undefined,
          city: filters.city || undefined,
          village: filters.village || undefined,
          occupationType: filters.occupationType || undefined,
          businessType: filters.businessType || undefined,
          workStatus: filters.workStatus || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
          sortBy: sort.by,
          sortDir: sort.dir,
        };
        Object.keys(params).forEach(
          (k) => (params[k] === undefined || params[k] === '') && delete params[k]
        );
        const { data } = await api.get('/admin/families', { params });
        setRows(data.data);
        setPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages || 1,
          total: data.pagination.total,
          limit: data.pagination.limit,
        });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load records.');
      } finally {
        setLoading(false);
      }
    },
    [search, filters, sort, pagination.limit]
  );

  useEffect(() => {
    fetchRows(1);
  }, [fetchRows]);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (search) chips.push({ key: 'search', label: `Search: ${search}` });
    if (filters.city) chips.push({ key: 'city', label: `City: ${filters.city}` });
    if (filters.village) chips.push({ key: 'village', label: `Village: ${filters.village}` });
    if (filters.occupationType) chips.push({ key: 'occ', label: `Occupation: ${filters.occupationType}` });
    if (filters.businessType) chips.push({ key: 'biz', label: `Business: ${filters.businessType}` });
    if (filters.workStatus) chips.push({ key: 'ws', label: `Work Status: ${filters.workStatus}` });
    if (filters.dateFrom) chips.push({ key: 'df', label: `From: ${filters.dateFrom}` });
    if (filters.dateTo) chips.push({ key: 'dt', label: `To: ${filters.dateTo}` });
    return chips;
  }, [search, filters]);

  const clearAll = () => {
    setSearch('');
    setFilters({ city: '', village: '', occupationType: '', businessType: '', workStatus: '', dateFrom: '', dateTo: '' });
    setSort({ by: 'createdAt', dir: 'desc' });
    setSearchParams({});
  };

  const fetchAllFiltered = async () => {
    const params = {
      page: 1,
      limit: 100000,
      search: search.trim() || undefined,
      city: filters.city || undefined,
      village: filters.village || undefined,
      occupationType: filters.occupationType || undefined,
      businessType: filters.businessType || undefined,
      workStatus: filters.workStatus || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    };
    Object.keys(params).forEach(
      (k) => (params[k] === undefined || params[k] === '') && delete params[k]
    );
    const { data } = await api.get('/admin/families', { params });
    return data.data.map((r) => ({
      submissionId: r.submissionId,
      familyKey: r.familyKey,
      firstName: r.mainMemberFirstName,
      surname: r.mainMemberSurname,
      mainMemberName: r.mainMemberName,
      mobileNumber: r.mobileNumber,
      villageCity: [r.village, r.city].filter(Boolean).join(', '),
      numberOfFamilyMembers: r.numberOfFamilyMembers,
      numberOfBusinesses: r.occupationType === 'Business Owner' ? 1 : 0,
      submissionDate: r.submissionDate,
      status: r.status,
    }));
  };

  const doExport = async (type) => {
    try {
      setExportLoading((s) => ({ ...s, [type]: true }));
      const all = await fetchAllFiltered();
      if (type === 'xlsx') exportToExcel(all);
      if (type === 'csv') exportToCSV(all);
    } finally {
      setExportLoading((s) => ({ ...s, [type]: false }));
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this family record? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/families/${id}`);
      fetchRows(pagination.page);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete record.');
    }
  };

  const toggleSort = (colKey) => {
    setSort((cur) => {
      if (cur.by === colKey) {
        return { by: colKey, dir: cur.dir === 'desc' ? 'asc' : 'desc' };
      }
      return { by: colKey, dir: 'desc' };
    });
  };

  const SortIcon = ({ col }) =>
    sort.by === SORTABLE_COLUMNS[col]?.key ? (
      sort.dir === 'desc' ? (
        <IconSortDesc size={13} className="inline-block text-brand-600" />
      ) : (
        <IconSortAsc size={13} className="inline-block text-brand-600" />
      )
    ) : (
      <IconSortAsc size={13} className="inline-block text-gray-300 opacity-70 group-hover:opacity-100" />
    );

  const fromRecord = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const toRecord = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <AdminLayout title="All Family Records">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif font-black text-navy-900 text-2xl sm:text-3xl leading-tight">
            Family Records
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage, search, and review all submitted data collection records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => doExport('csv')}
            disabled={exportLoading.csv}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-60 transition-all shadow-sm"
          >
            {exportLoading.csv ? <Spinner size={15} /> : <IconFileText size={16} />}
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => doExport('xlsx')}
            disabled={exportLoading.xlsx}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60 transition-all shadow-sm"
          >
            {exportLoading.xlsx ? <Spinner size={15} /> : <IconFileSpreadsheet size={16} />}
            Export Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm">
          <IconAlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Search Bar + Toggle */}
      <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchRows(1)}
            placeholder="Search by name, mobile, record ID, city…"
            className="w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 py-3.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all shadow-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-semibold transition-all shadow-sm ${
            showFilters || activeFilters.length > 0
              ? 'bg-brand-600 border-brand-600 text-white shadow-brand-600/20 hover:bg-brand-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          {showFilters ? (
            <>
              <IconSlidersHorizontal size={16} />
              Hide Filters
            </>
          ) : (
            <>
              <IconFilter size={16} />
              Show Filters
              {activeFilters.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-white text-brand-700 text-[10px] font-bold">
                  {activeFilters.length}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((c) => (
            <FilterChip
              key={c.key}
              label={c.label}
              onRemove={() => {
                if (c.key === 'search') {
                  setSearch('');
                  setSearchParams({});
                } else {
                  setFilters((f) => ({
                    ...f,
                    [c.key === 'occ' ? 'occupationType' : c.key === 'biz' ? 'businessType' : c.key === 'ws' ? 'workStatus' : c.key === 'df' ? 'dateFrom' : c.key === 'dt' ? 'dateTo' : c.key]:
                      '',
                  }));
                }
              }}
            />
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-bold text-gray-500 hover:text-gray-700 ml-1"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="mb-5 bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2">
              <IconSlidersHorizontal size={16} />
              Filters
            </h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              Reset all
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                City
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                placeholder="e.g. Pune"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                Village
              </label>
              <input
                type="text"
                value={filters.village}
                onChange={(e) => setFilters({ ...filters, village: e.target.value })}
                placeholder="e.g. Simrol"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                Occupation Type
              </label>
              <select
                value={filters.occupationType}
                onChange={(e) => setFilters({ ...filters, occupationType: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none"
              >
                <option value="">All occupations</option>
                {OCCUPATION_TYPES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                Family Member Work Status
              </label>
              <select
                value={filters.workStatus}
                onChange={(e) => setFilters({ ...filters, workStatus: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none"
              >
                <option value="">All statuses</option>
                {WORK_STATUSES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                Business Type
              </label>
              <input
                type="text"
                value={filters.businessType}
                onChange={(e) => setFilters({ ...filters, businessType: e.target.value })}
                placeholder="e.g. Retail"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                Submitted From
              </label>
              <div className="relative">
                <IconCalendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-1.5">
                Submitted To
              </label>
              <div className="relative">
                <IconCalendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 pl-10 pr-3.5 py-2.5 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fetchRows(1)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-700 shadow-sm shadow-brand-600/20 transition-all"
              >
                <IconCheck size={15} />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        {loading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconDatabase size={24} />}
            title="No records found"
            description="Try adjusting your search or filters to see more results."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50/70 text-left text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                  <th
                    scope="col"
                    className="px-5 sm:px-6 py-4 cursor-pointer select-none group"
                    onClick={() => toggleSort('submissionId')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Record ID
                      <SortIcon col="submissionId" />
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="px-5 sm:px-6 py-4 cursor-pointer select-none group"
                    onClick={() => toggleSort('mainMember')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Main Member
                      <SortIcon col="mainMember" />
                    </span>
                  </th>
                  <th scope="col" className="px-5 sm:px-6 py-4">
                    Mobile
                  </th>
                  <th scope="col" className="px-5 sm:px-6 py-4 hidden lg:table-cell">
                    Village / City
                  </th>
                  <th scope="col" className="px-5 sm:px-6 py-4 hidden md:table-cell">
                    Occupation
                  </th>
                  <th scope="col" className="px-5 sm:px-6 py-4">
                    <span className="inline-flex items-center gap-1"><IconUsers size={13} /> Family</span>
                  </th>
                  <th
                    scope="col"
                    className="px-5 sm:px-6 py-4 cursor-pointer select-none group whitespace-nowrap"
                    onClick={() => toggleSort('createdAt')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Submitted
                      <SortIcon col="createdAt" />
                    </span>
                  </th>
                  <th scope="col" className="px-5 sm:px-6 py-4">
                    Status
                  </th>
                  <th scope="col" className="px-5 sm:px-6 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => navigate(`/families/${r._id}`)}
                    className="hover:bg-brand-50/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 sm:px-6 py-4 whitespace-nowrap font-mono text-[12px] font-bold text-brand-700">
                      #{r.submissionId}
                    </td>
                    <td className="px-5 sm:px-6 py-4">
                      <div className="font-semibold text-navy-900 truncate max-w-[220px]">
                        {r.mainMemberName}
                      </div>
                    </td>
                    <td className="px-5 sm:px-6 py-4 text-gray-700 whitespace-nowrap">
                      {r.mobileNumber || '—'}
                    </td>
                    <td className="px-5 sm:px-6 py-4 text-gray-600 hidden lg:table-cell truncate max-w-[140px]">
                      {r.city || '—'}
                    </td>
                    <td className="px-5 sm:px-6 py-4 hidden md:table-cell whitespace-nowrap">
                      {r.occupationType ? (
                        <span className="inline-flex text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200">
                          {r.occupationType}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 sm:px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold ring-1 ring-inset ring-brand-200">
                        {r.numberOfFamilyMembers ?? 0}
                      </span>
                    </td>
                    <td className="px-5 sm:px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {r.submissionDate ? new Date(r.submissionDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 sm:px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/families/${r._id}`);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
                        >
                          <IconEye size={15} />
                        </button>
                        <button
                          type="button"
                          title="Delete record"
                          onClick={(e) => handleDelete(e, r._id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <IconTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-gray-100 px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Showing <span className="font-bold text-gray-700">{fromRecord}</span>–
            <span className="font-bold text-gray-700">{toRecord}</span> of{' '}
            <span className="font-bold text-gray-700">{pagination.total}</span> records
          </div>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => fetchRows(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronLeft size={14} />
              Prev
            </button>
            <div className="mx-1 inline-flex items-center gap-0.5">
              {pageWindow(pagination.page, pagination.totalPages).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => fetchRows(p)}
                  className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                    p === pagination.page
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fetchRows(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <IconChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
