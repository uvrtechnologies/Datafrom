const Family = require('../models/Family');
const { generateSubmissionId } = require('../utils/generateKey');

function isEmptyObj(obj) {
  if (!obj) return true;
  return Object.values(obj).every((v) => v == null || String(v).trim() === '');
}

const MARRIED_RELATIONSHIPS = ['Husband', 'Wife', 'Grandfather', 'Grandmother', 'Father', 'Mother'];
const NEW_EDUCATION_LEVELS = ['School', 'College', 'Diploma', 'Professional Degree', 'Master Degree', 'Other Special'];
const STUDENT_CLASS_REQUIRED_LEVELS = ['Primary School', 'Secondary School', 'Higher Secondary', 'Diploma', 'School', 'College', 'Professional Degree', 'Master Degree'];

const NAME_REGEX = /^[A-Za-z\s]+$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;
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
function validateName(value, fieldLabel) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return `${fieldLabel} is required.`;
  if (trimmed.length < 2) return `${fieldLabel} must be at least 2 characters.`;
  if (trimmed.length > 50) return `${fieldLabel} must be at most 50 characters.`;
  if (!NAME_REGEX.test(trimmed)) return `${fieldLabel} can contain letters and spaces only.`;
  return null;
}

function validateIndianMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (digits.length === 10 && INDIAN_MOBILE_REGEX.test(digits)) return null;
  return 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
}

function buildDisplayFullName(firstName, surname, legacyFullName) {
  const fn = String(firstName || '').trim();
  const sn = String(surname || '').trim();
  if (fn && sn) return `${fn} ${sn}`;
  if (fn) return fn;
  if (sn) return sn;
  return String(legacyFullName || '').trim();
}

function validatePercentageOrCGPA(resultType, percentage, cgpa, pos) {
  if (!resultType) return null;
  if (resultType === 'Percentage') {
    if (percentage === '' || percentage === null || percentage === undefined) return null;
    const pct = Number(percentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return `${pos}: Percentage must be between 0 and 100.`;
    }
  } else if (resultType === 'CGPA') {
    if (cgpa === '' || cgpa === null || cgpa === undefined) return null;
    const c = Number(cgpa);
    if (Number.isNaN(c) || c < 0 || c > 10) {
      return `${pos}: CGPA must be between 0 and 10.`;
    }
  }
  return null;
}

function validateFamilyMember(member, idx) {
  const pos = `Family member ${idx + 1}`;
  const hasFullName = String(member.fullName || '').trim() || String(member.firstName || '').trim();
  if (!hasFullName) return `${pos}: Full Name is required.`;
  if (member.fullName !== undefined && member.fullName !== '') {
    const fnErr = validateName(member.fullName, `${pos}: Full Name`);
    if (fnErr) return fnErr;
  } else if (member.firstName !== undefined) {
    const fnErr = validateName(member.firstName, `${pos}: Full Name`);
    if (fnErr) return fnErr;
  }
  if (!member.relation) return `${pos}: Relationship is required.`;
  if (!member.gender) return `${pos}: Gender is required.`;

  const effectiveMarital = MARRIED_RELATIONSHIPS.includes(member.relation) ? 'Married' : member.maritalStatus;
  if (!effectiveMarital) return `${pos}: Marital Status is required.`;
  if (effectiveMarital === 'Single' && !member.engagementStatus) {
    return `${pos}: Engagement Status is required for single members.`;
  }

  if (member.relation === 'Other' && !String(member.otherRelationship || '').trim()) {
    return `${pos}: Specify Relationship is required for "Other".`;
  }
  if (member.workStatus === 'Other' && !String(member.otherStatus || '').trim()) {
    return `${pos}: Specify Status is required for "Other".`;
  }
  if (member.mobileNumber && validateIndianMobile(member.mobileNumber)) {
    return `${pos}: Please enter a valid 10-digit Indian mobile number.`;
  }

  if (member.workStatus === 'Student') {
    const edu = member.educationDetails || {};
    if (!String(edu.instituteName || '').trim()) return `${pos}: School / College / Institute Name is required for Student.`;
    if (!edu.educationLevel) return `${pos}: Education Level is required for Student.`;
    if (!edu.educationStatus) return `${pos}: Education Status is required for Student.`;
    if (STUDENT_CLASS_REQUIRED_LEVELS.includes(edu.educationLevel) && !String(edu.classOrYear || '').trim()) {
      return `${pos}: Class / Year is required for "${edu.educationLevel}".`;
    }
    if (edu.educationLevel === 'Other Special' && !String(edu.educationName || '').trim()) {
      return `${pos}: Education Name is required for "Other Special".`;
    }
    const pctErr = validatePercentageOrCGPA(edu.resultType, edu.percentage, edu.cgpa, pos);
    if (pctErr) return pctErr;
  }

  if (member.workStatus === 'Working' && (!isEmptyObj(member.businessDetails) || !isEmptyObj(member.educationDetails))) {
  }
  if (member.workStatus === 'Business' && (!isEmptyObj(member.workDetails) || !isEmptyObj(member.educationDetails))) {
  }

  return null;
}

