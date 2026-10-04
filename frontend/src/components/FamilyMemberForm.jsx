import React from 'react';
import { Field, RadioPills, inputCls } from './formPrimitives';

const RELATIONS = ['Wife', 'Husband','Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];
const MARRIED_RELATIONSHIPS = ['Husband', 'Wife', 'Grandfather', 'Grandmother', 'Father', 'Mother'];
const WORK_STATUS = ['Working', 'Business', 'Farmer', 'Housewife', 'Not Working', 'Student', 'Retired', 'Other'];
const EDUCATION_LEVELS = ['School', 'College', 'Diploma', 'Professional Degree', 'Master Degree', 'Other Special'];
const EDUCATION_STATUS = ['Currently Studying', 'Completed', 'Other'];
const BUSINESS_TYPES = ['Retail', 'Wholesale', 'Manufacturing', 'Agriculture', 'IT / Technology', 'Education', 'Healthcare', 'Construction', 'Transport', 'Finance', 'Food', 'Restaurant', 'Service', 'Real Estate', 'Professional Services', 'Other'];
const CLASS_REQUIRED_LEVELS = ['School', 'College', 'Diploma', 'Professional Degree', 'Master Degree', 'Other Special'];
const STREAM_REQUIRED_LEVELS = [];
const COURSE_REQUIRED_LEVELS = ['College', 'Diploma', 'Professional Degree', 'Master Degree'];

const NAME_REGEX = /^[A-Za-z\s]+$/;
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
  if (!NAME_REGEX.test(trimmed)) return `${label} can contain letters and spaces only.`;
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
function emptyEdu() {
  return {
    instituteName: '', educationLevel: '', classOrYear: '', streamOrSubject: '',
    courseOrDegree: '', otherSubjectOrCourse: '', educationStatus: '',
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
    onChange(next);
  };

  const handleEducationLevel = (value) => {
    const edu = { ...(member.educationDetails || emptyEdu()), educationLevel: value };
    if (!CLASS_REQUIRED_LEVELS.includes(value)) edu.classOrYear = '';
    if (!STREAM_REQUIRED_LEVELS.includes(value)) edu.streamOrSubject = '';
    if (!COURSE_REQUIRED_LEVELS.includes(value)) edu.courseOrDegree = '';
    if (value !== 'Other Special') edu.educationName = '';
    onChange({ ...member, educationDetails: edu });
  };

  const wd = member.workDetails || emptyWork();
  const bd = member.businessDetails || emptyBusiness();
  const ed = member.educationDetails || emptyEdu();
  const showWork = member.workStatus === 'Working';
  const showBusiness = member.workStatus === 'Business';
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
        <RadioPills name={`workstatus-${index}`} options={WORK_STATUS} value={member.workStatus || ''} onChange={handleStatus} />

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
            <h4 className="text-sm font-bold text-gray-800 mb-2">Work Details</h4>
            <Field label="Occupation / Job Title">
              <input className={inputCls} placeholder="e.g. Software Engineer, Teacher" value={wd.occupation} onChange={(e) => setWork('occupation', e.target.value)} />
            </Field>
            <Field label="Organization / Company / Workplace">
              <input className={inputCls} placeholder="e.g. Acme Corp, Government School" value={wd.organization} onChange={(e) => setWork('organization', e.target.value)} />
            </Field>
            <Field label="Designation">
              <input className={inputCls} placeholder="e.g. Senior Analyst, Principal" value={wd.designation} onChange={(e) => setWork('designation', e.target.value)} />
            </Field>
            <Field label="Other Work Details / Annual Income">
              <input className={inputCls} placeholder="Optional" value={wd.otherDetails} onChange={(e) => setWork('otherDetails', e.target.value)} />
            </Field>
          </div>
        )}

        {showBusiness && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 mb-2">Business Details</h4>
            <Field label="Business Name">
              <input className={inputCls} placeholder="e.g. Sharma General Store" value={bd.businessName} onChange={(e) => setBusiness('businessName', e.target.value)} />
            </Field>
            <Field label="Business Type">
              <select className={inputCls} value={bd.businessType} onChange={(e) => setBusiness('businessType', e.target.value)}>
                <option value="">Select Type</option>
                {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Other Business Details">
              <input className={inputCls} placeholder="Optional" value={bd.otherDetails} onChange={(e) => setBusiness('otherDetails', e.target.value)} />
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
            {STREAM_REQUIRED_LEVELS.includes(ed.educationLevel) && (
              <Field label="Stream / Subject">
                <input className={inputCls} placeholder="e.g. Science, Commerce, Mechanical" value={ed.streamOrSubject} onChange={(e) => setEdu('streamOrSubject', e.target.value)} />
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
  firstName: '',
  surname: '',
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
  educationDetails: emptyEdu(),
  achievements: '',
  additionalRemarks: '',
  startupPlan: '',
});
