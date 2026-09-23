import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { SkeletonStatGrid, SkeletonTable } from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import ChartCard from '../components/common/ChartCard';
import {
  IconDatabase,
  IconCalendar,
  IconTrendingUp,
  IconBuilding2,
  IconBriefcase,
  IconUsers,
  IconGraduationCap,
  IconAlertCircle,
  IconChevronRight,
  IconSearch,
  IconUser,
} from '../components/common/Icons';

function Chart({ data, color, topN = 10 }) {
  const trimmed = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((d) => ({ name: d._id || 'Unknown', count: d.count }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={trimmed} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={55}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ fill: '#f3f4f6' }}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill={color} radius={[6, 6, 0, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/admin/dashboard/stats')
      .then((res) => {
        if (active) setData(res.data.data);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load dashboard stats.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif font-black text-navy-900 text-2xl sm:text-3xl leading-tight">
            Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Summary of all collected family and business information.
          </p>
        </div>
        <div className="text-xs text-gray-400 font-medium">
          {data && (
            <>
              Updated <span className="text-gray-600">{new Date().toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <IconAlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm text-red-700">Could not load dashboard</div>
            <div className="text-sm text-red-600 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !error && (
        <div className="space-y-6">
          <SkeletonStatGrid count={8} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <SkeletonTable rows={6} cols={4} />
            <SkeletonTable rows={6} cols={4} />
          </div>
          <SkeletonTable rows={6} cols={6} />
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6 lg:space-y-8">
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            <StatCard
              label="Total Records"
              value={data.cards.totalRecords}
              icon={<IconDatabase size={20} />}
              trend={`${data.cards.weekChangePct >= 0 ? '+' : ''}${data.cards.weekChangePct}% this week`}
              trendPositive={data.cards.weekChangePct >= 0}
              iconBg="bg-brand-50"
              iconColor="text-brand-600"
            />
            <StatCard
              label="Submitted Today"
              value={data.cards.submittedToday}
              icon={<IconCalendar size={20} />}
              trend="Today"
              trendPositive
              trendColor="bg-gray-50 text-gray-600"
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
            />
            <StatCard
              label="This Month"
              value={data.cards.submittedThisMonth ?? 0}
              icon={<IconTrendingUp size={20} />}
              trend="Current month"
              trendPositive
              trendColor="bg-emerald-50 text-emerald-700"
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              label="This Week"
              value={data.cards.submittedThisWeek ?? 0}
              icon={<IconCalendar size={20} />}
              trend="Last 7 days"
              trendColor="bg-blue-50 text-blue-700"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              label="Business Owners"
              value={data.cards.businessOwners}
              icon={<IconBuilding2 size={20} />}
              iconBg="bg-amber-50"
              iconColor="text-amber-700"
            />
            <StatCard
              label="Professionals"
              value={data.cards.professionals}
              icon={<IconBriefcase size={20} />}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
            />
            <StatCard
              label="Family Members"
              value={data.cards.totalFamilyMembers ?? 0}
              icon={<IconUsers size={20} />}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
            <StatCard
              label="Students"
              value={data.cards.totalStudents ?? 0}
              icon={<IconGraduationCap size={20} />}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-700"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <ChartCard
                title="Records by City"
                subtitle="Cities with the most family records"
              height={280}
              action={
                <button
                  onClick={() => navigate('/analytics')}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center"
                >
                  Analytics <IconChevronRight size={14} />
                </button>
              }
            >
              <Chart data={data.charts.byCity} color="#2540bf" topN={10} />
            </ChartCard>
            <ChartCard
              title="Records by Occupation"
              subtitle="Head-of-family occupation breakdown"
              height={280}
            >
              <Chart data={data.charts.byOccupation} color="#f59e0b" topN={10} />
            </ChartCard>
          </div>

          {/* Recent Submissions Table */}
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-serif font-bold text-navy-900 text-lg leading-tight">
                  Recent Submissions
                </h3>
                <p className="mt-1 text-xs text-gray-500">Latest 5 records received.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/families')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors"
              >
                View All Records
                <IconChevronRight size={14} />
              </button>
            </div>

            {(!data.recentSubmissions || data.recentSubmissions.length === 0) ? (
              <EmptyState
                icon={<IconUser size={22} />}
                title="No recent submissions"
                description="New submissions will appear here as they are received."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 text-left text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                      <th className="px-5 sm:px-6 py-3.5">Record ID</th>
                      <th className="px-5 sm:px-6 py-3.5">Main Member</th>
                      <th className="px-5 sm:px-6 py-3.5 hidden sm:table-cell">Occupation</th>
                      <th className="px-5 sm:px-6 py-3.5">Status</th>
                      <th className="px-5 sm:px-6 py-3.5 hidden md:table-cell">Submitted</th>
                      <th className="px-5 sm:px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.recentSubmissions.map((r) => (
                      <tr
                        key={r.submissionId}
                        onClick={() =>
                          navigate(`/families?search=${encodeURIComponent(r.submissionId)}`)
                        }
                        className="hover:bg-brand-50/30 cursor-pointer transition-colors"
                      >
                        <td className="px-5 sm:px-6 py-4 font-mono text-[12px] font-bold text-brand-700 whitespace-nowrap">
                          #{r.submissionId}
                        </td>
                        <td className="px-5 sm:px-6 py-4">
                          <div className="font-semibold text-navy-900 truncate max-w-[200px]">
                            {r.name || '—'}
                          </div>
                        </td>
                        <td className="px-5 sm:px-6 py-4 hidden sm:table-cell">
                          <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-lg bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200 whitespace-nowrap">
                            {r.occupationType || 'Unspecified'}
                          </span>
                        </td>
                        <td className="px-5 sm:px-6 py-4">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-xs text-gray-500 hidden md:table-cell whitespace-nowrap">
                          {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 sm:px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/families?search=${encodeURIComponent(r.submissionId)}`
                              );
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                          >
                            <IconSearch size={13} />
                            Find
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