function cleanFamilyMember(member) {
  const next = { ...member };
  next.firstName = String(next.firstName || '').trim();
  next.surname = String(next.surname || '').trim();
  if (!next.fullName) {
    next.fullName = buildDisplayFullName(next.firstName, next.surname, next.fullName);
  } else {
    next.fullName = String(next.fullName).trim();
  }
  if (!next.firstName && next.fullName) {
    const parts = next.fullName.split(' ');
    next.firstName = parts[0] || '';
    next.surname = parts.slice(1).join(' ') || '';
  }

  if (MARRIED_RELATIONSHIPS.includes(next.relation)) {
    next.maritalStatus = 'Married';
    next.engagementStatus = '';
  } else {
    next.engagementStatus = next.maritalStatus === 'Single' ? (next.engagementStatus || '') : '';
  }

  if (next.relation !== 'Other') next.otherRelationship = '';
  if (next.workStatus !== 'Other') next.otherStatus = '';
  if (next.workStatus !== 'Working') {
    next.workDetails = { occupation: '', organization: '', designation: '', otherDetails: '' };
  } else if (!next.workDetails) {
    next.workDetails = { occupation: '', organization: '', designation: '', otherDetails: '' };
  }
  if (next.workStatus !== 'Business') {
    next.businessDetails = { businessName: '', businessType: '', otherDetails: '' };
  } else if (!next.businessDetails) {
    next.businessDetails = { businessName: '', businessType: '', otherDetails: '' };
  }
  if (next.workStatus !== 'Student') {
    next.educationDetails = {
      instituteName: '', educationLevel: '', classOrYear: '', streamOrSubject: '',
      courseOrDegree: '', otherSubjectOrCourse: '', educationStatus: '',
      resultType: '', percentage: '', cgpa: '', educationName: '',
    };
  } else if (!next.educationDetails) {
    next.educationDetails = {
      instituteName: '', educationLevel: '', classOrYear: '', streamOrSubject: '',
      courseOrDegree: '', otherSubjectOrCourse: '', educationStatus: '',
      resultType: '', percentage: '', cgpa: '', educationName: '',
    };
  } else {
    const edu = next.educationDetails;
    if (edu.educationLevel !== 'Other Special') edu.educationName = '';
    if (edu.resultType !== 'Percentage') edu.percentage = '';
    if (edu.resultType !== 'CGPA') edu.cgpa = '';
  }
  if (next.mobileNumber) next.mobileNumber = String(next.mobileNumber).trim();
  if (next.dateOfBirthOrAge) next.dateOfBirthOrAge = String(next.dateOfBirthOrAge).trim();
  ['achievements', 'additionalRemarks', 'startupPlan'].forEach((field) => {
    if (typeof next[field] === 'string') next[field] = next[field].trim();
  });
  return next;
}

function trimAddress(addr) {
  if (!addr) return addr;
  return {
    addressLine1: String(addr.addressLine1 || '').trim(),
    village: String(addr.village || '').trim(),
    city: String(addr.city || '').trim(),
  };
}

function trimBusinessWork(bw) {
  if (!bw) return bw;
  const out = {};
  Object.keys(bw).forEach((k) => {
    out[k] = typeof bw[k] === 'string' ? bw[k].trim() : bw[k];
  });
  return out;
}

function trimAdditionalInfo(ai) {
  if (!ai) return ai;
  const out = {};
  Object.keys(ai).forEach((k) => {
    out[k] = typeof ai[k] === 'string' ? ai[k].trim() : ai[k];
  });
  return out;
}

