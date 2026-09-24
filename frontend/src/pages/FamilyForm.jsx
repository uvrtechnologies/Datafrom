import React, { useState } from 'react';
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

  // Mhow
  'Amba Chandan',
  'Berchha',
  'Bhicholi',
  'Chikhli',
  'Choral',
  'Datoda',
  'Gokanya',
  'Gosi Kheda',
  'Gujarkheda (CT)',
  'Harsola',
  'Hasalpur',
  'Joshi Guradiya',
  'Kelod',
  'Memdi',
  'Mhow Cantt (CB)',
  'Mhowgaon (NP)',
  'Patal Pani',
  'Pathan Pipalya',
  'Shivnagar',
  'Simrol',
  'Tinchha',
  'Jalalpura',

  // Indore
  'Asrawad Khurd',
  'Kalod Kartal',
  'Machla',
  'Mirjapur',
  'Morod',
  'Ralamandal',
  'Tillor Buzurg',
  'Tillor Khurd',
  'Tinchha',
  'Ujjaini',
  'Umri Kheda'
];
const NAME_REGEX = /^[A-Za-z\s]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

const errCls = 'mt-1 text-xs text-red-600';

function validateName(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'required';
  if (trimmed.length < 2) return 'min';
  if (trimmed.length > 50) return 'max';
  if (!NAME_REGEX.test(trimmed)) return 'format';
  return null;
}

