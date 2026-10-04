import React, { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  IconArrowLeft, IconTrash2, IconEdit, IconUser, IconHome, IconBriefcase,
  IconUsers, IconFileText, IconCalendar, IconMapPin,
  IconBuilding2, IconGraduationCap,
  IconAlertCircle, IconLoader2, IconXCircle, IconCheck,
} from '../components/common/Icons';
import StatusBadge from '../components/common/StatusBadge';
import { SkeletonStatGrid } from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';
import FamilyEditForm from '../components/FamilyEditForm';

function KV({ label, value }) {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
  return (
    <div className="grid grid-cols-12 gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
      <div className="col-span-12 sm:col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider pt-0.5">{label}</div>
      <div className="col-span-12 sm:col-span-8 text-sm text-slate-800 font-medium leading-relaxed break-words">{displayValue}</div>
    </div>
  );
}

function DetailCard({ title, icon, accent = 'slate', children, className = '' }) {
  const accents = {
    slate: 'bg-slate-50 text-slate-600 ring-slate-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-900/[0.03] overflow-hidden ${className}`}>
      <header className="flex items-center gap-3 px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/40">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ring-1 ring-inset ${accents[accent]}`}>
          {icon}
        </div>
        <h3 className="font-bold text-slate-900 tracking-tight">{title}</h3>
      </header>
      <div className="px-5 sm:px-6 py-1">
        {children}
      </div>
    </section>
  );
}

function buildFullName(firstName, surname, legacyFullName) {
  const fn = String(firstName || '').trim();
  const sn = String(surname || '').trim();
  if (fn && sn) return `${fn} ${sn}`;
  if (fn) return fn;
  if (sn) return sn;
  return String(legacyFullName || '').trim();
}

function memberDisplayName(m) {
  if (!m) return '';
  return m._displayName || buildFullName(m.firstName, m.surname, m.fullName) || m.fullName || m.name || '';
}

function familyRelation(m) {
  if (m.relation === 'Other' && m.otherRelationship) return `Other · ${m.otherRelationship}`;
  return m.relation || '—';
}

function familyStatus(m) {
  if (m.workStatus === 'Other' && m.otherStatus) return `Other · ${m.otherStatus}`;
  return m.workStatus || 'Unspecified';
}

function hasMemberValue(...values) {
  return values.some((value) => value !== null && value !== undefined
    && (typeof value !== 'string' || value.trim() !== ''));
}

function detailLabel(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function flattenDetailFields(data, prefix = '', fields = []) {
  if (!data || typeof data !== 'object') return fields;
  Object.entries(data).forEach(([key, value]) => {
    if (key.startsWith('_') || key === '__v' || value === null || value === undefined) return;
    const label = prefix ? `${prefix} / ${detailLabel(key)}` : detailLabel(key);
    if (typeof value === 'string' && !value.trim()) return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (entry && typeof entry === 'object') {
          flattenDetailFields(entry, `${label} ${index + 1}`, fields);
        } else if (entry !== null && entry !== undefined && String(entry).trim()) {
          fields.push([`${label} ${index + 1}`, entry]);
        }
      });
    } else if (typeof value === 'object') {
      flattenDetailFields(value, label, fields);
    } else {
      fields.push([label, value]);
    }
  });
  return fields;
}

function MainMemberDetails({ record }) {
  const sections = [
    { title: 'Personal Details', icon: <IconUser size={17} />, accent: 'sky', data: record.mainMember },
    { title: 'Address Details', icon: <IconMapPin size={17} />, accent: 'brand', data: record.address },
    { title: 'Work, Business & Education', icon: <IconBriefcase size={17} />, accent: 'amber', data: record.businessWork },
    { title: 'Additional Information', icon: <IconFileText size={17} />, accent: 'purple', data: record.additionalInfo },
  ];

  return (
    <div className="px-4 pb-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900">
            {buildFullName(record.mainMember?.firstName, record.mainMember?.surname, record.mainMember?.fullName) || 'Main Member'} · Details
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">Complete available details for the main member only.</p>
        </div>
      </div>

      <div className="space-y-3">
        {sections.map(({ title, icon, accent, data }) => {
          const fields = flattenDetailFields(data);
          if (!fields.length) return null;
          return (
            <DetailCard key={title} title={title} icon={icon} accent={accent}>
              {fields.map(([label, value]) => (
                <KV key={label} label={label} value={value} />
              ))}
            </DetailCard>
          );
        })}
      </div>
    </div>
  );
}

function MemberDetails({ m, onClose }) {
  const wd = m.workDetails || {};
  const bd = m.businessDetails || {};
  const ed = m.educationDetails || {};
  return (
    <div className="px-4 pb-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900">{memberDisplayName(m) || 'Family Member'} · Details</h4>
          <p className="mt-0.5 text-xs text-slate-500">Only details for this family member are shown.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
        >
          <IconArrowLeft size={15} /> Back to Family Members
        </button>
      </div>

      <div className="space-y-3">
        {hasMemberValue(m.firstName, m.surname, m.fullName, m.dateOfBirthOrAge, m.gender, m.mobileNumber) && (
          <DetailCard title="Personal Details" icon={<IconUser size={17} />} accent="sky">
            <KV label="Full Name" value={memberDisplayName(m)} />
            <KV label="First Name" value={m.firstName} />
            <KV label="Surname" value={m.surname} />
            <KV label="Date of Birth / Age" value={m.dateOfBirthOrAge} />
            <KV label="Gender" value={m.gender} />
            <KV label="Mobile Number" value={m.mobileNumber} />
          </DetailCard>
        )}

        {hasMemberValue(m.relation, m.otherRelationship, m.maritalStatus, m.engagementStatus) && (
          <DetailCard title="Relation & Marital Details" icon={<IconUsers size={17} />} accent="purple">
            <KV label="Relation" value={m.relation} />
            <KV label="Other Relationship" value={m.otherRelationship} />
            <KV label="Marital Status" value={m.maritalStatus} />
            <KV label="Engagement Status" value={m.engagementStatus} />
          </DetailCard>
        )}

        {hasMemberValue(m.workStatus, m.otherStatus, wd.occupation, wd.organization, wd.designation, wd.otherDetails) && (
          <DetailCard title="Work Details" icon={<IconBriefcase size={17} />} accent="sky">
            <KV label="Work Status" value={m.workStatus} />
            <KV label="Other Status" value={m.otherStatus} />
            <KV label="Occupation" value={wd.occupation} />
            <KV label="Organization" value={wd.organization} />
            <KV label="Designation" value={wd.designation} />
            <KV label="Other Work Details" value={wd.otherDetails} />
          </DetailCard>
        )}

        {hasMemberValue(bd.businessName, bd.businessType, bd.otherDetails) && (
          <DetailCard title="Business Details" icon={<IconBuilding2 size={17} />} accent="amber">
            <KV label="Business Name" value={bd.businessName} />
            <KV label="Business Type" value={bd.businessType} />
            <KV label="Other Business Details" value={bd.otherDetails} />
          </DetailCard>
        )}

        {hasMemberValue(m.educationLevel, ed.instituteName, ed.educationLevel, ed.classOrYear, ed.streamOrSubject, ed.courseOrDegree, ed.otherSubjectOrCourse, ed.educationStatus, ed.resultType, ed.percentage, ed.cgpa, ed.educationName) && (
          <DetailCard title="Education Details" icon={<IconGraduationCap size={17} />} accent="emerald">
            <KV label="Education Level" value={m.educationLevel} />
            <KV label="School / College" value={ed.instituteName} />
            <KV label="Education Level (Details)" value={ed.educationLevel} />
            <KV label="Class / Year" value={ed.classOrYear} />
            <KV label="Stream / Subject" value={ed.streamOrSubject} />
            <KV label="Course / Degree" value={ed.courseOrDegree} />
            <KV label="Other Subject / Course" value={ed.otherSubjectOrCourse} />
            <KV label="Education Status" value={ed.educationStatus} />
            <KV label="Result Type" value={ed.resultType} />
            <KV label="Percentage" value={ed.percentage} />
            <KV label="CGPA" value={ed.cgpa} />
            <KV label="Education Name" value={ed.educationName} />
          </DetailCard>
        )}

        {hasMemberValue(m.jobProfession, m.companyBusinessName, m.designation, m.annualIncome) && (
          <DetailCard title="Original Record Details (Legacy)" icon={<IconFileText size={17} />} accent="slate">
            <KV label="Original Occupation" value={m.jobProfession} />
            <KV label="Original Workplace" value={m.companyBusinessName} />
            <KV label="Original Designation" value={m.designation} />
            <KV label="Annual Income" value={m.annualIncome} />
          </DetailCard>
        )}

        {hasMemberValue(m.achievements, m.additionalRemarks, m.startupPlan) && (
          <DetailCard title="Achievements & Additional Information" icon={<IconFileText size={17} />} accent="purple">
            <KV label="Achievements" value={m.achievements} />
            <KV label="Additional Remarks" value={m.additionalRemarks} />
            <KV label="Startup Plan" value={m.startupPlan} />
          </DetailCard>
        )}

        {!hasMemberValue(
          m.firstName, m.surname, m.fullName, m.dateOfBirthOrAge, m.gender, m.mobileNumber,
          m.relation, m.otherRelationship, m.maritalStatus, m.engagementStatus, m.workStatus,
          m.otherStatus, wd.occupation, wd.organization, wd.designation, wd.otherDetails,
          bd.businessName, bd.businessType, bd.otherDetails, m.educationLevel, ed.instituteName,
          ed.educationLevel, ed.classOrYear, ed.streamOrSubject, ed.courseOrDegree,
          ed.otherSubjectOrCourse, ed.educationStatus, ed.resultType, ed.percentage, ed.cgpa,
          ed.educationName, m.jobProfession, m.companyBusinessName, m.designation, m.annualIncome,
          m.achievements, m.additionalRemarks, m.startupPlan
        ) && (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm italic text-slate-500 ring-1 ring-inset ring-slate-100">
            No additional details recorded for this member.
          </p>
        )}
      </div>
    </div>
  );
}

function MemberRow({ m, idx, onView }) {
  return (
    <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50/50">
        <td className="px-3 sm:px-4 py-3.5">
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            View
          </button>
        </td>
        <td className="px-3 sm:px-4 py-3.5 align-top">
          <div className="text-xs font-mono text-slate-400">#{String(idx + 1).padStart(2, '0')}</div>
        </td>
        <td className="px-3 sm:px-4 py-3.5 align-top">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{memberDisplayName(m) || '(no name)'}</span>
            {m._isLegacyChild && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200">
                Legacy Child
              </span>
            )}
          </div>
        </td>
        <td className="px-3 sm:px-4 py-3.5 align-top text-sm text-slate-700">{familyRelation(m)}</td>
        <td className="px-3 sm:px-4 py-3.5 align-top text-sm text-slate-600">{m.dateOfBirthOrAge || '—'}</td>
        <td className="px-3 sm:px-4 py-3.5 align-top text-sm text-slate-600">{m.gender || '—'}</td>
        <td className="px-3 sm:px-4 py-3.5 align-top text-sm text-slate-600">{m.maritalStatus || '—'}</td>
        <td className="px-3 sm:px-4 py-3.5 align-top">
          <StatusBadge status={familyStatus(m)} />
        </td>
        <td className="px-3 sm:px-4 py-3.5 align-top text-sm text-slate-700">
          {m.workDetails?.occupation || m.businessDetails?.businessName || m.jobProfession || '—'}
        </td>
        <td className="px-3 sm:px-4 py-3.5 align-top text-sm text-slate-700">
          {m.educationDetails?.educationLevel || m.educationDetails?.classOrYear || m.educationDetails?.instituteName || m.educationDetails?.resultType || m.educationDetails?.educationName || m.educationDetails?.percentage || m.educationDetails?.cgpa ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <IconGraduationCap size={13} />
              {m.educationDetails?.educationLevel || m.educationDetails?.classOrYear || 'Student'}
            </span>
          ) : '—'}
        </td>
    </tr>
  );
}

export default function FamilyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/admin/families/${id}`);
        if (active) setRecord(data.data);
      } catch (e) {
        if (active) setError(e.response?.data?.message || 'Could not load record.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/families/${id}`);
      navigate('/families', { replace: true, state: { toast: 'Family record deleted successfully.' } });
    } catch (e) {
      setError(e.response?.data?.message || 'Delete failed. Please try again.');
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleSaved = (updated) => {
    setRecord(updated);
    setEditing(false);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-2">
              <div className="h-3 w-40 bg-slate-200 animate-pulse rounded-md" />
              <div className="h-7 w-72 bg-slate-200 animate-pulse rounded-md" />
              <div className="h-4 w-56 bg-slate-200 animate-pulse rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 bg-slate-200 animate-pulse rounded-lg" />
              <div className="h-9 w-9 bg-slate-200 animate-pulse rounded-lg" />
              <div className="h-9 w-24 bg-slate-200 animate-pulse rounded-lg" />
            </div>
          </div>
          <SkeletonStatGrid count={4} />
          <div className="h-[420px] bg-white rounded-2xl border border-slate-200/70 animate-pulse" />
        </div>
      </AdminLayout>
    );
  }

  if (error && !record) {
    return (
      <AdminLayout>
        <EmptyState
          icon={<IconXCircle size={34} />}
          title="Could not load record"
          description={error}
          action={
            <RouterLink
              to="/families"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/20 transition-all"
            >
              <IconArrowLeft size={15} /> Back to All Records
            </RouterLink>
          }
          className="min-h-[50vh]"
        />
      </AdminLayout>
    );
  }

  if (!record) {
    return (
      <AdminLayout>
        <EmptyState
          icon={<IconAlertCircle size={34} />}
          title="Record not found"
          description="The family record you are looking for may have been deleted or does not exist."
          action={
            <RouterLink
              to="/families"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 focus:ring-4 focus:ring-brand-500/20 transition-all"
            >
              <IconArrowLeft size={15} /> Back to All Records
            </RouterLink>
          }
          className="min-h-[50vh]"
        />
      </AdminLayout>
    );
  }

  const mm = record.mainMember || {};
  const familyMembers = record.familyMembersLegacyMerged || record.familyMembers || [];
  const headerName = buildFullName(mm.firstName, mm.surname, mm.fullName) || 'Unnamed Record';

  return (
    <AdminLayout>
      {editing && <FamilyEditForm record={record} onCancel={() => setEditing(false)} onSaved={handleSaved} />}
      <div className="space-y-6 lg:space-y-7">
        {/* Header / Action Bar */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-[0.15em]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Family Record · <span className="font-mono text-brand-700">{record.submissionId || record._id}</span>
            </div>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-tight break-words">
              {headerName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar size={14} />
                Submitted: <span className="font-medium text-slate-700">{new Date(record.createdAt || Date.now()).toLocaleString()}</span>
              </span>
              {record.updatedAt && record.updatedAt !== record.createdAt && (
                <span className="inline-flex items-center gap-1.5">
                  <IconEdit size={14} />
                  Updated: <span className="font-medium text-slate-700">{new Date(record.updatedAt).toLocaleString()}</span>
                </span>
              )}
              {record.status && (
                <span>
                  <StatusBadge status={record.status} />
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RouterLink
              to="/families"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-4 focus:ring-slate-500/10 transition-all"
            >
              <IconArrowLeft size={15} /> All Records
            </RouterLink>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-100 transition-all"
            >
              <IconEdit size={15} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 focus:ring-4 focus:ring-rose-500/10 transition-all"
            >
              <IconTrash2 size={15} /> Delete
            </button>
          </div>
        </div>

        {/* Delete confirmation strip */}
        {deleteConfirm && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 ring-1 ring-inset ring-rose-200">
                <IconAlertCircle size={18} />
              </div>
              <div>
                <div className="font-bold text-rose-900 text-sm">Permanently delete this family record?</div>
                <div className="text-sm text-rose-700/80 mt-0.5">This action cannot be undone. All associated family members, work and education details will be removed.</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 focus:ring-4 focus:ring-rose-500/20 disabled:opacity-60 transition-all"
              >
                {deleting ? (
                  <>
                    <IconLoader2 size={14} /> Deleting…
                  </>
                ) : (
                  <>
                    <IconCheck size={14} /> Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3">
            <IconAlertCircle size={17} className="mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <DetailCard title="Main Member" icon={<IconUser size={18} />} accent="brand">
          <MainMemberDetails record={record} />
        </DetailCard>

        {/* Family members table */}
        <DetailCard
            title={`Family Members (${familyMembers.length})`}
            icon={<IconUsers size={18} />}
            accent="emerald"
            className="overflow-hidden"
          >
            {typeof selectedMemberIndex === 'number' && familyMembers[selectedMemberIndex] ? (
              <MemberDetails
                m={familyMembers[selectedMemberIndex]}
                onClose={() => setSelectedMemberIndex(null)}
              />
            ) : familyMembers.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<IconHome size={32} />}
                title="No family members on record"
                description="Only the main member was submitted for this family record."
                className="!py-4 !border-0 !shadow-none !bg-transparent"
              />
            </div>
          ) : (
            <div className="py-4">
                <p className="mb-3 text-sm text-slate-500">
                  View details for an individual family member.
                </p>

                {/* Desktop / Tablet Table */}
                <div className="hidden md:block -mx-5 sm:-mx-6 overflow-x-auto">
                <div className="min-w-[960px] px-5 sm:px-6">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="text-left">
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Action</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">#</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Name</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Relation</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Age</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Gender</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Marital Status</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Work / Business</th>
                        <th className="px-3 sm:px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Education</th>
                      </tr>
                    </thead>
                    <tbody>
                      {familyMembers.map((m, i) => (
                        <MemberRow
                          key={m._id || i}
                          m={m}
                          idx={i}
                          onView={() => setSelectedMemberIndex(i)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile stacked cards */}
              <div className="md:hidden space-y-3">
                {familyMembers.map((m, i) => (
                    <div key={m._id || i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <div className="px-4 py-3.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-slate-400">#{String(i + 1).padStart(2, '0')}</span>
                              <span className="text-sm font-bold text-slate-900">{memberDisplayName(m) || '(no name)'}</span>
                              {m._isLegacyChild && (
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200">
                                  Legacy Child
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                              <span>Relation: <span className="font-semibold text-slate-800">{familyRelation(m)}</span></span>
                              <span>Age: <span className="font-semibold text-slate-800">{m.dateOfBirthOrAge || '—'}</span></span>
                              <span>Marital: <span className="font-semibold text-slate-800">{m.maritalStatus || '—'}</span></span>
                              {m.maritalStatus === 'Single' && <span>Engaged: <span className="font-semibold text-slate-800">{m.engagementStatus || '—'}</span></span>}
                              <span className="inline-flex items-center"><StatusBadge status={familyStatus(m)} /></span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedMemberIndex(i)}
                            className="inline-flex flex-shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
            )}
        </DetailCard>

        <footer className="pt-2 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>Record ID: <span className="font-mono">{record._id}</span></span>
          <span>DataSync Pro · Admin Console</span>
        </footer>
      </div>
    </AdminLayout>
  );
}
