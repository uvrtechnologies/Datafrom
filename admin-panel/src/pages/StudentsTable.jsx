import React, { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable, Spinner } from '../components/common/LoadingState';
import { IconAlertCircle, IconGraduationCap, IconSearch } from '../components/common/Icons';
import api from '../services/api';

const PAGE_SIZE = 20;

function studentName(student) {
  const name = [student.firstName, student.surname].filter(Boolean).join(' ').trim();
  return name || student.fullName || '—';
}

export default function StudentsTable() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudents = useCallback(async (page, studentSearch) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/students', {
        params: { page, limit: PAGE_SIZE, search: studentSearch || undefined },
      });
      setStudents(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(1, query);
  }, [fetchStudents, query]);

  const fromStudent = pagination.total === 0 ? 0 : (pagination.page - 1) * PAGE_SIZE + 1;
  const toStudent = Math.min(pagination.page * PAGE_SIZE, pagination.total);

  return (
    <AdminLayout title="Students">
      <div className="mb-6">
        <h2 className="font-serif font-black text-navy-900 text-2xl sm:text-3xl leading-tight">
          Students
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Student records only, with no family record details.
        </p>
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
            placeholder="Search students by name, mobile, or education..."
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
          <h3 className="font-semibold text-navy-900">Student List</h3>
          <span className="text-xs font-medium text-gray-500">{pagination.total} students</span>
        </div>
        {loading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={6} /></div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={<IconGraduationCap size={28} />}
            title="No students found"
            description={query ? 'Try a different search.' : 'There are no student records yet.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Mobile</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3">Age / Date of Birth</th>
                    <th className="px-5 py-3">Education Level</th>
                    <th className="px-5 py-3">Institute</th>
                    <th className="px-5 py-3">Class / Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => (
                    <tr key={student.studentId} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-semibold text-slate-800">{studentName(student)}</td>
                      <td className="px-5 py-4 text-slate-600">{student.mobileNumber || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{student.gender || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{student.dateOfBirthOrAge || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{student.educationDetails?.educationLevel || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{student.educationDetails?.instituteName || '—'}</td>
                      <td className="px-5 py-4 text-slate-600">{student.educationDetails?.classOrYear || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
              <span className="text-xs text-gray-500">
                Showing {fromStudent}–{toStudent} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchStudents(pagination.page - 1, query)}
                  disabled={loading || pagination.page <= 1}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">Page {pagination.page} of {Math.max(pagination.totalPages, 1)}</span>
                <button
                  type="button"
                  onClick={() => fetchStudents(pagination.page + 1, query)}
                  disabled={loading || pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        {loading && <div className="flex justify-center pb-4"><Spinner label="Loading students..." /></div>}
      </div>
    </AdminLayout>
  );
}