function nameErrorMsg(code, label) {
  if (code === 'required') return `${label} is required.`;
  if (code === 'min') return `${label} must be at least 2 characters.`;
  if (code === 'max') return `${label} must be at most 50 characters.`;
  if (code === 'format') return `${label} can contain letters and spaces only.`;
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
  const [submitting, setSubmitting] = useState(false);

  const [mainMember, setMainMember] = useState({
    firstName: '', surname: '', dateOfBirth: '', fatherName: '', motherName: '', gender: '', maritalStatus: '', engagementStatus: '',
    mobileNumber: '', whatsappNumber: '', email: '', highestEducation: '',
  });
  const setMM = (field, value) => setMainMember((prev) => ({ ...prev, [field]: value }));

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
  });
  const setBW = (field, value) => setBusinessWork((prev) => ({ ...prev, [field]: value }));

  const [additionalInfo, setAdditionalInfo] = useState({
    achievements: '', professionalProfile: '', remarks: '',
  });
  const setAI = (field, value) => setAdditionalInfo((prev) => ({ ...prev, [field]: value }));

  const [confirmed, setConfirmed] = useState(false);

  const toggleSameAsCurrent = (checked) => {
    setSameAsCurrent(checked);
    if (checked) setPermanentAddress(currentAddress);
  };
  const updateCurrentAddress = (key, value) => {
    const updated = { ...currentAddress, [key]: value };
    setCurrentAddress(updated);
    if (sameAsCurrent) setPermanentAddress(updated);
  };

  const firstNameCode = validateName(mainMember.firstName);
  const surnameCode = validateName(mainMember.surname);
  const mobileCode = validateMobile(mainMember.mobileNumber);

  const validateStep1 = () => {
    setStep1Touched({ firstName: true, surname: true, mobileNumber: true, email: true, whatsappNumber: true });

    if (firstNameCode) { setError(nameErrorMsg(firstNameCode, 'First name')); return false; }
    if (surnameCode) { setError(nameErrorMsg(surnameCode, 'Surname')); return false; }
    if (mobileCode) { setError(mobileErrorMsg(mobileCode)); return false; }
    if (!mainMember.gender) {
      setError('Please select your gender.');
      return false;
    }
    if (!mainMember.maritalStatus) {
      setError('Please select your marital status.');
      return false;
    }
    if (mainMember.maritalStatus === 'Single' && !mainMember.engagementStatus) {
      setError('Please select your engagement status.');
      return false;
    }

    if (mainMember.email) {
      const emailTrimmed = mainMember.email.trim();
      if (!EMAIL_REGEX.test(emailTrimmed)) {
        setError('Please enter a valid email address.');
        return false;
      }
    }
    if (mainMember.whatsappNumber) {
      const waRaw = mainMember.whatsappNumber.trim();
      const waDigits = waRaw.replace(/\D/g, '');
      const waOk = waDigits.length === 10 && INDIAN_MOBILE_REGEX.test(waDigits);
      if (!waOk) {
        setError('Please enter a valid WhatsApp number.');
        return false;
      }
    }
    if (!businessWork.occupationType) {
      setError('Please select your current occupation.');
      return false;
    }
    if (businessWork.occupationType === 'Student' && (!businessWork.institutionName.trim() || !businessWork.educationLevel)) {
      setError('Please provide the institution name and education level.');
      return false;
    }
    if (businessWork.occupationType === 'Not Working' && !businessWork.notWorkingDetails.trim()) {
      setError('Please share the current status or reason for not working.');
      return false;
    }
    if (businessWork.occupationType === 'Other' && !businessWork.otherOccupationDetails.trim()) {
      setError('Please describe your occupation.');
      return false;
    }
    if (businessWork.yearsInBusiness !== '' && Number(businessWork.yearsInBusiness) < 0) {
      setError('Years in business cannot be negative.');
      return false;
    }
    setError('');
    return true;
  };

  const validateAddress = (address, label) => {
    const addressLine1 = String(address.addressLine1 || '').trim();
    if (!addressLine1) { setError(`Please complete Address Line 1 in the ${label} address.`); return false; }
    if (addressLine1.length < 5) { setError(`Address Line 1 in the ${label} address must be at least 5 characters.`); return false; }
    if (addressLine1.length > 150) { setError(`Address Line 1 in the ${label} address must be at most 150 characters.`); return false; }
    if (!VILLAGE_OPTIONS.slice(1).includes(address.village)) { setError(`Please select a valid Village in the ${label} address.`); return false; }
    if (!CITY_OPTIONS.slice(1).includes(address.city)) { setError(`Please select a valid City in the ${label} address.`); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!validateAddress(currentAddress, 'current')) return false;
    if (!sameAsCurrent && !validateAddress(permanentAddress, 'permanent')) return false;
    setError('');
    return true;
  };

  const validateStep3 = () => {
    const errs = familyMembers.map((member, index) => validateMember(member, index));
    if (errs.some(Boolean)) {
      setMemberErrors(errs);
      setError('Please fix the highlighted family member fields before continuing.');
      return false;
    }
    setMemberErrors([]);
    setError('');
    return true;
  };

  const validateStep4 = () => {
    if (additionalInfo.professionalProfile && !URL_REGEX.test(additionalInfo.professionalProfile.trim())) {
      setError('Please enter a valid professional profile URL starting with http:// or https://.');
      return false;
    }
    setError('');
    return true;
  };

  const next = () => {
    const validators = {
      1: validateStep1,
      2: validateStep2,
      3: validateStep3,
      4: validateStep4,
    };
    if (validators[step] && !validators[step]()) return;
    setError('');
    setMemberErrors([]);
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo(0, 0);
  };
  const back = () => { setStep((s) => Math.max(s - 1, 1)); setMemberErrors([]); window.scrollTo(0, 0); };

  const handleSubmit = async () => {
    if (!confirmed) {
      setError('Please confirm that the information provided is correct.');
      return;
    }
    const stepValid = validateStep1() && validateStep2() && validateStep3() && validateStep4();
    if (!stepValid) {
      setStep(1);
      window.scrollTo(0, 0);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const trimmedMM = { ...mainMember };
      Object.keys(trimmedMM).forEach((k) => {
        if (typeof trimmedMM[k] === 'string') trimmedMM[k] = trimmedMM[k].trim();
      });
      trimmedMM.fullName = `${trimmedMM.firstName} ${trimmedMM.surname}`.trim();

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
        if (typeof out.firstName === 'string') out.firstName = out.firstName.trim();
        if (typeof out.surname === 'string') out.surname = out.surname.trim();
        if (!out.fullName && (out.firstName || out.surname)) {
          out.fullName = `${out.firstName} ${out.surname}`.trim();
        } else if (typeof out.fullName === 'string') {
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
        <StepDots current={step} total={5} />

        {error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-200 p-3 text-sm">{error}</div>}

        {step === 1 && (
          <div>
            <h2 className="font-serif font-bold text-brand-700 text-xl mb-4">1. Your Personal Details</h2>
            <Field label="First Name" required>
              <input
                className={inputCls}
                placeholder="e.g. John"
                value={mainMember.firstName}
                onChange={(e) => setMM('firstName', e.target.value)}
                onBlur={() => touch('firstName')}
                maxLength={50}
              />
              {step1Touched.firstName && firstNameCode && (
                <div className={errCls}>{nameErrorMsg(firstNameCode, 'First name')}</div>
              )}
            </Field>
            <Field label="Surname" required>
              <input
                className={inputCls}
                placeholder="e.g. Doe"
                value={mainMember.surname}
                onChange={(e) => setMM('surname', e.target.value)}
                onBlur={() => touch('surname')}
                maxLength={50}
              />
              {step1Touched.surname && surnameCode && (
                <div className={errCls}>{nameErrorMsg(surnameCode, 'Surname')}</div>
              )}
            </Field>
            <Field label="Date of Birth"><input type="date" className={inputCls} value={mainMember.dateOfBirth} onChange={(e) => setMM('dateOfBirth', e.target.value)} /></Field>
            <Field label="Father's Name"><input className={inputCls} placeholder="Enter father's name" value={mainMember.fatherName} onChange={(e) => setMM('fatherName', e.target.value.trimStart())} /></Field>
            <Field label="Mother's Name"><input className={inputCls} placeholder="Enter mother's name" value={mainMember.motherName} onChange={(e) => setMM('motherName', e.target.value.trimStart())} /></Field>
            <Field label="Gender" required><RadioPills name="gender" options={['Male', 'Female', 'Other']} value={mainMember.gender} onChange={(v) => setMM('gender', v)} /></Field>
            <Field label="Marital Status" required>
              <select
                className={inputCls}
                value={mainMember.maritalStatus}
                onChange={(e) => {
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
            </Field>
            {mainMember.maritalStatus === 'Single' && (
              <Field label="Are you engaged?" required>
                <select className={inputCls} value={mainMember.engagementStatus} onChange={(e) => setMM('engagementStatus', e.target.value)}>
                  <option value="">Select status</option>
                  <option>Yes</option><option>No</option>
                </select>
              </Field>
            )}
            <Field label="Mobile Number" required>
              <input
                className={inputCls}
                placeholder="e.g. 9876543210"
                value={mainMember.mobileNumber}
                onChange={(e) => setMM('mobileNumber', e.target.value)}
                onBlur={() => touch('mobileNumber')}
                maxLength={15}
              />
              {step1Touched.mobileNumber && mobileCode && (
                <div className={errCls}>{mobileErrorMsg(mobileCode)}</div>
              )}
            </Field>
            <Field label="WhatsApp Number">
              <input
                className={inputCls}
                placeholder="e.g. 9876543210"
                value={mainMember.whatsappNumber}
                onChange={(e) => setMM('whatsappNumber', e.target.value)}
                onBlur={() => touch('whatsappNumber')}
                maxLength={15}
              />
            </Field>
            <Field label="Email Address">
              <input
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
            </Field>
            <Field label="Highest Education"><input className={inputCls} placeholder="e.g. Bachelor's Degree" value={mainMember.highestEducation} onChange={(e) => setMM('highestEducation', e.target.value.trimStart())} /></Field>

            <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Current Occupation</h3>
              <span className="text-sm font-semibold text-gray-700">What is your current occupation?</span>
              <ChoiceGrid options={OCCUPATION_TYPES} value={businessWork.occupationType} onChange={(v) => setBW('occupationType', v)} />

              {(businessWork.occupationType === 'Business Owner' || businessWork.occupationType === 'Self Employed') && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Business Details</h3>
                  <Field label="Business Name"><input className={inputCls} placeholder="e.g. Acme Corp" value={businessWork.businessName} onChange={(e) => setBW('businessName', e.target.value.trimStart())} /></Field>
                  <Field label="Business Type">
                    <select className={inputCls} value={businessWork.businessType} onChange={(e) => setBW('businessType', e.target.value)}>
                      <option value="">Select Type</option>
                      <option>Retail</option><option>Wholesale</option><option>Manufacturing</option><option>Agriculture</option>
                      <option>IT / Technology</option><option>Education</option><option>Healthcare</option><option>Construction</option>
                      <option>Transport</option><option>Finance</option><option>Food</option><option>Restaurant</option>
                      <option>Service</option><option>Real Estate</option><option>Professional Services</option><option>Other</option>
                    </select>
                  </Field>
                  <Field label="Industry"><input className={inputCls} placeholder="e.g. Technology" value={businessWork.industry} onChange={(e) => setBW('industry', e.target.value.trimStart())} /></Field>
                  <Field label="Years in Business"><input type="number" min="0" className={inputCls} placeholder="0" value={businessWork.yearsInBusiness} onChange={(e) => setBW('yearsInBusiness', e.target.value)} /></Field>
                  <Field label="Business Address"><input className={inputCls} placeholder="123 Business Rd, Suite 100" value={businessWork.businessAddress} onChange={(e) => setBW('businessAddress', e.target.value.trimStart())} /></Field>
                </div>
              )}

              {businessWork.occupationType === 'Job / Employee' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Employment Details</h3>
                  <Field label="Job Title"><input className={inputCls} placeholder="e.g. Software Engineer" value={businessWork.jobTitle} onChange={(e) => setBW('jobTitle', e.target.value.trimStart())} /></Field>
                  <Field label="Employer / Company"><input className={inputCls} value={businessWork.employer} onChange={(e) => setBW('employer', e.target.value.trimStart())} /></Field>
                  <Field label="Designation"><input className={inputCls} value={businessWork.designation} onChange={(e) => setBW('designation', e.target.value.trimStart())} /></Field>
                  <Field label="Years in Role"><input type="number" min="0" className={inputCls} value={businessWork.yearsInRole} onChange={(e) => setBW('yearsInRole', e.target.value)} /></Field>
                  <Field label="Work Address"><input className={inputCls} value={businessWork.workAddress} onChange={(e) => setBW('workAddress', e.target.value.trimStart())} /></Field>
                </div>
              )}

              {businessWork.occupationType === 'Professional' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Professional Details</h3>
                  <Field label="Profession"><input className={inputCls} placeholder="e.g. Doctor, Lawyer, Consultant" value={businessWork.profession} onChange={(e) => setBW('profession', e.target.value.trimStart())} /></Field>
                  <Field label="Organization / Practice"><input className={inputCls} value={businessWork.organization} onChange={(e) => setBW('organization', e.target.value.trimStart())} /></Field>
                  <Field label="Years of Experience"><input type="number" min="0" className={inputCls} value={businessWork.yearsExperience} onChange={(e) => setBW('yearsExperience', e.target.value)} /></Field>
                  <Field label="Work Address"><input className={inputCls} value={businessWork.workAddress} onChange={(e) => setBW('workAddress', e.target.value.trimStart())} /></Field>
                </div>
              )}

              {businessWork.occupationType === 'Student' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Student Details</h3>
                  <Field label="School / College / Institution" required><input className={inputCls} value={businessWork.institutionName} onChange={(e) => setBW('institutionName', e.target.value.trimStart())} /></Field>
                  <Field label="Education Level" required>
                    <select className={inputCls} value={businessWork.educationLevel} onChange={(e) => setBW('educationLevel', e.target.value)}>
                      <option value="">Select Level</option><option>Primary School</option><option>Secondary School</option><option>Higher Secondary</option><option>Diploma</option><option>Undergraduate</option><option>Postgraduate</option><option>Other</option>
                    </select>
                  </Field>
                  <Field label="Course / Subject"><input className={inputCls} value={businessWork.courseOrSubject} onChange={(e) => setBW('courseOrSubject', e.target.value.trimStart())} /></Field>
                  <Field label="Current Year / Class"><input className={inputCls} value={businessWork.studyYear} onChange={(e) => setBW('studyYear', e.target.value.trimStart())} /></Field>
                  <Field label="Study Status">
                    <select className={inputCls} value={businessWork.studentStatus} onChange={(e) => setBW('studentStatus', e.target.value)}><option value="">Select Status</option><option>Currently Studying</option><option>On Leave</option><option>Completed</option></select>
                  </Field>
                </div>
              )}

              {businessWork.occupationType === 'Retired' && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Retirement Details</h3>
                  <Field label="Previous Occupation"><input className={inputCls} value={businessWork.previousOccupation} onChange={(e) => setBW('previousOccupation', e.target.value.trimStart())} /></Field>
                  <Field label="Retirement Year"><input type="number" min="1900" className={inputCls} value={businessWork.retirementYear} onChange={(e) => setBW('retirementYear', e.target.value)} /></Field>
                </div>
              )}

              {businessWork.occupationType === 'Not Working' && (
                <Field label="Current Status / Reason" required>
                  <textarea className={inputCls} rows={3} placeholder="Please tell us your current status or reason for not working" value={businessWork.notWorkingDetails} onChange={(e) => setBW('notWorkingDetails', e.target.value)} />
                </Field>
              )}

              {businessWork.occupationType === 'Other' && (
                <Field label="Describe Your Occupation" required>
                  <textarea className={inputCls} rows={3} placeholder="Please describe your occupation" value={businessWork.otherOccupationDetails} onChange={(e) => setBW('otherOccupationDetails', e.target.value)} />
                </Field>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-serif font-bold text-brand-700 text-xl mb-1">Address Details</h2>
            <p className="text-sm text-gray-500 mb-4">Please provide the current and permanent residential information.</p>

            <Card title="📍 Current Address">
              <Field label="Address Line 1" required><input className={inputCls} placeholder="Street address, P.O. box, company name" value={currentAddress.addressLine1} onChange={(e) => updateCurrentAddress('addressLine1', e.target.value.trimStart())} maxLength={150} /></Field>
              <Field label="Village" required>
                <select className={inputCls} value={currentAddress.village} onChange={(e) => updateCurrentAddress('village', e.target.value)}>
                  {VILLAGE_OPTIONS.map((village) => <option key={village} value={village === 'Select Village' ? '' : village}>{village}</option>)}
                </select>
              </Field>
              <Field label="City" required>
                <select className={inputCls} value={currentAddress.city} onChange={(e) => updateCurrentAddress('city', e.target.value)}>
                  {CITY_OPTIONS.map((city) => <option key={city} value={city === 'Select City' ? '' : city}>{city}</option>)}
                </select>
              </Field>
            </Card>

            <label className="flex items-start gap-2 text-sm text-gray-700 mb-4 px-1">
              <input type="checkbox" className="mt-0.5" checked={sameAsCurrent} onChange={(e) => toggleSameAsCurrent(e.target.checked)} />
              My permanent address is the same as my current address.
            </label>

            {!sameAsCurrent && (
              <Card title="📍 Permanent Address">
                <Field label="Address Line 1" required><input className={inputCls} value={permanentAddress.addressLine1} onChange={(e) => setPermanentAddress({ ...permanentAddress, addressLine1: e.target.value.trimStart() })} maxLength={150} /></Field>
                <Field label="Village" required>
                  <select className={inputCls} value={permanentAddress.village} onChange={(e) => setPermanentAddress({ ...permanentAddress, village: e.target.value })}>
                    {VILLAGE_OPTIONS.map((village) => <option key={village} value={village === 'Select Village' ? '' : village}>{village}</option>)}
                  </select>
                </Field>
                <Field label="City" required>
                  <select className={inputCls} value={permanentAddress.city} onChange={(e) => setPermanentAddress({ ...permanentAddress, city: e.target.value })}>
                    {CITY_OPTIONS.map((city) => <option key={city} value={city === 'Select City' ? '' : city}>{city}</option>)}
                  </select>
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
                key={idx} index={idx} member={m}
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
          <div>
            <h2 className="font-serif font-bold text-brand-700 text-2xl mb-1">Additional Information</h2>
            <p className="text-sm text-gray-500 mb-5">Please provide any supplementary details to complete your profile.</p>

            <Card title="🏅 Notable Achievements">
              <input className={inputCls} placeholder="Awards, certifications, honors..." value={additionalInfo.achievements} onChange={(e) => setAI('achievements', e.target.value.trimStart())} />
            </Card>
            <Card title="🌐 Professional Profiles / Website">
              <input className={inputCls} placeholder="https://..." value={additionalInfo.professionalProfile} onChange={(e) => setAI('professionalProfile', e.target.value.trim())} />
            </Card>

            <Field label="Additional Remarks" hint="Is there anything else you would like to share that hasn't been covered in previous sections?">
              <textarea className={inputCls} rows={4} placeholder="Type your additional comments here..." value={additionalInfo.remarks} onChange={(e) => setAI('remarks', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 5 && (
          <Review
            mainMember={mainMember}
            currentAddress={currentAddress}
            permanentAddress={sameAsCurrent ? currentAddress : permanentAddress}
            familyMembers={familyMembers}
            businessWork={businessWork}
            additionalInfo={additionalInfo}
            onEditStep={(s) => { setStep(s); window.scrollTo(0, 0); }}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
          />
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          <button type="button" onClick={back} disabled={step === 1} className="text-gray-600 font-semibold text-sm disabled:opacity-30">
            ← {step === 1 ? 'Back' : 'Previous Step'}
          </button>
          {step < 5 ? (
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
