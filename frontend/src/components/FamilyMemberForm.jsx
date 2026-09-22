import React from 'react';
import { Field, RadioPills, inputCls } from './formPrimitives';

const RELATIONS = ['Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];
const WORK_STATUS = ['Working', 'Business', 'Not Working', 'Student', 'Retired', 'Other'];
const EDUCATION_LEVELS = ['Primary School', 'Secondary School', 'Higher Secondary', 'Diploma', 'Undergraduate', 'Postgraduate', 'Other'];
const EDUCATION_STATUS = ['Currently Studying', 'Completed', 'Other'];
const BUSINESS_TYPES = ['Retail', 'Wholesale', 'Manufacturing', 'Agriculture', 'IT / Technology', 'Education', 'Healthcare', 'Construction', 'Transport', 'Finance', 'Food', 'Restaurant', 'Service', 'Real Estate', 'Professional Services', 'Other'];
const CLASS_REQUIRED_LEVELS = ['Primary School', 'Secondary School', 'Higher Secondary', 'Diploma'];
const STREAM_REQUIRED_LEVELS = ['Higher Secondary', 'Diploma', 'Undergraduate', 'Postgraduate', 'Other'];
const COURSE_REQUIRED_LEVELS = ['Diploma', 'Undergraduate', 'Postgraduate'];

const NAME_REGEX = /^[A-Za-z\s]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const errCls = 'mt-1 text-xs text-red-600';

function validateNameForMember(value, label) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  if (trimmed.length > 50) return `${label} must be at most 50 characters.`;
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
  };
}

export function validateMember(member, idx) {
  const pos = `Family member ${idx + 1}`;
  const hasFirstName = String(member.firstName || '').trim() || String(member.fullName || '').trim();
  if (!hasFirstName) return `${pos}: First Name is required.`;
  if (member.firstName !== undefined) {
    const fnErr = validateNameForMember(member.firstName, `${pos}: First Name`);
    if (fnErr) return fnErr;
  }
  if (!member.relation) return `${pos}: Relationship is required.`;
  if (!member.gender) return `${pos}: Gender is required.`;
  if (!member.maritalStatus) return `${pos}: Marital Status is required.`;
  if (member.relation === 'Other' && !String(member.otherRelationship || '').trim()) {
    return `${pos}: Specify Relationship is required for "Other".`;
  }
  if (member.workStatus === 'Other' && !String(member.otherStatus || '').trim()) {
    return `${pos}: Specify Status is required for "Other".`;
  }
  if (member.mobileNumber && validateMobileForMember(member.mobileNumber)) {
    return `${pos}: Please enter a valid 10-digit Indian mobile number.`;
  }
  if (member.workStatus === 'Student') {
    const edu = member.educationDetails || {};
    if (!String(edu.instituteName || '').trim()) return `${pos}: School / College / Institute Name is required for Student.`;
    if (!edu.educationLevel) return `${pos}: Education Level is required for Student.`;
    if (!edu.educationStatus) return `${pos}: Education Status is required for Student.`;
    if (CLASS_REQUIRED_LEVELS.includes(edu.educationLevel) && !String(edu.classOrYear || '').trim()) {
      return `${pos}: Class / Year is required for "${edu.educationLevel}".`;
    }
  }
  return null;
}

