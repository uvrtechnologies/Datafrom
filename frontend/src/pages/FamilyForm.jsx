import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../components/MobileShell';
import StepDots from '../components/StepDots';
import FamilyMemberForm, { emptyFamilyMember, validateMember } from '../components/FamilyMemberForm';
import Review from './Review';
import { Field, RadioPills, ChoiceGrid, Card, inputCls } from '../components/formPrimitives';
import api from '../services/api';

const emptyAddress = () => ({ addressLine1: '', village: '', city: '' });

const OCCUPATION_TYPES = ['Business Owner', 'Job / Employee', 'Self Employed', 'Professional', 'Farmer', 'Student', 'Retired', 'Not Working', 'Other'];
const CITY_OPTIONS = [
  'Select City',
  'Depalpur',
  'Hatod',
  'Indore',
  'Mhow',
  'Sawer'
];

const VILLAGE_OPTIONS = [
  'Select Village',

  // Indore
  'Asrawad Khurd',
  'Kalod Kartal',
  'Mirjapur',
  'Morod',
  'Ralamandal',
  'Umri Kheda',

  // Mhow
  'Chikhli',
  'Choral',
  'Datoda',
  'Gokanya',
  'Gosi Kheda',
  'Joshi Guradiya',
  'Memdi',
  'Shivnagar',
  'Simrol',
  'Jalalpura',

  // Other
  'Tejaji Nagar',
  'Indore',
  'Sendal',
  'Ganjinda',
  'Kurawad'
  ,'other'
];
const NAME_REGEX = /^[A-Za-z\s.'\-]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

const errCls = 'mt-1 text-xs text-red-600';

function validateName(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'required';
  if (trimmed.length < 2) return 'min';
  if (trimmed.length > 100) return 'max';
  if (!NAME_REGEX.test(trimmed)) return 'format';
  return null;
}

function nameErrorMsg(code, label) {
  if (code === 'required') return `${label} is required.`;
  if (code === 'min') return `${label} must be at least 2 characters.`;
  if (code === 'max') return `${label} must be at most 100 characters.`;
  if (code === 'format') return `${label} can contain letters, spaces, dots, hyphens, and apostrophes only.`;
  return '';
}

function validateMobile(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'required';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && INDIAN_MOBILE_REGEX.test(digits)) return null;
  return 'format';
}

function mobileErrorMsg(code) {
  if (code === 'required') return 'Mobile number is required.';
  return 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
}

export default function FamilyForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const pendingFocus = useRef('');

  const [mainMember, setMainMember] = useState({
    fullName: '', dateOfBirth: '', fatherName: '', motherName: '', gender: '', maritalStatus: '', engagementStatus: '',
    mobileNumber: '', whatsappNumber: '', email: '', highestEducation: '',
  });

  const [step1Touched, setStep1Touched] = useState({});
  const touch = (field) => setStep1Touched((prev) => ({ ...prev, [field]: true }));

  const [currentAddress, setCurrentAddress] = useState(emptyAddress());
  const [permanentAddress, setPermanentAddress] = useState(emptyAddress());
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  const [familyMembers, setFamilyMembers] = useState([]);
  const [memberErrors, setMemberErrors] = useState([]);

  const [businessWork, setBusinessWork] = useState({
    occupationType: '', businessName: '', businessType: '', industry: '', yearsInBusiness: '', businessAddress: '',
    jobTitle: '', employer: '', designation: '', yearsInRole: '', workAddress: '',
    profession: '', organization: '', yearsExperience: '', institutionName: '', educationLevel: '',
    courseOrSubject: '', studyYear: '', studentStatus: '', previousOccupation: '', retirementYear: '',
    otherOccupationDetails: '', notWorkingDetails: '',
    resultType: '', percentage: '', cgpa: '', educationName: '', lastClassOrYear: '',
    farmType: '', yearsFarming: '', farmAddress: '',
  });
  const setBW = (field, value) => {
    clearFieldError(`main-${field}`);
    clearFieldError(`student-${field}`);
    setBusinessWork((prev) => ({ ...prev, [field]: value }));
  };

  const [additionalInfo, setAdditionalInfo] = useState({
    achievements: '', professionalProfile: '', remarks: '', startupPlan: '',
  });

  const [confirmed, setConfirmed] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');

  const clearFieldError = (field) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  };
  const setMM = (field, value) => {
    clearFieldError(`main-${field}`);
    setMainMember((prev) => ({ ...prev, [field]: value }));
  };
  const setAI = (field, value) => {
    if (field === 'professionalProfile') clearFieldError('additional-professionalProfile');
    setAdditionalInfo((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!pendingFocus.current) return;
    const fieldId = pendingFocus.current;
    pendingFocus.current = '';
    requestAnimationFrame(() => {
      const field = document.getElementById(fieldId);
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
    });
  }, [step, fieldErrors, memberErrors, confirmationError]);

  const showFieldError = (field) => fieldErrors[field]
    ? <div className={errCls} role="alert">{fieldErrors[field]}</div>
    : null;

  const failField = (field, message, targetStep = step) => {
    setFieldErrors((previous) => ({ ...previous, [field]: message }));
    pendingFocus.current = field;
    setStep(targetStep);
    return false;
  };

  const toggleSameAsCurrent = (checked) => {
    setSameAsCurrent(checked);
    if (checked) setPermanentAddress(currentAddress);
  };
  const updateCurrentAddress = (key, value) => {
    clearFieldError(`current-${key}`);
    const updated = { ...currentAddress, [key]: value };
    setCurrentAddress(updated);
    if (sameAsCurrent) setPermanentAddress(updated);
  };

  const fullNameCode = validateName(mainMember.fullName);
  const mobileCode = validateMobile(mainMember.mobileNumber);

  const validateStep1 = () => {
    setFieldErrors({});
    setStep1Touched({ fullName: true, mobileNumber: true, email: true, whatsappNumber: true });

    if (fullNameCode) return failField('main-fullName', nameErrorMsg(fullNameCode, 'Full name'), 1);
    if (mobileCode) return failField('main-mobileNumber', mobileErrorMsg(mobileCode), 1);
    if (!mainMember.gender) {
      return failField('main-gender', 'Please select your gender.', 1);
    }
    if (!mainMember.maritalStatus) {
      return failField('main-maritalStatus', 'Please select your marital status.', 1);
    }
    if (mainMember.maritalStatus === 'Single' && !mainMember.engagementStatus) {
      return failField('main-engagementStatus', 'Please select your engagement status.', 1);
    }

    if (mainMember.email) {
      const emailTrimmed = mainMember.email.trim();
      if (!EMAIL_REGEX.test(emailTrimmed)) {
        return failField('main-email', 'Please enter a valid email address.', 1);
      }
    }
    if (mainMember.whatsappNumber) {
      const waRaw = mainMember.whatsappNumber.trim();
      const waDigits = waRaw.replace(/\D/g, '');
      const waOk = waDigits.length === 10 && INDIAN_MOBILE_REGEX.test(waDigits);
      if (!waOk) {
        return failField('main-whatsappNumber', 'Please enter a valid WhatsApp number.', 1);
      }
    }
    if (!businessWork.occupationType) {
      return failField('main-occupationType', 'Please select your current occupation.', 1);
    }
    if (businessWork.occupationType === 'Student') {
      const lvl = businessWork.educationLevel;
      const courseLevels = ['College', 'Diploma', 'Professional Degree', 'Master Degree'];
      if (!String(businessWork.institutionName || '').trim()) {
        return failField('student-institutionName', 'Institution name is required for Student.', 1);
      }
      if (!lvl) return failField('student-educationLevel', 'Education level is required for Student.', 1);
      if (courseLevels.includes(lvl) && !String(businessWork.courseOrSubject || '').trim()) {
        return failField('student-courseOrSubject', 'Course / Degree is required for Student.', 1);
      }
      if (!String(businessWork.studyYear || businessWork.lastClassOrYear || '').trim()) {
        return failField('student-studyYear', 'Last completed year / class is required for Student.', 1);
      }
      if (lvl === 'Other Special' && !String(businessWork.educationName || '').trim()) {
        return failField('student-educationName', 'Education name is required for Student.', 1);
      }
      if (!businessWork.studentStatus) return failField('student-studentStatus', 'Study status is required for Student.', 1);
      if (!businessWork.resultType) return failField('student-resultType', 'Result type is required for Student.', 1);
      if (businessWork.resultType === 'Percentage' && String(businessWork.percentage || '').trim() === '') {
        return failField('student-percentage', 'Percentage is required for Student.', 1);
      }
      if (businessWork.resultType === 'CGPA' && String(businessWork.cgpa || '').trim() === '') {
        return failField('student-cgpa', 'CGPA is required for Student.', 1);
      }
      if (businessWork.resultType === 'Percentage') {
        const pct = Number(businessWork.percentage);
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          return failField('student-percentage', 'Percentage must be between 0 and 100.', 1);
        }
      }
      if (businessWork.resultType === 'CGPA') {
        const cg = Number(businessWork.cgpa);
        if (Number.isNaN(cg) || cg < 0 || cg > 10) {
          return failField('student-cgpa', 'CGPA must be between 0 and 10.', 1);
        }
      }
    }
    if (businessWork.occupationType === 'Business Owner' || businessWork.occupationType === 'Self Employed') {
      if (!String(businessWork.businessName || '').trim()) return failField('main-businessName', 'Business Name is required.', 1);
      if (!businessWork.businessType) return failField('main-businessType', 'Business Type is required.', 1);
      if (!String(businessWork.industry || '').trim()) return failField('main-industry', 'Industry is required.', 1);
      if (String(businessWork.yearsInBusiness || '').trim() === '') return failField('main-yearsInBusiness', 'Years in Business is required.', 1);
      if (Number(businessWork.yearsInBusiness) < 0) return failField('main-yearsInBusiness', 'Years in business cannot be negative.', 1);
      if (!String(businessWork.businessAddress || '').trim()) return failField('main-businessAddress', 'Business Address is required.', 1);
    }
    if (businessWork.occupationType === 'Job / Employee') {
      if (!String(businessWork.jobTitle || '').trim()) return failField('main-jobTitle', 'Job Title is required.', 1);
      if (!String(businessWork.employer || '').trim()) return failField('main-employer', 'Employer / Company is required.', 1);
      if (!String(businessWork.designation || '').trim()) return failField('main-designation', 'Designation is required.', 1);
      if (String(businessWork.yearsInRole || '').trim() === '') return failField('main-yearsInRole', 'Years in Role is required.', 1);
      if (Number(businessWork.yearsInRole) < 0) return failField('main-yearsInRole', 'Years in role cannot be negative.', 1);
      if (!String(businessWork.workAddress || '').trim()) return failField('main-workAddress', 'Work Address is required.', 1);
    }
    if (businessWork.occupationType === 'Professional') {
      if (!String(businessWork.profession || '').trim()) return failField('main-profession', 'Profession is required.', 1);
      if (!String(businessWork.organization || '').trim()) return failField('main-organization', 'Organization / Practice is required.', 1);
      if (String(businessWork.yearsExperience || '').trim() === '') return failField('main-yearsExperience', 'Years of Experience is required.', 1);
      if (Number(businessWork.yearsExperience) < 0) return failField('main-yearsExperience', 'Years of experience cannot be negative.', 1);
      if (!String(businessWork.workAddress || '').trim()) return failField('main-profWorkAddress', 'Work Address is required.', 1);
    }
    if (businessWork.occupationType === 'Farmer') {
      if (!String(businessWork.farmType || '').trim()) return failField('main-farmType', 'Farm Type is required.', 1);
      if (String(businessWork.yearsFarming || '').trim() === '') return failField('main-yearsFarming', 'Years in Farming is required.', 1);
      if (Number(businessWork.yearsFarming) < 0) return failField('main-yearsFarming', 'Years in farming cannot be negative.', 1);
      if (!String(businessWork.farmAddress || '').trim()) return failField('main-farmAddress', 'Farm Address is required.', 1);
    }
    if (businessWork.occupationType === 'Retired') {
      if (!String(businessWork.previousOccupation || '').trim()) return failField('main-previousOccupation', 'Previous Occupation is required.', 1);
      if (String(businessWork.retirementYear || '').trim() === '') return failField('main-retirementYear', 'Retirement Year is required.', 1);
      const ry = Number(businessWork.retirementYear);
      const currYr = new Date().getFullYear();
      if (Number.isNaN(ry) || ry < 1900 || ry > currYr) {
        return failField('main-retirementYear', `Retirement Year must be between 1900 and ${currYr}.`, 1);
      }
    }
    if (businessWork.occupationType === 'Not Working' && !businessWork.notWorkingDetails.trim()) {
      return failField('main-notWorkingDetails', 'Please share the current status or reason for not working.', 1);
    }
    if (businessWork.occupationType === 'Other' && !businessWork.otherOccupationDetails.trim()) {
      return failField('main-otherOccupationDetails', 'Please describe your occupation.', 1);
    }
    setError('');
    return true;
  };

  const validateAddress = (address, label) => {
    const prefix = label === 'current' ? 'current' : 'permanent';
    const addressLine1 = String(address.addressLine1 || '').trim();
    if (!addressLine1) return failField(`${prefix}-addressLine1`, `Address Line 1 is required in the ${label} address.`, 2);
    if (addressLine1.length < 5) return failField(`${prefix}-addressLine1`, `Address Line 1 in the ${label} address must be at least 5 characters.`, 2);
    if (addressLine1.length > 150) return failField(`${prefix}-addressLine1`, `Address Line 1 in the ${label} address must be at most 150 characters.`, 2);
    if (!VILLAGE_OPTIONS.slice(1).includes(address.village)) return failField(`${prefix}-village`, `Please select a valid Village in the ${label} address.`, 2);
    if (!CITY_OPTIONS.slice(1).includes(address.city)) return failField(`${prefix}-city`, `Please select a valid City in the ${label} address.`, 2);
    return true;
  };

  const validateStep2 = () => {
    setFieldErrors({});
    if (!validateAddress(currentAddress, 'current')) return false;
    if (!sameAsCurrent && !validateAddress(permanentAddress, 'permanent')) return false;
    setError('');
    return true;
  };

  const validateStep3 = () => {
    const errs = familyMembers.map((member, index) => validateMember(member, index));
    if (errs.some(Boolean)) {
      setMemberErrors(errs);
      const firstIndex = errs.findIndex(Boolean);
      pendingFocus.current = `family-member-${firstIndex}-${errs[firstIndex].field}`;
      setStep(3);
      return false;
    }
    setMemberErrors([]);
    setError('');
    return true;
  };

  const validateStep4 = () => {
    setFieldErrors({});
    if (additionalInfo.professionalProfile && !URL_REGEX.test(additionalInfo.professionalProfile.trim())) {
      return failField('additional-professionalProfile', 'Enter a valid profile URL starting with http:// or https://.', 1);
    }
    setError('');
    return true;
  };

  const next = () => {
    const validators = { 1: () => validateStep1() && validateStep4(), 2: validateStep2, 3: validateStep3 };
    if (validators[step] && !validators[step]()) return;
    setError('');
    setFieldErrors({});
    setMemberErrors([]);
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo(0, 0);
  };
  const back = () => { setStep((s) => Math.max(s - 1, 1)); setMemberErrors([]); window.scrollTo(0, 0); };

  const handleSubmit = async () => {
    if (!confirmed) {
      setConfirmationError('Please confirm that the information provided is correct.');
      pendingFocus.current = 'review-confirmed';
      return;
    }
    setConfirmationError('');
    if (!validateStep1() || !validateStep4()) return;
    if (!validateStep2()) return;
    if (!validateStep3()) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const trimmedMM = { ...mainMember };
      Object.keys(trimmedMM).forEach((k) => {
        if (typeof trimmedMM[k] === 'string') trimmedMM[k] = trimmedMM[k].trim();
      });

      const cleanAddr = (a) => {
        const out = {};
        Object.keys(a).forEach((k) => { out[k] = typeof a[k] === 'string' ? a[k].trim() : a[k]; });
        return out;
      };

      const cleanBW = {};
      Object.keys(businessWork).forEach((k) => { cleanBW[k] = typeof businessWork[k] === 'string' ? businessWork[k].trim() : businessWork[k]; });

      const cleanAI = {};
      Object.keys(additionalInfo).forEach((k) => { cleanAI[k] = typeof additionalInfo[k] === 'string' ? additionalInfo[k].trim() : additionalInfo[k]; });

      const cleanMembers = familyMembers.map((m) => {
        const out = { ...m };
        delete out._formId;
        if (typeof out.fullName === 'string') {
          out.fullName = out.fullName.trim();
        }
        return out;
      });

      const payload = {
        mainMember: trimmedMM,
        address: {
          current: cleanAddr(currentAddress),
          permanent: sameAsCurrent ? cleanAddr(currentAddress) : cleanAddr(permanentAddress),
          sameAsCurrent,
        },
        familyMembers: cleanMembers,
        businessWork: cleanBW,
        additionalInfo: cleanAI,
        confirmed,
      };
      const { data } = await api.post('/family/submit', payload);
      navigate('/success', { state: data.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell>
      <div className="bg-white rounded-2xl shadow-md p-5">
        <StepDots current={step} total={4} />

        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-200 p-3 text-sm">{error}</div>}

        {step === 1 && (
          <div>
            <h2 className="font-serif font-bold text-brand-700 text-xl mb-4">1. Personal &amp; Additional Details</h2>
            <Field label="Full Name" required>
              <input
                id="main-fullName"
                className={inputCls}
                placeholder="e.g. Rajesh Kumar Sharma"
                value={mainMember.fullName || ''}
                onChange={(e) => setMM('fullName', e.target.value)}
                onBlur={() => touch('fullName')}
                maxLength={100}
              />
              {step1Touched.fullName && fullNameCode && !fieldErrors['main-fullName'] && (
                <div className={errCls}>{nameErrorMsg(fullNameCode, 'Full name')}</div>
              )}
              {showFieldError('main-fullName')}
            </Field>
            <Field label="Date of Birth"><input type="date" className={inputCls} value={mainMember.dateOfBirth} onChange={(e) => setMM('dateOfBirth', e.target.value)} /></Field>
            <Field label="Father's Name"><input className={inputCls} placeholder="Enter father's name" value={mainMember.fatherName} onChange={(e) => setMM('fatherName', e.target.value.trimStart())} /></Field>
            <Field label="Mother's Name"><input className={inputCls} placeholder="Enter mother's name" value={mainMember.motherName} onChange={(e) => setMM('motherName', e.target.value.trimStart())} /></Field>
            <Field label="Gender" required>
              <div id="main-gender" tabIndex={-1}>
                <RadioPills name="gender" options={['Male', 'Female', 'Other']} value={mainMember.gender} onChange={(v) => setMM('gender', v)} />
              </div>
              {showFieldError('main-gender')}
            </Field>
            <Field label="Marital Status" required>
              <select
                id="main-maritalStatus"
                className={inputCls}
                value={mainMember.maritalStatus}
                onChange={(e) => {
                  clearFieldError('main-maritalStatus');
                  clearFieldError('main-engagementStatus');
                  const maritalStatus = e.target.value;
                  setMainMember((prev) => ({
                    ...prev,
                    maritalStatus,
                    engagementStatus: maritalStatus === 'Single' ? prev.engagementStatus : '',
                  }));
                }}
              >
                <option value="">Select status</option>
                <option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
              </select>
              {showFieldError('main-maritalStatus')}
            </Field>
            {mainMember.maritalStatus === 'Single' && (
              <Field label="Are you engaged?" required>
                <select id="main-engagementStatus" className={inputCls} value={mainMember.engagementStatus} onChange={(e) => setMM('engagementStatus', e.target.value)}>
                  <option value="">Select status</option>
                  <option>Yes</option><option>No</option>
                </select>
                {showFieldError('main-engagementStatus')}
              </Field>
            )}
            <Field label="Mobile Number" required>
              <input
                id="main-mobileNumber"
                className={inputCls}
                placeholder="e.g. 9876543210"
                value={mainMember.mobileNumber}
                onChange={(e) => setMM('mobileNumber', e.target.value)}
                onBlur={() => touch('mobileNumber')}
                maxLength={15}
              />
              {step1Touched.mobileNumber && mobileCode && !fieldErrors['main-mobileNumber'] && (
                <div className={errCls}>{mobileErrorMsg(mobileCode)}</div>
              )}
              {showFieldError('main-mobileNumber')}
            </Field>
            <Field label="WhatsApp Number">
              <input
                id="main-whatsappNumber"
                className={inputCls}
                placeholder="e.g. 9876543210"
                value={mainMember.whatsappNumber}
                onChange={(e) => setMM('whatsappNumber', e.target.value)}
                onBlur={() => touch('whatsappNumber')}
                maxLength={15}
              />
              {showFieldError('main-whatsappNumber')}
            </Field>
            <Field label="Email Address">
              <input
                id="main-email"
                className={inputCls}
                type="email"
                placeholder="john.doe@example.com"
                value={mainMember.email}
                onChange={(e) => setMM('email', e.target.value)}
                onBlur={() => touch('email')}
              />
              {step1Touched.email && mainMember.email && !EMAIL_REGEX.test(mainMember.email.trim()) && mainMember.email.trim() && (
                <div className={errCls}>Please enter a valid email address.</div>
              )}
              {showFieldError('main-email')}
            </Field>
            <Field label="Highest Education"><input className={inputCls} placeholder="e.g. Bachelor's Degree" value={mainMember.highestEducation} onChange={(e) => setMM('highestEducation', e.target.value.trimStart())} /></Field>

            <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">
                Current Occupation <span className="text-red-500">*</span>
              </h3>
              <span className="text-sm font-semibold text-gray-700">What is your current occupation?</span>
              <div id="main-occupationType" tabIndex={-1}>
                <ChoiceGrid options={OCCUPATION_TYPES} value={businessWork.occupationType} onChange={(v) => setBW('occupationType', v)} />
              </div>
              {showFieldError('main-occupationType')}

              {(businessWork.occupationType === 'Business Owner' || businessWork.occupationType === 'Self Employed') && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Business Details <span className="text-red-500">(All fields required)</span></h3>
                  <Field label="Business Name" required><input id="main-businessName" className={inputCls} placeholder="e.g. Acme Corp" value={businessWork.businessName} onChange={(e) => setBW('businessName', e.target.value.trimStart())} />{showFieldError('main-businessName')}</Field>
                  <Field label="Business Type" required>
                    <select id="main-businessType" className={inputCls} value={businessWork.businessType} onChange={(e) => setBW('businessType', e.target.value)}>
                      <option value="">Select Type</option>
                      <option>Retail</option><option>Wholesale</option><option>Manufacturing</option><option>Agriculture</option>
                      <option>IT / Technology</option><option>Education</option><option>Healthcare</option><option>Construction</option>
                      <option>Transport</option><option>Finance</option><option>Food</option><option>Restaurant</option>
                      <option>Service</option><option>Real Estate</option><option>Professional Services</option><option>Other</option>
                    </select>
                    {showFieldError('main-businessType')}
                  </Field>
                  <Field label="Industry" required><input id="main-industry" className={inputCls} placeholder="e.g. Technology" value={businessWork.industry} onChange={(e) => setBW('industry', e.target.value.trimStart())} />{showFieldError('main-industry')}</Field>
                  <Field label="Years in Business" required><input id="main-yearsInBusiness" type="number" min="0" className={inputCls} placeholder="0" value={businessWork.yearsInBusiness} onChange={(e) => setBW('yearsInBusiness', e.target.value)} />{showFieldError('main-yearsInBusiness')}</Field>
                  <Field label="Business Address" required><input id="main-businessAddress" className={inputCls} placeholder="123 Business Rd, Suite 100" value={businessWork.businessAddress} onChange={(e) => setBW('businessAddress', e.target.value.trimStart())} />{showFieldError('main-businessAddress')}</Field>
                </div>
              )}

              {businessWork.occupationType === 'Job / Employee' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Employment Details <span className="text-red-500">(All fields required)</span></h3>
                  <Field label="Job Title" required><input id="main-jobTitle" className={inputCls} placeholder="e.g. Software Engineer" value={businessWork.jobTitle} onChange={(e) => setBW('jobTitle', e.target.value.trimStart())} />{showFieldError('main-jobTitle')}</Field>
                  <Field label="Employer / Company" required><input id="main-employer" className={inputCls} value={businessWork.employer} onChange={(e) => setBW('employer', e.target.value.trimStart())} />{showFieldError('main-employer')}</Field>
                  <Field label="Designation" required><input id="main-designation" className={inputCls} value={businessWork.designation} onChange={(e) => setBW('designation', e.target.value.trimStart())} />{showFieldError('main-designation')}</Field>
                  <Field label="Years in Role" required><input id="main-yearsInRole" type="number" min="0" className={inputCls} value={businessWork.yearsInRole} onChange={(e) => setBW('yearsInRole', e.target.value)} />{showFieldError('main-yearsInRole')}</Field>
                  <Field label="Work Address" required><input id="main-workAddress" className={inputCls} value={businessWork.workAddress} onChange={(e) => setBW('workAddress', e.target.value.trimStart())} />{showFieldError('main-workAddress')}</Field>
                </div>
              )}

              {businessWork.occupationType === 'Professional' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Professional Details <span className="text-red-500">(All fields required)</span></h3>
                  <Field label="Profession" required><input id="main-profession" className={inputCls} placeholder="e.g. Doctor, Lawyer, Consultant" value={businessWork.profession} onChange={(e) => setBW('profession', e.target.value.trimStart())} />{showFieldError('main-profession')}</Field>
                  <Field label="Organization / Practice" required><input id="main-organization" className={inputCls} value={businessWork.organization} onChange={(e) => setBW('organization', e.target.value.trimStart())} />{showFieldError('main-organization')}</Field>
                  <Field label="Years of Experience" required><input id="main-yearsExperience" type="number" min="0" className={inputCls} value={businessWork.yearsExperience} onChange={(e) => setBW('yearsExperience', e.target.value)} />{showFieldError('main-yearsExperience')}</Field>
                  <Field label="Work Address" required><input id="main-profWorkAddress" className={inputCls} value={businessWork.workAddress} onChange={(e) => setBW('workAddress', e.target.value.trimStart())} />{showFieldError('main-profWorkAddress')}</Field>
                </div>
              )}

              {businessWork.occupationType === 'Farmer' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Farming Details <span className="text-red-500">(All fields required)</span></h3>
                  <Field label="Farm Type" required><input id="main-farmType" className={inputCls} placeholder="e.g. Dairy, Agriculture, Poultry, Mixed" value={businessWork.farmType} onChange={(e) => setBW('farmType', e.target.value.trimStart())} />{showFieldError('main-farmType')}</Field>
                  <Field label="Years in Farming" required><input id="main-yearsFarming" type="number" min="0" className={inputCls} placeholder="0" value={businessWork.yearsFarming} onChange={(e) => setBW('yearsFarming', e.target.value)} />{showFieldError('main-yearsFarming')}</Field>
                  <Field label="Farm Address" required><input id="main-farmAddress" className={inputCls} placeholder="Village, Tehsil, District" value={businessWork.farmAddress} onChange={(e) => setBW('farmAddress', e.target.value.trimStart())} />{showFieldError('main-farmAddress')}</Field>
                </div>
              )}

              {businessWork.occupationType === 'Student' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Student Details</h3>
                  <Field label="School / College / Institution" required><input id="student-institutionName" className={inputCls} value={businessWork.institutionName} onChange={(e) => setBW('institutionName', e.target.value.trimStart())} />{showFieldError('student-institutionName')}</Field>
                  <Field label="Education Level" required>
                    <select id="student-educationLevel" className={inputCls} value={businessWork.educationLevel} onChange={(e) => setBW('educationLevel', e.target.value)}>
                      <option value="">Select Level</option>
                      <option>School</option>
                      <option>College</option>
                      <option>Diploma</option>
                      <option>Professional Degree</option>
                      <option>Master Degree</option>
                      <option>Other Special</option>
                    </select>
                    {showFieldError('student-educationLevel')}
                  </Field>
                  {['College', 'Diploma', 'Professional Degree', 'Master Degree'].includes(businessWork.educationLevel) && (
                    <Field label="Course / Degree" required><input id="student-courseOrSubject" className={inputCls} value={businessWork.courseOrSubject} onChange={(e) => setBW('courseOrSubject', e.target.value.trimStart())} />{showFieldError('student-courseOrSubject')}</Field>
                  )}
                  {businessWork.educationLevel === 'Other Special' && (
                    <Field label="Education Name (required for Other Special)" required>
                      <input id="student-educationName" className={inputCls} placeholder="e.g. Computer Course" value={businessWork.educationName || ''} onChange={(e) => setBW('educationName', e.target.value.trimStart())} />
                      {showFieldError('student-educationName')}
                    </Field>
                  )}
                  <Field label="Last Completed Year / Class" required>
                    <input
                      id="student-studyYear"
                      className={inputCls}
                      value={businessWork.studyYear}
                      onChange={(e) => {
                        const v = e.target.value.trimStart();
                        setBW('studyYear', v);
                        setBW('lastClassOrYear', v);
                      }}
                    />
                    {showFieldError('student-studyYear')}
                  </Field>
                  <Field label="Study Status" required>
                    <select id="student-studentStatus" className={inputCls} value={businessWork.studentStatus} onChange={(e) => setBW('studentStatus', e.target.value)}><option value="">Select Status</option><option>Currently Studying</option><option>On Leave</option><option>Completed</option></select>
                    {showFieldError('student-studentStatus')}
                  </Field>
                  <Field label="Result Type" required>
                    <div id="student-resultType" tabIndex={-1}>
                      <RadioPills name="resultType" options={['Percentage', 'CGPA']} value={businessWork.resultType} onChange={(v) => setBW('resultType', v)} />
                    </div>
                    {showFieldError('student-resultType')}
                  </Field>
                  {businessWork.resultType === 'Percentage' && (
                    <Field label="Percentage" required>
                      <input id="student-percentage" className={inputCls} value={businessWork.percentage} onChange={(e) => setBW('percentage', e.target.value)} />
                      {showFieldError('student-percentage')}
                      {businessWork.percentage !== '' && (Number(businessWork.percentage) < 0 || Number(businessWork.percentage) > 100) && (
                        <div className={errCls}>Percentage must be between 0 and 100.</div>
                      )}
                    </Field>
                  )}
                  {businessWork.resultType === 'CGPA' && (
                    <Field label="CGPA" required>
                      <input id="student-cgpa" className={inputCls} value={businessWork.cgpa} onChange={(e) => setBW('cgpa', e.target.value)} />
                      {showFieldError('student-cgpa')}
                      {businessWork.cgpa !== '' && (Number(businessWork.cgpa) < 0 || Number(businessWork.cgpa) > 10) && (
                        <div className={errCls}>CGPA must be between 0 and 10.</div>
                      )}
                    </Field>
                  )}
                </div>
              )}

              {businessWork.occupationType === 'Retired' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Retirement Details <span className="text-red-500">(All fields required)</span></h3>
                  <Field label="Previous Occupation" required><input id="main-previousOccupation" className={inputCls} value={businessWork.previousOccupation} onChange={(e) => setBW('previousOccupation', e.target.value.trimStart())} />{showFieldError('main-previousOccupation')}</Field>
                  <Field label="Retirement Year" required><input id="main-retirementYear" type="number" min="1900" className={inputCls} value={businessWork.retirementYear} onChange={(e) => setBW('retirementYear', e.target.value)} />{showFieldError('main-retirementYear')}</Field>
                </div>
              )}

              {businessWork.occupationType === 'Not Working' && (
                <Field label="Current Status / Reason" required>
                  <textarea id="main-notWorkingDetails" className={inputCls} rows={3} placeholder="Please tell us your current status or reason for not working" value={businessWork.notWorkingDetails} onChange={(e) => setBW('notWorkingDetails', e.target.value)} />
                  {showFieldError('main-notWorkingDetails')}
                </Field>
              )}

              {businessWork.occupationType === 'Other' && (
                <Field label="Describe Your Occupation" required>
                  <textarea id="main-otherOccupationDetails" className={inputCls} rows={3} placeholder="Please describe your occupation" value={businessWork.otherOccupationDetails} onChange={(e) => setBW('otherOccupationDetails', e.target.value)} />
                  {showFieldError('main-otherOccupationDetails')}
                </Field>
              )}
            </div>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <h3 className="font-serif font-bold text-brand-700 text-xl mb-1">Additional Information</h3>
              <p className="text-sm text-gray-500 mb-4">Share any supplementary details to complete your profile.</p>
              <Card title="🏅 Notable Achievements">
                <input className={inputCls} placeholder="Awards, certifications, honors..." value={additionalInfo.achievements} onChange={(e) => setAI('achievements', e.target.value.trimStart())} />
              </Card>
              <Card title="🌐 Professional Profiles / Website">
                <input id="additional-professionalProfile" className={inputCls} placeholder="https://..." value={additionalInfo.professionalProfile} onChange={(e) => setAI('professionalProfile', e.target.value.trim())} />
                {showFieldError('additional-professionalProfile')}
              </Card>
              <Field label="Additional Remarks" hint="Is there anything else you would like to share that hasn't been covered in previous sections?">
                <textarea className={inputCls} rows={4} placeholder="Type your additional comments here..." value={additionalInfo.remarks} onChange={(e) => setAI('remarks', e.target.value)} />
              </Field>
              <Field label="Startup Plan (Optional)" hint="Share any business or startup idea you are planning.">
                <textarea className={inputCls} rows={4} placeholder="Describe your startup or business plan..." value={additionalInfo.startupPlan} onChange={(e) => setAI('startupPlan', e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-serif font-bold text-brand-700 text-xl mb-1">Address Details</h2>
            <p className="text-sm text-gray-500 mb-4">Please provide the current and permanent residential information.</p>

            <Card title="📍 Current Address">
              <Field label="Address Line 1" required><input id="current-addressLine1" className={inputCls} placeholder="Street address, P.O. box, company name" value={currentAddress.addressLine1} onChange={(e) => updateCurrentAddress('addressLine1', e.target.value.trimStart())} maxLength={150} />{showFieldError('current-addressLine1')}</Field>
              <Field label="Village" required>
                <select id="current-village" className={inputCls} value={currentAddress.village} onChange={(e) => updateCurrentAddress('village', e.target.value)}>
                  {VILLAGE_OPTIONS.map((village) => <option key={village} value={village === 'Select Village' ? '' : village}>{village}</option>)}
                </select>
                {showFieldError('current-village')}
              </Field>
              <Field label="City" required>
                <select id="current-city" className={inputCls} value={currentAddress.city} onChange={(e) => updateCurrentAddress('city', e.target.value)}>
                  {CITY_OPTIONS.map((city) => <option key={city} value={city === 'Select City' ? '' : city}>{city}</option>)}
                </select>
                {showFieldError('current-city')}
              </Field>
            </Card>

            <label className="flex items-start gap-2 text-sm text-gray-700 mb-4 px-1">
              <input type="checkbox" className="mt-0.5" checked={sameAsCurrent} onChange={(e) => toggleSameAsCurrent(e.target.checked)} />
              My permanent address is the same as my current address.
            </label>

            {!sameAsCurrent && (
              <Card title="📍 Permanent Address">
                <Field label="Address Line 1" required><input id="permanent-addressLine1" className={inputCls} value={permanentAddress.addressLine1} onChange={(e) => { clearFieldError('permanent-addressLine1'); setPermanentAddress({ ...permanentAddress, addressLine1: e.target.value.trimStart() }); }} maxLength={150} />{showFieldError('permanent-addressLine1')}</Field>
                <Field label="Village" required>
                  <select id="permanent-village" className={inputCls} value={permanentAddress.village} onChange={(e) => { clearFieldError('permanent-village'); setPermanentAddress({ ...permanentAddress, village: e.target.value }); }}>
                    {VILLAGE_OPTIONS.map((village) => <option key={village} value={village === 'Select Village' ? '' : village}>{village}</option>)}
                  </select>
                  {showFieldError('permanent-village')}
                </Field>
                <Field label="City" required>
                  <select id="permanent-city" className={inputCls} value={permanentAddress.city} onChange={(e) => { clearFieldError('permanent-city'); setPermanentAddress({ ...permanentAddress, city: e.target.value }); }}>
                    {CITY_OPTIONS.map((city) => <option key={city} value={city === 'Select City' ? '' : city}>{city}</option>)}
                  </select>
                  {showFieldError('permanent-city')}
                </Field>
              </Card>
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-serif font-bold text-brand-700 text-xl mb-1">Family Members</h2>
            <p className="text-sm text-gray-500 mb-4">Please provide information about your family members living in the household.</p>
            {familyMembers.length === 0 && (
              <p className="text-sm text-gray-500 italic mb-3">No family members added yet. Click the button below to start adding.</p>
            )}
            {familyMembers.map((m, idx) => (
              <FamilyMemberForm
                key={m._formId || idx} index={idx} member={m}
                error={memberErrors[idx]}
                onChange={(updated) => {
                  setFamilyMembers((prev) => prev.map((p, i) => (i === idx ? updated : p)));
                  if (memberErrors[idx]) {
                    setMemberErrors((prev) => {
                      const copy = [...prev];
                      copy[idx] = validateMember(updated, idx);
                      return copy;
                    });
                  }
                }}
                onRemove={() => {
                  setFamilyMembers((prev) => prev.filter((_, i) => i !== idx));
                  setMemberErrors((prev) => prev.filter((_, i) => i !== idx));
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setFamilyMembers((prev) => [...prev, emptyFamilyMember()])}
              className="w-full border-2 border-dashed border-brand-300 text-brand-600 rounded-xl py-3 text-sm font-bold tracking-wide hover:bg-brand-50"
            >
              + ADD FAMILY MEMBER
            </button>
          </div>
        )}

        {step === 4 && (
          <Review
            mainMember={mainMember}
            currentAddress={currentAddress}
            permanentAddress={sameAsCurrent ? currentAddress : permanentAddress}
            familyMembers={familyMembers}
            businessWork={businessWork}
            additionalInfo={additionalInfo}
            onEditStep={(s) => { setStep(s); setFieldErrors({}); window.scrollTo(0, 0); }}
            confirmed={confirmed}
            setConfirmed={(value) => {
              setConfirmed(value);
              if (value) setConfirmationError('');
            }}
            confirmationError={confirmationError}
          />
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <button type="button" onClick={back} disabled={step === 1} className="text-gray-600 font-semibold text-sm disabled:opacity-30">
            ← {step === 1 ? 'Back' : 'Previous Step'}
          </button>
          {step < 4 ? (
            <button type="button" onClick={next} className="px-6 py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700">
              Next Step →
            </button>
          ) : (
            <button
              type="button" onClick={handleSubmit} disabled={submitting || !confirmed}
              className="px-6 py-2.5 rounded-lg bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Information ▷'}
            </button>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