async function submitFamily(req, res, next) {
  try {
    const { mainMember, familyMembers, businessWork, additionalInfo, address, confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({ success: false, message: 'Please confirm the information is correct before submitting.' });
    }
    if (!mainMember) {
      return res.status(400).json({ success: false, message: 'Please complete all required Personal Details fields.' });
    }

    const hasFullName = String(mainMember.fullName || '').trim() || String(mainMember.firstName || '').trim();
    if (!hasFullName) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (mainMember.fullName !== undefined && mainMember.fullName !== '') {
      const fullNameErr = validateName(mainMember.fullName, 'Full Name');
      if (fullNameErr) return res.status(400).json({ success: false, message: fullNameErr });
    } else if (mainMember.firstName !== undefined) {
      const firstNameErr = validateName(mainMember.firstName, 'Full Name');
      if (firstNameErr) return res.status(400).json({ success: false, message: firstNameErr });
      if (mainMember.surname !== undefined && mainMember.surname !== '') {
        const surnameErr = validateName(mainMember.surname, 'Surname');
        if (surnameErr) return res.status(400).json({ success: false, message: surnameErr });
      }
    }

    if (!mainMember.gender) {
      return res.status(400).json({ success: false, message: 'Gender is required.' });
    }

    const rawMembers = Array.isArray(familyMembers) ? familyMembers : [];
    const hasMarriedFamilyRelation = rawMembers.some(m => MARRIED_RELATIONSHIPS.includes(m.relation));
    const effectiveMaritalStatus = hasMarriedFamilyRelation ? 'Married' : mainMember.maritalStatus;
    if (!effectiveMaritalStatus) {
      return res.status(400).json({ success: false, message: 'Marital status is required.' });
    }

    if (!mainMember.mobileNumber) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }
    const mobileErr = validateIndianMobile(mainMember.mobileNumber);
    if (mobileErr) return res.status(400).json({ success: false, message: mobileErr });

    if (mainMember.email) {
      const emailTrimmed = String(mainMember.email).trim();
      if (!EMAIL_REGEX.test(emailTrimmed)) {
        return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
      }
    }

    if (mainMember.whatsappNumber) {
      const waErr = validateIndianMobile(mainMember.whatsappNumber);
      if (waErr) return res.status(400).json({ success: false, message: `WhatsApp: ${waErr}` });
    }

    if (!businessWork || !businessWork.occupationType) {
      return res.status(400).json({ success: false, message: 'Please select your current occupation.' });
    }

    if (businessWork.occupationType === 'Student') {
      if (!String(businessWork.institutionName || '').trim()) {
        return res.status(400).json({ success: false, message: 'Please provide the institution name for Student.' });
      }
      if (!businessWork.educationLevel) {
        return res.status(400).json({ success: false, message: 'Please provide the education level for Student.' });
      }
      if ((NEW_EDUCATION_LEVELS.includes(businessWork.educationLevel) && businessWork.educationLevel !== 'Other Special') || STUDENT_CLASS_REQUIRED_LEVELS.includes(businessWork.educationLevel)) {
        const hasLastClass = String(businessWork.lastClassOrYear || businessWork.studyYear || '').trim();
        if (!hasLastClass) {
          return res.status(400).json({ success: false, message: 'Please provide the last class or completed year for Student.' });
        }
      }
      if (businessWork.educationLevel === 'Other Special' && !String(businessWork.educationName || '').trim()) {
        return res.status(400).json({ success: false, message: 'Please provide the education name for "Other Special".' });
      }
      const pctErr = validatePercentageOrCGPA(
        businessWork.resultType,
        businessWork.percentage,
        businessWork.cgpa,
        'Applicant'
      );
      if (pctErr) return res.status(400).json({ success: false, message: pctErr });
    }
    if (businessWork.occupationType === 'Not Working' && !String(businessWork.notWorkingDetails || '').trim()) {
      return res.status(400).json({ success: false, message: 'Please share the current status or reason for not working.' });
    }
    if (businessWork.occupationType === 'Other' && !String(businessWork.otherOccupationDetails || '').trim()) {
      return res.status(400).json({ success: false, message: 'Please describe your occupation.' });
    }
    if (businessWork.yearsInBusiness !== '' && businessWork.yearsInBusiness !== undefined && businessWork.yearsInBusiness !== null) {
      if (Number(businessWork.yearsInBusiness) < 0) {
        return res.status(400).json({ success: false, message: 'Years in business cannot be negative.' });
      }
    }

    if (additionalInfo && additionalInfo.professionalProfile) {
      const urlTrimmed = String(additionalInfo.professionalProfile).trim();
      if (!URL_REGEX.test(urlTrimmed)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid professional profile URL starting with http:// or https://.',
        });
      }
    }

    if (address) {
      const cur = address.current || {};
      const validateAddress = (value, label) => {
        const addressLine1 = String(value.addressLine1 || '').trim();
        if (!addressLine1) return `Please complete Address Line 1 in the ${label} address.`;
        if (addressLine1.length < 5) return `Address Line 1 in the ${label} address must be at least 5 characters.`;
        if (addressLine1.length > 150) return `Address Line 1 in the ${label} address must be at most 150 characters.`;
        if (!VILLAGE_OPTIONS.includes(String(value.village || '').trim())) return `Please select a valid Village in the ${label} address.`;
        if (!CITY_OPTIONS.includes(String(value.city || '').trim())) return `Please select a valid City in the ${label} address.`;
        return null;
      };
      const currentError = validateAddress(cur, 'current');
      if (currentError) return res.status(400).json({ success: false, message: currentError });

      if (!address.sameAsCurrent) {
        const perm = address.permanent || {};
        const permanentError = validateAddress(perm, 'permanent');
        if (permanentError) return res.status(400).json({ success: false, message: permanentError });
      }
    }

    for (let i = 0; i < rawMembers.length; i += 1) {
      const err = validateFamilyMember(rawMembers[i], i);
      if (err) return res.status(400).json({ success: false, message: err });
    }
    const cleanedMembers = rawMembers.map(cleanFamilyMember);

    const cleanedFirstName = String(mainMember.firstName || '').trim();
    const cleanedSurname = String(mainMember.surname || '').trim();
    const cleanedFullNameRaw = String(mainMember.fullName || '').trim();
    const finalFullName = cleanedFullNameRaw || buildDisplayFullName(cleanedFirstName, cleanedSurname, mainMember.fullName);
    let finalFirstName = cleanedFirstName;
    let finalSurname = cleanedSurname;
    if (!finalFirstName && finalFullName) {
      const parts = finalFullName.split(' ');
      finalFirstName = parts[0] || '';
      finalSurname = parts.slice(1).join(' ') || '';
    }

    const finalMarital = hasMarriedFamilyRelation ? 'Married' : (mainMember.maritalStatus || '');
    const cleanedMainMember = {
      ...mainMember,
      firstName: finalFirstName,
      surname: finalSurname,
      fullName: finalFullName,
      maritalStatus: finalMarital,
      mobileNumber: String(mainMember.mobileNumber || '').trim(),
      whatsappNumber: String(mainMember.whatsappNumber || '').trim(),
      email: String(mainMember.email || '').trim(),
      fatherName: String(mainMember.fatherName || '').trim(),
      motherName: String(mainMember.motherName || '').trim(),
      highestEducation: String(mainMember.highestEducation || '').trim(),
      engagementStatus: finalMarital === 'Single' ? (mainMember.engagementStatus || '') : '',
    };

    const cleanedAddress = address ? {
      current: trimAddress(address.current),
      permanent: address.sameAsCurrent ? trimAddress(address.current) : trimAddress(address.permanent),
      sameAsCurrent: !!address.sameAsCurrent,
    } : {};

    const cleanedBW = trimBusinessWork(businessWork);
    if (cleanedBW.occupationType === 'Student') {
      if (cleanedBW.educationLevel !== 'Other Special') cleanedBW.educationName = '';
      if (cleanedBW.resultType !== 'Percentage') cleanedBW.percentage = '';
      if (cleanedBW.resultType !== 'CGPA') cleanedBW.cgpa = '';
      if (cleanedBW.lastClassOrYear && !cleanedBW.studyYear) {
        cleanedBW.studyYear = cleanedBW.lastClassOrYear;
      } else if (!cleanedBW.lastClassOrYear && cleanedBW.studyYear) {
        cleanedBW.lastClassOrYear = cleanedBW.studyYear;
      }
    } else {
      cleanedBW.resultType = '';
      cleanedBW.percentage = '';
      cleanedBW.cgpa = '';
      cleanedBW.educationName = '';
      cleanedBW.lastClassOrYear = '';
    }
    const cleanedAI = trimAdditionalInfo(additionalInfo);

    const family = await Family.create({
      submissionId: generateSubmissionId(),
      mainMember: cleanedMainMember,
      familyMembers: cleanedMembers,
      businessWork: cleanedBW,
      children: { hasChildren: false, list: [] },
      additionalInfo: cleanedAI,
      address: cleanedAddress,
      status: 'Submitted',
      submittedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Family details submitted successfully.',
      data: {
        submissionId: family.submissionId,
        submissionDate: family.submittedAt,
        status: 'Submitted',
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitFamily };
