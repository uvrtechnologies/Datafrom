import React, { useState } from 'react';
import api from '../services/api';
import { IconCheck, IconLoader2, IconX } from './common/Icons';

const CITIES = ['Depalpur', 'Hatod', 'Indore', 'Mhow', 'Sawer'];
const VILLAGES = [
  'Amba Chandan', 'Berchha', 'Bhicholi', 'Chikhli', 'Choral', 'Datoda', 'Gokanya',
  'Gosi Kheda', 'Gujarkheda (CT)', 'Harsola', 'Hasalpur', 'Joshi Guradiya', 'Kelod',
  'Memdi', 'Mhow Cantt (CB)', 'Mhowgaon (NP)', 'Patal Pani', 'Pathan Pipalya',
  'Shivnagar', 'Simrol', 'Tinchha', 'Jalalpura', 'Asrawad Khurd', 'Kalod Kartal',
  'Machla', 'Mirjapur', 'Morod', 'Ralamandal', 'Tillor Buzurg', 'Tillor Khurd',
  'Ujjaini', 'Umri Kheda',
];
const RELATIONS = ['Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced'];
const WORK_STATUSES = ['Working', 'Business', 'Not Working', 'Student', 'Retired', 'Other'];
const OCCUPATIONS = ['Business Owner', 'Job / Employee', 'Self Employed', 'Professional', 'Farmer', 'Student', 'Retired', 'Not Working', 'Other'];
const EDUCATION_LEVELS = ['Primary School', 'Secondary School', 'Higher Secondary', 'Diploma', 'Undergraduate', 'Postgraduate', 'Other'];

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none';
const emptyWork = () => ({ occupation: '', organization: '', designation: '', otherDetails: '' });
const emptyBusiness = () => ({ businessName: '', businessType: '', otherDetails: '' });
const emptyEducation = () => ({ instituteName: '', educationLevel: '', classOrYear: '', streamOrSubject: '', courseOrDegree: '', otherSubjectOrCourse: '', educationStatus: '' });

function cloneRecord(record) {
  const mainMember = { ...(record.mainMember || {}) };
  const current = { addressLine1: '', village: '', city: '', ...(record.address?.current || {}) };
  const permanent = { addressLine1: '', village: '', city: '', ...(record.address?.permanent || {}) };
  const familyMembers = (record.familyMembers || []).map((member) => ({
    ...member,
    workDetails: { ...emptyWork(), ...(member.workDetails || {}) },
    businessDetails: { ...emptyBusiness(), ...(member.businessDetails || {}) },
    educationDetails: { ...emptyEducation(), ...(member.educationDetails || {}) },
  }));
  return {
    mainMember,
    address: { current, permanent, sameAsCurrent: Boolean(record.address?.sameAsCurrent) },
    familyMembers,
    businessWork: { ...(record.businessWork || {}) },
    additionalInfo: { achievements: '', professionalProfile: '', remarks: '', ...(record.additionalInfo || {}) },
  };
}

