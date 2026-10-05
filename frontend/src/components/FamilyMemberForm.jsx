import React from 'react';
import { Field, RadioPills, inputCls } from './formPrimitives';

const RELATIONS = ['Wife', 'Husband','Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];
const MARRIED_RELATIONSHIPS = ['Husband', 'Wife', 'Grandfather', 'Grandmother', 'Father', 'Mother'];
const WORK_STATUS = ['Working', 'Business', 'Farmer', 'Housewife', 'Not Working', 'Student', 'Retired', 'Other'];
const EDUCATION_LEVELS = ['School', 'College', 'Diploma', 'Professional Degree', 'Master Degree', 'Other Special'];
const EDUCATION_STATUS = ['Currently Studying', 'Completed', 'Other'];
const BUSINESS_TYPES = ['Retail', 'Wholesale', 'Manufacturing', 'Agriculture', 'IT / Technology', 'Education', 'Healthcare', 'Construction', 'Transport', 'Finance', 'Food', 'Restaurant', 'Service', 'Real Estate', 'Professional Services', 'Other'];
const CLASS_REQUIRED_LEVELS = ['School', 'College', 'Diploma', 'Professional Degree', 'Master Degree', 'Other Special'];
const COURSE_REQUIRED_LEVELS = ['College', 'Diploma', 'Professional Degree', 'Master Degree'];

const NAME_REGEX = /^[A-Za-z\s.'\-]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const errCls = 'mt-1 text-xs text-red-600';
let familyMemberFormSequence = 0;

function toDateInputValue(value) {
  const raw = String(value || '').trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  const usMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const match = isoMatch
    ? [isoMatch[1], isoMatch[2], isoMatch[3]]
    : usMatch
      ? [usMatch[3], usMatch[1], usMatch[2]]
      : null;
  if (!match) return '';

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayForDateInput() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function validateNameForMember(value, label) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (trimmed.length > 100) return `${label} must be at most 100 characters.`;
  if (!NAME_REGEX.test(trimmed)) return `${label} can contain letters, spaces, dots, hyphens, and apostrophes only.`;
  return null;
}

function validateMobileForMember(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 && INDIAN_MOBILE_REGEX.test(digits)
    ? null
    : 'Please enter a valid 10-digit Indian mobile number.';
}

function emptyWork() { return { occupation: '', organization: '', designation: '', otherDetails: '' }; }
function emptyBusiness() { return { businessName: '', businessType: '', otherDetails: '' }; }
function emptyFarmer() { return { farmType: '', yearsFarming: '', farmAddress: '' }; }
function emptyRetired() { return { previousOccupation: '', retirementYear: '' }; }
function emptyHousewife() { return { activities: '' }; }
function emptyEdu() {
  return {
    instituteName: '', educationLevel: '', classOrYear: '', streamOrSubject: '',
    courseOrDegree: '', educationStatus: '',
    resultType: '', percentage: '', cgpa: '', educationName: '',
  };
}

export function validateMember(member, idx) {
  const pos = `Family member ${idx + 1}`;
  const invalid = (field, message) => ({
    field,
    message: message.startsWith(`${pos}:`) ? message : `${pos}: ${message}`,
  });
  const fullName = String(member.fullName || '').trim();
  const fullNameError = validateNameForMember(fullName, 'Full Name');
  if (fullNameError) return invalid('fullName', fullNameError);
  if (!member.relation) return invalid('relation', `${pos}: Relationship is required.`);
  if (!member.gender) return invalid('gender', `${pos}: Gender is required.`);
  if (!member.maritalStatus) return invalid('maritalStatus', `${pos}: Marital Status is required.`);
  if (member.maritalStatus === 'Single' && !member.engagementStatus && !MARRIED_RELATIONSHIPS.includes(member.relation)) {
    return invalid('engagementStatus', `${pos}: Engagement Status is required for single members.`);
  }
  if (member.relation === 'Other' && !String(member.otherRelationship || '').trim()) {
    return invalid('otherRelationship', `${pos}: Specify Relationship is required for "Other".`);
  }
  if (!member.workStatus) {
    return invalid('workStatus', `${pos}: Work Status is required.`);
  }
  if (member.workStatus === 'Other' && !String(member.otherStatus || '').trim()) {
    return invalid('otherStatus', `${pos}: Specify Status is required for "Other".`);
  }
  if (member.mobileNumber && validateMobileForMember(member.mobileNumber)) {
    return invalid('mobileNumber', `${pos}: Please enter a valid 10-digit Indian mobile number.`);
  }
  if (member.workStatus === 'Student') {
    const edu = member.educationDetails || {};
    if (!String(edu.instituteName || '').trim()) return invalid('instituteName', `${pos}: School / College / Institute Name is required for Student.`);
    if (!edu.educationLevel) return invalid('educationLevel', `${pos}: Education Level is required for Student.`);
    if (!edu.educationStatus) return invalid('educationStatus', `${pos}: Education Status is required for Student.`);
    if (CLASS_REQUIRED_LEVELS.includes(edu.educationLevel) && !String(edu.classOrYear || '').trim()) {
      return invalid('classOrYear', `${pos}: Class / Year is required for "${edu.educationLevel}".`);
    }
    if (COURSE_REQUIRED_LEVELS.includes(edu.educationLevel) && !String(edu.courseOrDegree || '').trim()) {
      return invalid('courseOrDegree', `${pos}: Course / Degree is required for "${edu.educationLevel}".`);
    }
    if (edu.educationLevel === 'Other Special' && !String(edu.educationName || '').trim()) {
      return invalid('educationName', `${pos}: Education Name is required for "Other Special".`);
    }
    if (!edu.resultType) return invalid('resultType', `${pos}: Result Type is required for Student.`);
    if (edu.resultType === 'Percentage' && String(edu.percentage || '').trim() === '') {
      return invalid('percentage', `${pos}: Percentage is required for Student.`);
    }
    if (edu.resultType === 'CGPA' && String(edu.cgpa || '').trim() === '') {
      return invalid('cgpa', `${pos}: CGPA is required for Student.`);
    }
    if (edu.resultType === 'Percentage' && String(edu.percentage || '').trim() !== '') {
      const pct = Number(edu.percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return invalid('percentage', `${pos}: Percentage must be between 0 and 100.`);
      }
    }
    if (edu.resultType === 'CGPA' && String(edu.cgpa || '').trim() !== '') {
      const cgpa = Number(edu.cgpa);
      if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        return invalid('cgpa', `${pos}: CGPA must be between 0 and 10.`);
      }
    }
  }
  if (member.workStatus === 'Working') {
    const wd = member.workDetails || {};
    if (!String(wd.occupation || '').trim()) return invalid('occupation', `${pos}: Occupation / Job Title is required for Working status.`);
    if (!String(wd.organization || '').trim()) return invalid('organization', `${pos}: Organization / Company is required for Working status.`);
    if (!String(wd.designation || '').trim()) return invalid('designation', `${pos}: Designation is required for Working status.`);
  }
  if (member.workStatus === 'Business') {
    const bd = member.businessDetails || {};
    if (!String(bd.businessName || '').trim()) return invalid('businessName', `${pos}: Business Name is required for Business status.`);
    if (!bd.businessType) return invalid('businessType', `${pos}: Business Type is required for Business status.`);
  }
  if (member.workStatus === 'Farmer') {
    const fd = member.farmerDetails || {};
    if (!String(fd.farmType || '').trim()) return invalid('farmType', `${pos}: Farm Type is required for Farmer status.`);
    if (String(fd.yearsFarming || '').trim() === '') return invalid('yearsFarming', `${pos}: Years in Farming is required for Farmer status.`);
    if (Number(fd.yearsFarming) < 0) return invalid('yearsFarming', `${pos}: Years in farming cannot be negative.`);
    if (!String(fd.farmAddress || '').trim()) return invalid('farmAddress', `${pos}: Farm Address is required for Farmer status.`);
  }
  if (member.workStatus === 'Retired') {
    const rd = member.retiredDetails || {};
    if (!String(rd.previousOccupation || '').trim()) return invalid('previousOccupation', `${pos}: Previous Occupation is required for Retired status.`);
    if (String(rd.retirementYear || '').trim() === '') return invalid('retirementYear', `${pos}: Retirement Year is required for Retired status.`);
    const ry = Number(rd.retirementYear);
    const currYr = new Date().getFullYear();
    if (Number.isNaN(ry) || ry < 1900 || ry > currYr) {
      return invalid('retirementYear', `${pos}: Retirement Year must be between 1900 and ${currYr}.`);
    }
  }
  if (member.workStatus === 'Housewife') {
    const hd = member.housewifeDetails || {};
    if (!String(hd.activities || '').trim()) return invalid('activities', `${pos}: Daily Activities / Responsibilities is required for Housewife status.`);
  }
  if (member.workStatus === 'Not Working') {
    const nw = member.notWorkingDetails || '';
    if (!String(nw || '').trim()) return invalid('notWorkingDetails', `${pos}: Current Status / Reason is required for Not Working status.`);
  }
  return null;
}

const FamilyMemberForm = React.forwardRef(function FamilyMemberForm({ member, index, onChange, onRemove, error }, ref) {
  const [dobMode, setDobMode] = React.useState(() => (
    member.dateOfBirthOrAge && !toDateInputValue(member.dateOfBirthOrAge) ? 'age' : 'dob'
  ));
  const set = (key, value) => onChange({ ...member, [key]: value });
  const changeDobMode = (mode) => {
    if (mode === dobMode) return;
    setDobMode(mode);
    set('dateOfBirthOrAge', '');
  };
  const maxDob = todayForDateInput();

  const setWork = (key, value) =>
    onChange({ ...member, workDetails: { ...(member.workDetails || emptyWork()), [key]: value } });

  const setBusiness = (key, value) =>
    onChange({ ...member, businessDetails: { ...(member.businessDetails || emptyBusiness()), [key]: value } });

  const setFarmer = (key, value) =>
    onChange({ ...member, farmerDetails: { ...(member.farmerDetails || emptyFarmer()), [key]: value } });

  const setRetired = (key, value) =>
    onChange({ ...member, retiredDetails: { ...(member.retiredDetails || emptyRetired()), [key]: value } });

  const setHousewife = (key, value) =>
    onChange({ ...member, housewifeDetails: { ...(member.housewifeDetails || emptyHousewife()), [key]: value } });

  const setNotWorking = (value) =>
    onChange({ ...member, notWorkingDetails: value });

  const setEdu = (key, value) =>
    onChange({ ...member, educationDetails: { ...(member.educationDetails || emptyEdu()), [key]: value } });

  const handleRelation = (value) => {
    const next = { ...member, relation: value };
    if (value !== 'Other') next.otherRelationship = '';
    if (MARRIED_RELATIONSHIPS.includes(value)) {
      next.maritalStatus = 'Married';
      next.engagementStatus = '';
    }
    onChange(next);
  };

  const handleStatus = (value) => {
    const next = { ...member, workStatus: value };
    if (value !== 'Other') next.otherStatus = '';
    if (value !== 'Working') next.workDetails = emptyWork();
    if (value !== 'Business') next.businessDetails = emptyBusiness();
    if (value !== 'Student') next.educationDetails = emptyEdu();
    if (value !== 'Farmer') next.farmerDetails = emptyFarmer();
    if (value !== 'Retired') next.retiredDetails = emptyRetired();
    if (value !== 'Housewife') next.housewifeDetails = emptyHousewife();
    if (value !== 'Not Working') next.notWorkingDetails = '';
    onChange(next);
  };

  const handleEducationLevel = (value) => {
    const edu = { ...(member.educationDetails || emptyEdu()), educationLevel: value };
    if (!CLASS_REQUIRED_LEVELS.includes(value)) edu.classOrYear = '';
    if (!COURSE_REQUIRED_LEVELS.includes(value)) edu.courseOrDegree = '';
    if (value !== 'Other Special') edu.educationName = '';
    onChange({ ...member, educationDetails: edu });
  };

  const wd = member.workDetails || emptyWork();
  const bd = member.businessDetails || emptyBusiness();
  const fd = member.farmerDetails || emptyFarmer();
  const rd = member.retiredDetails || emptyRetired();
  const hd = member.housewifeDetails || emptyHousewife();
  const nwd = member.notWorkingDetails || '';
  const ed = member.educationDetails || emptyEdu();
  const showWork = member.workStatus === 'Working';
  const showBusiness = member.workStatus === 'Business';
  const showFarmer = member.workStatus === 'Farmer';
  const showRetired = member.workStatus === 'Retired';
  const showHousewife = member.workStatus === 'Housewife';
  const showNotWorking = member.workStatus === 'Not Working';
  const showStudent = member.workStatus === 'Student';

  const outerCls = `border rounded-xl p-4 mb-4 ${error ? 'border-red-300 bg-red-50/40' : 'border-brand-100 bg-brand-50/40'}`;

  const fieldError = (field) => error?.field === field ? error.message : '';
  const memberFieldId = (field) => `family-member-${index}-${field}`;
  const fullNameMsg = fieldError('fullName');
  const mobileMsg = validateMobileForMember(member.mobileNumber);

  return (
    <div ref={ref} className={outerCls}>
      <div className="flex items-center justify-between mb-3">
        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <button type="button" onClick={onRemove} className="text-red-500 text-sm">Remove</button>
      </div>

      <Field label="Full Name" required>
        <input
          id={memberFieldId('fullName')}
          className={inputCls}
          placeholder="e.g. Rajesh Kumar Sharma"
          value={member.fullName || ''}
          onChange={(e) => set('fullName', e.target.value)}
          maxLength={100}
          required
          aria-invalid={!!fullNameMsg}
        />
        {fullNameMsg && <div className={errCls}>{fullNameMsg}</div>}
      </Field>

      <Field label="Relationship to Head of Household" required>
        <select id={memberFieldId('relation')} className={inputCls} value={member.relation} onChange={(e) => handleRelation(e.target.value)} aria-invalid={!!fieldError('relation')}>
          <option value="">Select Relationship</option>
          {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {fieldError('relation') && <div className={errCls}>{fieldError('relation')}</div>}
      </Field>

      {member.relation === 'Other' && (
        <Field label="Specify Relationship" required>
          <input id={memberFieldId('otherRelationship')} className={inputCls} placeholder="e.g. Uncle, Cousin, Nephew" value={member.otherRelationship || ''} onChange={(e) => set('otherRelationship', e.target.value)} aria-invalid={!!fieldError('otherRelationship')} />
          {fieldError('otherRelationship') && <div className={errCls}>{fieldError('otherRelationship')}</div>}
        </Field>
      )}

      <Field label="Date of Birth or Age">
        <div className="mb-2 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="group" aria-label="Choose date of birth or age">
          <button
            type="button"
            aria-pressed={dobMode === 'dob'}
            onClick={() => changeDobMode('dob')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${dobMode === 'dob' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Date of Birth
          </button>
          <button
            type="button"
            aria-pressed={dobMode === 'age'}
            onClick={() => changeDobMode('age')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${dobMode === 'age' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Age
          </button>
        </div>
        {dobMode === 'dob' ? (
          <>
            <input
              type="date"
              className={inputCls}
              aria-label="Family member date of birth"
              max={maxDob}
              value={toDateInputValue(member.dateOfBirthOrAge)}
              onChange={(e) => set('dateOfBirthOrAge', e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Select the date from the calendar.</p>
          </>
        ) : (
          <>
            <input
              type="number"
              min="0"
              max="150"
              step="1"
              inputMode="numeric"
              className={inputCls}
              placeholder="Enter age in years"
              aria-label="Family member age in years"
              value={member.dateOfBirthOrAge || ''}
              onChange={(e) => set('dateOfBirthOrAge', e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Enter age in whole years.</p>
          </>
        )}
      </Field>

      <Field label="Gender" required>
        <select id={memberFieldId('gender')} className={inputCls} value={member.gender || ''} onChange={(e) => set('gender', e.target.value)} aria-invalid={!!fieldError('gender')}>
          <option value="">Select Gender</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
        {fieldError('gender') && <div className={errCls}>{fieldError('gender')}</div>}
      </Field>

      <Field label="Marital Status" required>
        <select
          className={`${inputCls} ${MARRIED_RELATIONSHIPS.includes(member.relation) ? 'bg-gray-100 text-gray-500 cursor-not-allowed appearance-auto' : ''}`}
          value={member.maritalStatus || ''}
          id={memberFieldId('maritalStatus')}
          disabled={MARRIED_RELATIONSHIPS.includes(member.relation)}
          aria-invalid={!!fieldError('maritalStatus')}
          onChange={(e) => {
            const maritalStatus = e.target.value;
            onChange({
              ...member,
              maritalStatus,
              engagementStatus: maritalStatus === 'Single' ? (member.engagementStatus || '') : '',
            });
          }}
        >
          <option value="">Select Status</option>
          <option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
        </select>
        {fieldError('maritalStatus') && <div className={errCls}>{fieldError('maritalStatus')}</div>}
      </Field>
      {member.maritalStatus === 'Single' && !MARRIED_RELATIONSHIPS.includes(member.relation) && (
        <Field label="Is this family member engaged?" required>
          <select id={memberFieldId('engagementStatus')} className={inputCls} value={member.engagementStatus || ''} onChange={(e) => set('engagementStatus', e.target.value)} aria-invalid={!!fieldError('engagementStatus')}>
            <option value="">Select status</option>
            <option>Yes</option><option>No</option>
          </select>
          {fieldError('engagementStatus') && <div className={errCls}>{fieldError('engagementStatus')}</div>}
        </Field>
      )}

      <Field label="Mobile Number (Optional)">
        <input id={memberFieldId('mobileNumber')} className={inputCls} placeholder="e.g. 9876543210" value={member.mobileNumber || ''} onChange={(e) => set('mobileNumber', e.target.value)} maxLength={10} aria-invalid={!!fieldError('mobileNumber')} />
        {mobileMsg && !fieldError('mobileNumber') && <div className={errCls}>{mobileMsg}</div>}
        {fieldError('mobileNumber') && <div className={errCls}>{fieldError('mobileNumber')}</div>}
      </Field>

      <div className="bg-white rounded-lg p-3 border border-gray-100 mb-1">
        <span className="text-sm font-semibold text-gray-700">Is this family member working or running a business?</span>
        <div id={memberFieldId('workStatus')} tabIndex={-1}>
          <RadioPills name={`workstatus-${index}`} options={WORK_STATUS} value={member.workStatus || ''} onChange={handleStatus} />
        </div>
        {fieldError('workStatus') && <div className={errCls}>{fieldError('workStatus')}</div>}

        {member.workStatus === 'Other' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Field label="Specify Status" required>
              <input id={memberFieldId('otherStatus')} className={inputCls} placeholder="e.g. Homemaker, Volunteer" value={member.otherStatus || ''} onChange={(e) => set('otherStatus', e.target.value)} aria-invalid={!!fieldError('otherStatus')} />
              {fieldError('otherStatus') && <div className={errCls}>{fieldError('otherStatus')}</div>}
            </Field>
          </div>
        )}

        {showWork && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Work Details <span className="text-red-500">(All fields required)</span></h4>
            <Field label="Occupation / Job Title" required>
              <input id={memberFieldId('occupation')} className={inputCls} placeholder="e.g. Software Engineer, Teacher" value={wd.occupation} onChange={(e) => setWork('occupation', e.target.value)} aria-invalid={!!fieldError('occupation')} />
              {fieldError('occupation') && <div className={errCls}>{fieldError('occupation')}</div>}
            </Field>
            <Field label="Organization / Company / Workplace" required>
              <input id={memberFieldId('organization')} className={inputCls} placeholder="e.g. Acme Corp, Government School" value={wd.organization} onChange={(e) => setWork('organization', e.target.value)} aria-invalid={!!fieldError('organization')} />
              {fieldError('organization') && <div className={errCls}>{fieldError('organization')}</div>}
            </Field>
            <Field label="Designation" required>
              <input id={memberFieldId('designation')} className={inputCls} placeholder="e.g. Senior Analyst, Principal" value={wd.designation} onChange={(e) => setWork('designation', e.target.value)} aria-invalid={!!fieldError('designation')} />
              {fieldError('designation') && <div className={errCls}>{fieldError('designation')}</div>}
            </Field>
            <Field label="Other Work Details / Annual Income">
              <input className={inputCls} placeholder="Optional" value={wd.otherDetails} onChange={(e) => setWork('otherDetails', e.target.value)} />
            </Field>
          </div>
        )}

        {showBusiness && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Business Details <span className="text-red-500">(All fields required)</span></h4>
            <Field label="Business Name" required>
              <input id={memberFieldId('businessName')} className={inputCls} placeholder="e.g. Sharma General Store" value={bd.businessName} onChange={(e) => setBusiness('businessName', e.target.value)} aria-invalid={!!fieldError('businessName')} />
              {fieldError('businessName') && <div className={errCls}>{fieldError('businessName')}</div>}
            </Field>
            <Field label="Business Type" required>
              <select id={memberFieldId('businessType')} className={inputCls} value={bd.businessType} onChange={(e) => setBusiness('businessType', e.target.value)} aria-invalid={!!fieldError('businessType')}>
                <option value="">Select Type</option>
                {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {fieldError('businessType') && <div className={errCls}>{fieldError('businessType')}</div>}
            </Field>
            <Field label="Other Business Details">
              <input className={inputCls} placeholder="Optional" value={bd.otherDetails} onChange={(e) => setBusiness('otherDetails', e.target.value)} />
            </Field>
          </div>
        )}

        {showFarmer && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Farming Details <span className="text-red-500">(All fields required)</span></h4>
            <Field label="Farm Type" required>
              <input id={memberFieldId('farmType')} className={inputCls} placeholder="e.g. Dairy, Agriculture, Poultry, Mixed" value={fd.farmType} onChange={(e) => setFarmer('farmType', e.target.value)} aria-invalid={!!fieldError('farmType')} />
              {fieldError('farmType') && <div className={errCls}>{fieldError('farmType')}</div>}
            </Field>
            <Field label="Years in Farming" required>
              <input id={memberFieldId('yearsFarming')} type="number" min="0" className={inputCls} placeholder="0" value={fd.yearsFarming} onChange={(e) => setFarmer('yearsFarming', e.target.value)} aria-invalid={!!fieldError('yearsFarming')} />
              {fieldError('yearsFarming') && <div className={errCls}>{fieldError('yearsFarming')}</div>}
            </Field>
            <Field label="Farm Address" required>
              <input id={memberFieldId('farmAddress')} className={inputCls} placeholder="Village, Tehsil, District" value={fd.farmAddress} onChange={(e) => setFarmer('farmAddress', e.target.value)} aria-invalid={!!fieldError('farmAddress')} />
              {fieldError('farmAddress') && <div className={errCls}>{fieldError('farmAddress')}</div>}
            </Field>
          </div>
        )}

        {showRetired && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Retirement Details <span className="text-red-500">(All fields required)</span></h4>
            <Field label="Previous Occupation" required>
              <input id={memberFieldId('previousOccupation')} className={inputCls} placeholder="e.g. Teacher, Government Employee" value={rd.previousOccupation} onChange={(e) => setRetired('previousOccupation', e.target.value)} aria-invalid={!!fieldError('previousOccupation')} />
              {fieldError('previousOccupation') && <div className={errCls}>{fieldError('previousOccupation')}</div>}
            </Field>
            <Field label="Retirement Year" required>
              <input id={memberFieldId('retirementYear')} type="number" min="1900" className={inputCls} placeholder="e.g. 2020" value={rd.retirementYear} onChange={(e) => setRetired('retirementYear', e.target.value)} aria-invalid={!!fieldError('retirementYear')} />
              {fieldError('retirementYear') && <div className={errCls}>{fieldError('retirementYear')}</div>}
              {String(rd.retirementYear || '').trim() !== '' && (Number(rd.retirementYear) < 1900 || Number(rd.retirementYear) > new Date().getFullYear()) && (
                <div className={errCls}>Retirement Year must be between 1900 and {new Date().getFullYear()}.</div>
              )}
            </Field>
          </div>
        )}

        {showHousewife && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Household Details <span className="text-red-500">(Required)</span></h4>
            <Field label="Daily Activities / Responsibilities" required>
              <textarea id={memberFieldId('activities')} className={inputCls} rows={2} placeholder="e.g. Household management, Child care, Cooking" value={hd.activities} onChange={(e) => setHousewife('activities', e.target.value)} aria-invalid={!!fieldError('activities')} />
              {fieldError('activities') && <div className={errCls}>{fieldError('activities')}</div>}
            </Field>
          </div>
        )}

        {showNotWorking && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Field label="Current Status / Reason" required>
              <textarea id={memberFieldId('notWorkingDetails')} className={inputCls} rows={2} placeholder="Please tell us your current status or reason for not working" value={nwd} onChange={(e) => setNotWorking(e.target.value)} aria-invalid={!!fieldError('notWorkingDetails')} />
              {fieldError('notWorkingDetails') && <div className={errCls}>{fieldError('notWorkingDetails')}</div>}
            </Field>
          </div>
        )}

        {showStudent && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-brand-700 mb-2">🎓 Education Details</h4>
            <Field label="School / College / Institute Name" required>
              <input id={memberFieldId('instituteName')} className={inputCls} placeholder="e.g. Delhi Public School" value={ed.instituteName} onChange={(e) => setEdu('instituteName', e.target.value)} aria-invalid={!!fieldError('instituteName')} />
              {fieldError('instituteName') && <div className={errCls}>{fieldError('instituteName')}</div>}
            </Field>
            <Field label="Education Level" required>
              <select id={memberFieldId('educationLevel')} className={inputCls} value={ed.educationLevel} onChange={(e) => handleEducationLevel(e.target.value)} aria-invalid={!!fieldError('educationLevel')}>
                <option value="">Select Level</option>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {fieldError('educationLevel') && <div className={errCls}>{fieldError('educationLevel')}</div>}
            </Field>
            {CLASS_REQUIRED_LEVELS.includes(ed.educationLevel) && (
              <Field label="Class / Year" required>
                <input id={memberFieldId('classOrYear')} className={inputCls} placeholder="e.g. 10th, First Year, LKG" value={ed.classOrYear} onChange={(e) => setEdu('classOrYear', e.target.value)} aria-invalid={!!fieldError('classOrYear')} />
                {fieldError('classOrYear') && <div className={errCls}>{fieldError('classOrYear')}</div>}
              </Field>
            )}
            {COURSE_REQUIRED_LEVELS.includes(ed.educationLevel) && (
              <Field label="Course / Degree" required>
                <input id={memberFieldId('courseOrDegree')} className={inputCls} placeholder="e.g. Diploma in IT, B.Tech, MBA" value={ed.courseOrDegree} onChange={(e) => setEdu('courseOrDegree', e.target.value)} aria-invalid={!!fieldError('courseOrDegree')} />
                {fieldError('courseOrDegree') && <div className={errCls}>{fieldError('courseOrDegree')}</div>}
              </Field>
            )}
            {ed.educationLevel === 'Other Special' && (
              <Field label="Education Name" required>
                <input id={memberFieldId('educationName')} className={inputCls} placeholder="e.g. Computer Course" value={ed.educationName} onChange={(e) => setEdu('educationName', e.target.value)} aria-invalid={!!fieldError('educationName')} />
                {fieldError('educationName') && <div className={errCls}>{fieldError('educationName')}</div>}
              </Field>
            )}
            <Field label="Education Status" required>
              <div id={memberFieldId('educationStatus')} tabIndex={-1}>
                <RadioPills name={`edustatus-${index}`} options={EDUCATION_STATUS} value={ed.educationStatus} onChange={(v) => setEdu('educationStatus', v)} />
              </div>
              {fieldError('educationStatus') && <div className={errCls}>{fieldError('educationStatus')}</div>}
            </Field>
            <Field label="Result Type" required>
              <div id={memberFieldId('resultType')} tabIndex={-1}>
                <RadioPills name={`resulttype-${index}`} options={['Percentage', 'CGPA']} value={ed.resultType} onChange={(v) => setEdu('resultType', v)} />
              </div>
              {fieldError('resultType') && <div className={errCls}>{fieldError('resultType')}</div>}
            </Field>
            {ed.resultType === 'Percentage' && (
              <Field label="Percentage" required>
                <input id={memberFieldId('percentage')} className={inputCls} placeholder="e.g. 85.5" value={ed.percentage} onChange={(e) => setEdu('percentage', e.target.value)} aria-invalid={!!fieldError('percentage')} />
                {fieldError('percentage') && <div className={errCls}>{fieldError('percentage')}</div>}
                {String(ed.percentage || '').trim() !== '' && (Number(ed.percentage) < 0 || Number(ed.percentage) > 100) && (
                  <div className={errCls}>Percentage must be between 0 and 100.</div>
                )}
              </Field>
            )}
            {ed.resultType === 'CGPA' && (
              <Field label="CGPA" required>
                <input id={memberFieldId('cgpa')} className={inputCls} placeholder="e.g. 8.2" value={ed.cgpa} onChange={(e) => setEdu('cgpa', e.target.value)} aria-invalid={!!fieldError('cgpa')} />
                {fieldError('cgpa') && <div className={errCls}>{fieldError('cgpa')}</div>}
                {String(ed.cgpa || '').trim() !== '' && (Number(ed.cgpa) < 0 || Number(ed.cgpa) > 10) && (
                  <div className={errCls}>CGPA must be between 0 and 10.</div>
                )}
              </Field>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-brand-100 pt-4">
        <h4 className="mb-2 text-sm font-bold text-gray-800">Achievements & Additional Information (Optional)</h4>
        <Field label="Achievements">
          <textarea className={inputCls} rows={2} placeholder="Awards, certifications, or other achievements..." value={member.achievements || ''} onChange={(e) => set('achievements', e.target.value)} />
        </Field>
        <Field label="Additional Remarks">
          <textarea className={inputCls} rows={3} placeholder="Anything else to share about this family member..." value={member.additionalRemarks || ''} onChange={(e) => set('additionalRemarks', e.target.value)} />
        </Field>
        <Field label="Startup Plan" hint="Optional business or startup idea for this family member.">
          <textarea className={inputCls} rows={3} placeholder="Describe any startup or business plan..." value={member.startupPlan || ''} onChange={(e) => set('startupPlan', e.target.value)} />
        </Field>
      </div>

    </div>
  );
});

export default FamilyMemberForm;

export const emptyFamilyMember = () => ({
  _formId: `family-member-${++familyMemberFormSequence}`,
  fullName: '',
  relation: '',
  otherRelationship: '',
  dateOfBirthOrAge: '',
  gender: '',
  maritalStatus: '',
  engagementStatus: '',
  mobileNumber: '',
  workStatus: '',
  otherStatus: '',
  workDetails: emptyWork(),
  businessDetails: emptyBusiness(),
  farmerDetails: emptyFarmer(),
  retiredDetails: emptyRetired(),
  housewifeDetails: emptyHousewife(),
  notWorkingDetails: '',
  educationDetails: emptyEdu(),
  achievements: '',
  additionalRemarks: '',
  startupPlan: '',
});