const FamilyMemberForm = React.forwardRef(function FamilyMemberForm({ member, index, onChange, onRemove, error }, ref) {
  const set = (key, value) => onChange({ ...member, [key]: value });

  const setWork = (key, value) =>
    onChange({ ...member, workDetails: { ...(member.workDetails || emptyWork()), [key]: value } });

  const setBusiness = (key, value) =>
    onChange({ ...member, businessDetails: { ...(member.businessDetails || emptyBusiness()), [key]: value } });

  const setEdu = (key, value) =>
    onChange({ ...member, educationDetails: { ...(member.educationDetails || emptyEdu()), [key]: value } });

  const handleRelation = (value) => {
    const next = { ...member, relation: value };
    if (value !== 'Other') next.otherRelationship = '';
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
    if (value !== 'Other') edu.otherSubjectOrCourse = '';
    onChange({ ...member, educationDetails: edu });
  };

  const wd = member.workDetails || emptyWork();
  const bd = member.businessDetails || emptyBusiness();
  const ed = member.educationDetails || emptyEdu();
  const showWork = member.workStatus === 'Working';
  const showBusiness = member.workStatus === 'Business';
  const showStudent = member.workStatus === 'Student';

  const outerCls = `border rounded-xl p-4 mb-4 ${error ? 'border-red-300 bg-red-50/40' : 'border-brand-100 bg-brand-50/40'}`;

  const firstNameMsg = validateNameForMember(member.firstName, `${index + 1}: First Name`);
  const surnameMsg = member.surname !== undefined
    ? (() => {
        const trimmed = String(member.surname || '').trim();
        if (!trimmed) return null;
        if (trimmed.length < 2 || trimmed.length > 50 || !NAME_REGEX.test(trimmed)) return 'Surname: 2-50 letters/spaces only.';
        return null;
      })()
    : null;
  const mobileMsg = validateMobileForMember(member.mobileNumber);

  return (
    <div ref={ref} className={outerCls}>
      <div className="flex items-center justify-between mb-3">
        <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <button type="button" onClick={onRemove} className="text-red-500 text-sm">Remove</button>
      </div>

      <Field label="First Name" required>
        <input
          className={inputCls}
          placeholder="e.g. Rahul"
          value={member.firstName !== undefined ? member.firstName : ''}
          onChange={(e) => set('firstName', e.target.value)}
          maxLength={50}
        />
        {firstNameMsg && <div className={errCls}>{firstNameMsg}</div>}
      </Field>

      <Field label="Surname">
        <input
          className={inputCls}
          placeholder="e.g. Sharma"
          value={member.surname !== undefined ? member.surname : ''}
          onChange={(e) => set('surname', e.target.value)}
          maxLength={50}
        />
        {surnameMsg && <div className={errCls}>{surnameMsg}</div>}
      </Field>

      <Field label="Relationship to Head of Household" required>
        <select className={inputCls} value={member.relation} onChange={(e) => handleRelation(e.target.value)}>
          <option value="">Select Relationship</option>
          {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      {member.relation === 'Other' && (
        <Field label="Specify Relationship" required>
          <input className={inputCls} placeholder="e.g. Uncle, Cousin, Nephew" value={member.otherRelationship || ''} onChange={(e) => set('otherRelationship', e.target.value)} />
        </Field>
      )}

      <Field label="Date of Birth / Age">
        <input className={inputCls} placeholder="mm/dd/yyyy or age" value={member.dateOfBirthOrAge || ''} onChange={(e) => set('dateOfBirthOrAge', e.target.value)} />
      </Field>

      <Field label="Gender" required>
        <select className={inputCls} value={member.gender || ''} onChange={(e) => set('gender', e.target.value)}>
          <option value="">Select Gender</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
      </Field>

      <Field label="Marital Status" required>
        <select
          className={inputCls}
          value={member.maritalStatus || ''}
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
      </Field>
      {member.maritalStatus === 'Single' && (
        <Field label="Is this family member engaged?" required>
          <select className={inputCls} value={member.engagementStatus || ''} onChange={(e) => set('engagementStatus', e.target.value)}>
            <option value="">Select status</option>
            <option>Yes</option><option>No</option>
          </select>
        </Field>
      )}

      <Field label="Mobile Number (Optional)">
        <input className={inputCls} placeholder="e.g. 9876543210" value={member.mobileNumber || ''} onChange={(e) => set('mobileNumber', e.target.value)} maxLength={10} />
        {mobileMsg && <div className={errCls}>{mobileMsg}</div>}
      </Field>

      <div className="bg-white rounded-lg p-3 border border-gray-100 mb-1">
        <span className="text-sm font-semibold text-gray-700">Is this family member working or running a business?</span>
        <RadioPills name={`workstatus-${index}`} options={WORK_STATUS} value={member.workStatus || ''} onChange={handleStatus} />

        {member.workStatus === 'Other' && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Field label="Specify Status" required>
              <input className={inputCls} placeholder="e.g. Homemaker, Volunteer" value={member.otherStatus || ''} onChange={(e) => set('otherStatus', e.target.value)} />
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
              <input className={inputCls} placeholder="e.g. Delhi Public School" value={ed.instituteName} onChange={(e) => setEdu('instituteName', e.target.value)} />
            </Field>
            <Field label="Education Level" required>
              <select className={inputCls} value={ed.educationLevel} onChange={(e) => handleEducationLevel(e.target.value)}>
                <option value="">Select Level</option>
                {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            {CLASS_REQUIRED_LEVELS.includes(ed.educationLevel) && (
              <Field label="Class / Year" required>
                <input className={inputCls} placeholder="e.g. 10th, First Year, LKG" value={ed.classOrYear} onChange={(e) => setEdu('classOrYear', e.target.value)} />
              </Field>
            )}
            {STREAM_REQUIRED_LEVELS.includes(ed.educationLevel) && (
              <Field label="Stream / Subject">
                <input className={inputCls} placeholder="e.g. Science, Commerce, Mechanical" value={ed.streamOrSubject} onChange={(e) => setEdu('streamOrSubject', e.target.value)} />
              </Field>
            )}
            {COURSE_REQUIRED_LEVELS.includes(ed.educationLevel) && (
              <Field label="Course / Degree">
                <input className={inputCls} placeholder="e.g. Diploma in IT, B.Tech, MBA" value={ed.courseOrDegree} onChange={(e) => setEdu('courseOrDegree', e.target.value)} />
              </Field>
            )}
            {ed.educationLevel === 'Other' && (
              <Field label="Other Subject / Course" required>
                <input className={inputCls} placeholder="Describe subject / course" value={ed.otherSubjectOrCourse} onChange={(e) => setEdu('otherSubjectOrCourse', e.target.value)} />
              </Field>
            )}
            <Field label="Education Status" required>
              <RadioPills name={`edustatus-${index}`} options={EDUCATION_STATUS} value={ed.educationStatus} onChange={(v) => setEdu('educationStatus', v)} />
            </Field>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 rounded-lg bg-red-50 text-red-700 border border-red-200 p-2 text-xs">
          {error}
        </div>
      )}
    </div>
  );
});

export default FamilyMemberForm;

export const emptyFamilyMember = () => ({
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
});