function Field({ label, children }) {
  return <label className="block space-y-1.5"><span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function TextInput({ value, onChange, ...props }) {
  return <input {...props} className={inputClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
}

function SelectInput({ value, onChange, options, placeholder = 'Select' }) {
  return (
    <select className={inputClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

export default function FamilyEditForm({ record, onCancel, onSaved }) {
  const [form, setForm] = useState(() => cloneRecord(record));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setMain = (key, value) => setForm((current) => ({ ...current, mainMember: { ...current.mainMember, [key]: value } }));
  const setAddress = (part, key, value) => setForm((current) => ({ ...current, address: { ...current.address, [part]: { ...current.address[part], [key]: value } } }));
  const setBusiness = (key, value) => setForm((current) => ({ ...current, businessWork: { ...current.businessWork, [key]: value } }));
  const setAdditional = (key, value) => setForm((current) => ({ ...current, additionalInfo: { ...current.additionalInfo, [key]: value } }));
  const setMember = (index, key, value) => setForm((current) => ({
    ...current,
    familyMembers: current.familyMembers.map((member, memberIndex) => memberIndex === index ? { ...member, [key]: value } : member),
  }));
  const setNestedMember = (index, section, key, value) => setForm((current) => ({
    ...current,
    familyMembers: current.familyMembers.map((member, memberIndex) => memberIndex === index
      ? { ...member, [section]: { ...(member[section] || {}), [key]: value } }
      : member),
  }));

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const mainMember = {
        ...form.mainMember,
        fullName: `${form.mainMember.firstName || ''} ${form.mainMember.surname || ''}`.trim() || form.mainMember.fullName,
      };
      const familyMembers = form.familyMembers.map((member) => ({
        ...member,
        fullName: `${member.firstName || ''} ${member.surname || ''}`.trim() || member.fullName,
      }));
      const payload = { ...form, mainMember, familyMembers };
      const { data } = await api.put(`/admin/families/${record._id}`, payload);
      onSaved(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div><h2 className="font-serif text-xl font-black text-slate-900">Edit Family Record</h2><p className="mt-0.5 text-xs text-slate-500">Update the same fields collected by the public form.</p></div>
          <button type="button" onClick={onCancel} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close editor"><IconX size={18} /></button>
        </div>

        {error && <div className="mx-5 mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:mx-7">{error}</div>}

        <div className="space-y-5 p-5 sm:p-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-bold text-slate-900">Personal Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="First Name"><TextInput value={form.mainMember.firstName} onChange={(value) => setMain('firstName', value)} /></Field>
              <Field label="Surname"><TextInput value={form.mainMember.surname} onChange={(value) => setMain('surname', value)} /></Field>
              <Field label="Date of Birth"><TextInput type="date" value={form.mainMember.dateOfBirth} onChange={(value) => setMain('dateOfBirth', value)} /></Field>
              <Field label="Father's Name"><TextInput value={form.mainMember.fatherName} onChange={(value) => setMain('fatherName', value)} /></Field>
              <Field label="Mother's Name"><TextInput value={form.mainMember.motherName} onChange={(value) => setMain('motherName', value)} /></Field>
              <Field label="Gender"><SelectInput value={form.mainMember.gender} onChange={(value) => setMain('gender', value)} options={GENDERS} /></Field>
              <Field label="Marital Status"><SelectInput value={form.mainMember.maritalStatus} onChange={(value) => setMain('maritalStatus', value)} options={MARITAL_STATUSES} /></Field>
              {form.mainMember.maritalStatus === 'Single' && <Field label="Engagement Status"><SelectInput value={form.mainMember.engagementStatus} onChange={(value) => setMain('engagementStatus', value)} options={['Yes', 'No']} /></Field>}
              <Field label="Mobile Number"><TextInput value={form.mainMember.mobileNumber} onChange={(value) => setMain('mobileNumber', value)} /></Field>
              <Field label="WhatsApp Number"><TextInput value={form.mainMember.whatsappNumber} onChange={(value) => setMain('whatsappNumber', value)} /></Field>
              <Field label="Email"><TextInput type="email" value={form.mainMember.email} onChange={(value) => setMain('email', value)} /></Field>
              <Field label="Highest Education"><TextInput value={form.mainMember.highestEducation} onChange={(value) => setMain('highestEducation', value)} /></Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-bold text-slate-900">Address</h3>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {['current', 'permanent'].map((part) => (
                <div key={part} className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <h4 className="text-sm font-bold capitalize text-slate-700">{part} address</h4>
                  <Field label="Address Line 1"><TextInput value={form.address[part].addressLine1} onChange={(value) => setAddress(part, 'addressLine1', value)} /></Field>
                  <Field label="Village"><SelectInput value={form.address[part].village} onChange={(value) => setAddress(part, 'village', value)} options={VILLAGES} /></Field>
                  <Field label="City"><SelectInput value={form.address[part].city} onChange={(value) => setAddress(part, 'city', value)} options={CITIES} /></Field>
                </div>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.address.sameAsCurrent} onChange={(event) => setForm((current) => ({ ...current, address: { ...current.address, sameAsCurrent: event.target.checked, permanent: event.target.checked ? { ...current.address.current } : current.address.permanent } }))} /> Permanent address is the same as current address.</label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-bold text-slate-900">Business / Work</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Occupation Type"><SelectInput value={form.businessWork.occupationType} onChange={(value) => setBusiness('occupationType', value)} options={OCCUPATIONS} /></Field>
              <Field label="Business Name"><TextInput value={form.businessWork.businessName} onChange={(value) => setBusiness('businessName', value)} /></Field>
              <Field label="Business Type"><TextInput value={form.businessWork.businessType} onChange={(value) => setBusiness('businessType', value)} /></Field>
              <Field label="Industry"><TextInput value={form.businessWork.industry} onChange={(value) => setBusiness('industry', value)} /></Field>
              <Field label="Years in Business"><TextInput type="number" min="0" value={form.businessWork.yearsInBusiness} onChange={(value) => setBusiness('yearsInBusiness', value)} /></Field>
              <Field label="Business Address"><TextInput value={form.businessWork.businessAddress} onChange={(value) => setBusiness('businessAddress', value)} /></Field>
              <Field label="Job Title"><TextInput value={form.businessWork.jobTitle} onChange={(value) => setBusiness('jobTitle', value)} /></Field>
              <Field label="Employer / Company"><TextInput value={form.businessWork.employer} onChange={(value) => setBusiness('employer', value)} /></Field>
              <Field label="Designation"><TextInput value={form.businessWork.designation} onChange={(value) => setBusiness('designation', value)} /></Field>
              <Field label="Years in Role"><TextInput type="number" min="0" value={form.businessWork.yearsInRole} onChange={(value) => setBusiness('yearsInRole', value)} /></Field>
              <Field label="Work Address"><TextInput value={form.businessWork.workAddress} onChange={(value) => setBusiness('workAddress', value)} /></Field>
              <Field label="Profession"><TextInput value={form.businessWork.profession} onChange={(value) => setBusiness('profession', value)} /></Field>
              <Field label="Organization / Practice"><TextInput value={form.businessWork.organization} onChange={(value) => setBusiness('organization', value)} /></Field>
              <Field label="Years of Experience"><TextInput type="number" min="0" value={form.businessWork.yearsExperience} onChange={(value) => setBusiness('yearsExperience', value)} /></Field>
              <Field label="Institution Name"><TextInput value={form.businessWork.institutionName} onChange={(value) => setBusiness('institutionName', value)} /></Field>
              <Field label="Education Level"><SelectInput value={form.businessWork.educationLevel} onChange={(value) => setBusiness('educationLevel', value)} options={EDUCATION_LEVELS} /></Field>
              <Field label="Course / Subject"><TextInput value={form.businessWork.courseOrSubject} onChange={(value) => setBusiness('courseOrSubject', value)} /></Field>
              <Field label="Current Year / Class"><TextInput value={form.businessWork.studyYear} onChange={(value) => setBusiness('studyYear', value)} /></Field>
              <Field label="Study Status"><TextInput value={form.businessWork.studentStatus} onChange={(value) => setBusiness('studentStatus', value)} /></Field>
              <Field label="Previous Occupation"><TextInput value={form.businessWork.previousOccupation} onChange={(value) => setBusiness('previousOccupation', value)} /></Field>
              <Field label="Retirement Year"><TextInput type="number" min="1900" value={form.businessWork.retirementYear} onChange={(value) => setBusiness('retirementYear', value)} /></Field>
              <Field label="Current Status / Reason"><TextInput value={form.businessWork.notWorkingDetails} onChange={(value) => setBusiness('notWorkingDetails', value)} /></Field>
              <Field label="Other Occupation Details"><TextInput value={form.businessWork.otherOccupationDetails} onChange={(value) => setBusiness('otherOccupationDetails', value)} /></Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-bold text-slate-900">Additional Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Notable Achievements"><TextInput value={form.additionalInfo.achievements} onChange={(value) => setAdditional('achievements', value)} /></Field>
              <Field label="Website"><TextInput type="url" value={form.additionalInfo.professionalProfile} onChange={(value) => setAdditional('professionalProfile', value)} /></Field>
              <Field label="Additional Remarks"><textarea className={`${inputClass} min-h-24`} value={form.additionalInfo.remarks ?? ''} onChange={(event) => setAdditional('remarks', event.target.value)} /></Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">Family Members</h3><span className="text-xs text-slate-500">{form.familyMembers.length} member(s)</span></div>
            <div className="space-y-4">
              {form.familyMembers.map((member, index) => (
                <div key={member._id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-bold text-slate-800">Member {index + 1}</h4><button type="button" onClick={() => setForm((current) => ({ ...current, familyMembers: current.familyMembers.filter((_, memberIndex) => memberIndex !== index) }))} className="text-xs font-bold text-rose-600 hover:text-rose-700">Remove</button></div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="First Name"><TextInput value={member.firstName} onChange={(value) => setMember(index, 'firstName', value)} /></Field>
                    <Field label="Surname"><TextInput value={member.surname} onChange={(value) => setMember(index, 'surname', value)} /></Field>
                    <Field label="Relationship"><SelectInput value={member.relation} onChange={(value) => setMember(index, 'relation', value)} options={RELATIONS} /></Field>
                    <Field label="Other Relationship"><TextInput value={member.otherRelationship} onChange={(value) => setMember(index, 'otherRelationship', value)} /></Field>
                    <Field label="Date of Birth / Age"><TextInput value={member.dateOfBirthOrAge} onChange={(value) => setMember(index, 'dateOfBirthOrAge', value)} /></Field>
                    <Field label="Gender"><SelectInput value={member.gender} onChange={(value) => setMember(index, 'gender', value)} options={GENDERS} /></Field>
                    <Field label="Marital Status"><SelectInput value={member.maritalStatus} onChange={(value) => setMember(index, 'maritalStatus', value)} options={MARITAL_STATUSES} /></Field>
                    <Field label="Engagement Status"><SelectInput value={member.engagementStatus} onChange={(value) => setMember(index, 'engagementStatus', value)} options={['Yes', 'No']} /></Field>
                    <Field label="Mobile Number"><TextInput value={member.mobileNumber} onChange={(value) => setMember(index, 'mobileNumber', value)} /></Field>
                    <Field label="Work Status"><SelectInput value={member.workStatus} onChange={(value) => setMember(index, 'workStatus', value)} options={WORK_STATUSES} /></Field>
                    <Field label="Other Status"><TextInput value={member.otherStatus} onChange={(value) => setMember(index, 'otherStatus', value)} /></Field>
                  </div>
                  {member.workStatus === 'Working' && <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"><Field label="Occupation"><TextInput value={member.workDetails.occupation} onChange={(value) => setNestedMember(index, 'workDetails', 'occupation', value)} /></Field><Field label="Organization"><TextInput value={member.workDetails.organization} onChange={(value) => setNestedMember(index, 'workDetails', 'organization', value)} /></Field><Field label="Designation"><TextInput value={member.workDetails.designation} onChange={(value) => setNestedMember(index, 'workDetails', 'designation', value)} /></Field><Field label="Other Work Details"><TextInput value={member.workDetails.otherDetails} onChange={(value) => setNestedMember(index, 'workDetails', 'otherDetails', value)} /></Field></div>}
                  {member.workStatus === 'Business' && <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"><Field label="Business Name"><TextInput value={member.businessDetails.businessName} onChange={(value) => setNestedMember(index, 'businessDetails', 'businessName', value)} /></Field><Field label="Business Type"><TextInput value={member.businessDetails.businessType} onChange={(value) => setNestedMember(index, 'businessDetails', 'businessType', value)} /></Field><Field label="Other Business Details"><TextInput value={member.businessDetails.otherDetails} onChange={(value) => setNestedMember(index, 'businessDetails', 'otherDetails', value)} /></Field></div>}
                  {member.workStatus === 'Student' && <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"><Field label="School / College"><TextInput value={member.educationDetails.instituteName} onChange={(value) => setNestedMember(index, 'educationDetails', 'instituteName', value)} /></Field><Field label="Education Level"><SelectInput value={member.educationDetails.educationLevel} onChange={(value) => setNestedMember(index, 'educationDetails', 'educationLevel', value)} options={EDUCATION_LEVELS} /></Field><Field label="Class / Year"><TextInput value={member.educationDetails.classOrYear} onChange={(value) => setNestedMember(index, 'educationDetails', 'classOrYear', value)} /></Field><Field label="Stream / Subject"><TextInput value={member.educationDetails.streamOrSubject} onChange={(value) => setNestedMember(index, 'educationDetails', 'streamOrSubject', value)} /></Field><Field label="Course / Degree"><TextInput value={member.educationDetails.courseOrDegree} onChange={(value) => setNestedMember(index, 'educationDetails', 'courseOrDegree', value)} /></Field><Field label="Education Status"><TextInput value={member.educationDetails.educationStatus} onChange={(value) => setNestedMember(index, 'educationDetails', 'educationStatus', value)} /></Field></div>}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 rounded-b-2xl border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <button type="button" onClick={onCancel} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><IconX size={15} /> Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{saving ? <IconLoader2 size={15} /> : <IconCheck size={15} />} {saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </form>
  );
}
