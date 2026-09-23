import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import StatCard from '../components/common/StatCard';
import ChartCard from '../components/common/ChartCard';
import { SkeletonStatGrid } from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import {
  IconDatabase, IconBuilding2, IconUsers, IconGraduationCap,
  IconMapPin, IconBriefcase, IconAlertCircle,
} from '../components/common/Icons';

const STATE_COLORS = ['#2f4ed6', '#4f67e0', '#6b7ee8', '#8795ef', '#a3acf5', '#bfc3fb', '#dbdbff'];
const CITY_COLORS = ['#16a34a', '#22b556', '#2ec762', '#3ad96e', '#46eb7a', '#61f08d', '#7df5a0'];
const OCC_COLORS = ['#f59e0b', '#f7ac26', '#f9ba41', '#fbc85c', '#fdd677', '#ffe492', '#fff2ad'];

function topN(data, n = 12) {
  if (!Array.isArray(data)) return [];
  return [...data].sort((a, b) => Number(b.count || 0) - Number(a.count || 0)).slice(0, n);
}

function prepareChart(raw, n = 12) {
  const arr = topN(raw, n);
  return arr.map((d) => ({ name: d._id || 'Unknown', count: Number(d.count || 0) }));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-lg shadow-slate-900/5 px-3.5 py-2.5 text-sm">
      <div className="font-bold text-slate-900 mb-0.5">{label}</div>
      <div className="text-slate-600 flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full inline-block"
          style={{ background: payload[0]?.payload?.fill || payload[0]?.color || '#2f4ed6' }}
        />
        <span className="font-semibold text-slate-800">{payload[0]?.value?.toLocaleString() || 0}</span>
        <span className="text-slate-500">records</span>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/admin/dashboard/stats')
      .then((res) => { if (active) setData(res.data.data); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Failed to load analytics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-44 bg-slate-200 animate-pulse rounded-md" />
            <div className="h-3 w-80 bg-slate-200 animate-pulse rounded-md" />
          </div>
          <SkeletonStatGrid count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="h-[360px] bg-white rounded-2xl border border-slate-200/70 animate-pulse" />
            <div className="h-[360px] bg-white rounded-2xl border border-slate-200/70 animate-pulse" />
            <div className="h-[360px] bg-white rounded-2xl border border-slate-200/70 lg:col-span-2 animate-pulse" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <EmptyState
          icon={<IconAlertCircle size={34} />}
          title="Failed to load analytics"
          description={error}
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/20 transition-all"
            >
              Reload
            </button>
          }
          className="min-h-[50vh]"
        />
      </AdminLayout>
    );
  }

  const cards = data?.cards || {};
  const charts = data?.charts || {};

  const byVillage = prepareChart(charts.byVillage, 12);
  const byOccupation = prepareChart(charts.byOccupation, 12);
  const byCity = prepareChart(charts.byCity, 16);

  return (
    <AdminLayout>
      <div className="space-y-6 lg:space-y-7">
        <header>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-[0.15em]">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Analytics & Insights
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-tight">
            Data breakdowns across your records
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
            Explore high-level summary statistics and visual breakdowns of all collected family data by
            geography, occupation, and education. All charts are sourced from live database aggregates.
          </p>
        </header>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
          <StatCard
            label="Total Records"
            value={cards.totalRecords ?? 0}
            icon={<IconDatabase size={20} />}
            iconBg="bg-brand-50 text-brand-700 ring-brand-200"
          />
          <StatCard
            label="Business Owners"
            value={cards.businessOwners ?? 0}
            icon={<IconBuilding2 size={20} />}
            iconBg="bg-amber-50 text-amber-700 ring-amber-200"
          />
          <StatCard
            label="Family Members"
            value={cards.totalFamilyMembers ?? 0}
            icon={<IconUsers size={20} />}
            iconBg="bg-emerald-50 text-emerald-700 ring-emerald-200"
          />
          <StatCard
            label="Students"
            value={cards.totalStudents ?? 0}
            icon={<IconGraduationCap size={20} />}
            iconBg="bg-sky-50 text-sky-700 ring-sky-200"
          />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <ChartCard
            title="Records by Village"
            subtitle="Top 12 villages sorted by count"
            height={340}
            icon={<IconMapPin size={16} />}
            accent="sky"
            action={
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {byVillage.length} villages
              </span>
            }
          >
            {byVillage.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState
                  icon={<IconMapPin size={28} />}
                  title="No village data"
                  description="Village-level breakdowns will appear here once data is collected."
                  className="!border-0 !shadow-none !bg-transparent"
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byVillage} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-32}
                    textAnchor="end"
                    height={80}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 6 }} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={34}>
                    {byVillage.map((_, i) => (
                      <Cell key={i} fill={STATE_COLORS[i % STATE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Records by Occupation"
            subtitle="Top 12 occupation categories"
            height={340}
            icon={<IconBriefcase size={16} />}
            accent="amber"
            action={
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {byOccupation.length} categories
              </span>
            }
          >
            {byOccupation.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState
                  icon={<IconBriefcase size={28} />}
                  title="No occupation data"
                  description="Occupation breakdowns will appear here once data is collected."
                  className="!border-0 !shadow-none !bg-transparent"
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byOccupation} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-32}
                    textAnchor="end"
                    height={80}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fef3c7', radius: 6 }} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={34}>
                    {byOccupation.map((_, i) => (
                      <Cell key={i} fill={OCC_COLORS[i % OCC_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard
            title="Records by City / Village"
            subtitle="Top 16 cities sorted by record count"
            height={380}
            icon={<IconMapPin size={16} />}
            accent="emerald"
            action={
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {byCity.length} cities
              </span>
            }
            className="lg:col-span-2"
          >
            {byCity.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState
                  icon={<IconMapPin size={28} />}
                  title="No city data"
                  description="City-level breakdowns will appear here once data is collected."
                  className="!border-0 !shadow-none !bg-transparent"
                />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCity} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={90}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ecfdf5', radius: 6 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={38}>
                    {byCity.map((_, i) => (
                      <Cell key={i} fill={CITY_COLORS[i % CITY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Raw data note */}
        <section className="rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-900 tracking-tight">Need a deeper cut?</h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-2xl">
                Use the advanced search and filter panel on the <span className="font-semibold text-slate-700">Families</span> page to
                slice records by state, city, occupation type, work status, business type, date range and more.
                Results can be exported to Excel or CSV for further analysis.
              </p>
            </div>
            <a
              href="/families"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 focus:ring-4 focus:ring-slate-500/15 transition-all whitespace-nowrap"
            >
              Open Families Table
            </a>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
