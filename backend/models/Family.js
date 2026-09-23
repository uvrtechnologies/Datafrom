const mongoose = require('mongoose');

/**
 * Schema shape follows the "DataSync Pro" 7-step mockups:
 * 1. Personal Details  2. Address  3. Family Members
 * 4. Business/Work     5. Children 6. Additional Info  7. Review
 */

const addressBlockSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, default: '' },
    village: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const mainMemberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, default: '' },
    fatherName: { type: String, default: '' },
    motherName: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Widowed', 'Divorced'], required: true },
    engagementStatus: { type: String, enum: ['Yes', 'No', ''], default: '' },
    mobileNumber: { type: String, required: true },
    whatsappNumber: { type: String, default: '' },
    email: { type: String, default: '' },
    nationality: { type: String, default: '' },
    highestEducation: { type: String, default: '' },
    occupationType: {
      type: String,
      enum: ['Business Owner', 'Job / Employee', 'Self Employed', 'Professional','Farmer', 'Student', 'Retired', 'Not Working', 'Other', ''],
      default: '',
    },
    isCurrentlyWorkingOrBusiness: { type: String, enum: ['Yes', 'No', ''], default: '' },
  },
  { _id: false }
);

const workDetailsSchema = new mongoose.Schema(
  {
    occupation: { type: String, default: '' },
    organization: { type: String, default: '' },
    designation: { type: String, default: '' },
    otherDetails: { type: String, default: '' },
  },
  { _id: false }
);

const businessDetailsSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: '' },
    businessType: { type: String, default: '' },
    otherDetails: { type: String, default: '' },
  },
  { _id: false }
);

const educationDetailsSchema = new mongoose.Schema(
  {
    instituteName: { type: String, default: '' },
    educationLevel: { type: String, default: '' },
    classOrYear: { type: String, default: '' },
    streamOrSubject: { type: String, default: '' },
    courseOrDegree: { type: String, default: '' },
    otherSubjectOrCourse: { type: String, default: '' },
    educationStatus: { type: String, default: '' },
  },
  { _id: false }
);

const familyMemberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    relation: {
      type: String,
      enum: [
        'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister',
        'Grandfather', 'Grandmother', 'Other',
      ],
      required: true,
    },
    otherRelationship: { type: String, default: '' },
    dateOfBirthOrAge: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Widowed', 'Divorced'], required: true },
    engagementStatus: { type: String, enum: ['Yes', 'No', ''], default: '', required: true },
    educationLevel: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    workStatus: {
      type: String,
      enum: ['Working', 'Business', 'Not Working', 'Student', 'Retired', 'Other', ''],
      default: '',
    },
    otherStatus: { type: String, default: '' },
    workDetails: { type: workDetailsSchema, default: () => ({}) },
    businessDetails: { type: businessDetailsSchema, default: () => ({}) },
    educationDetails: { type: educationDetailsSchema, default: () => ({}) },
    jobProfession: { type: String, default: '' },
    companyBusinessName: { type: String, default: '' },
    designation: { type: String, default: '' },
    annualIncome: { type: String, default: '' },
  },
  { _id: true }
);

const businessWorkSchema = new mongoose.Schema(
  {
    occupationType: {
      type: String,
      enum: ['Business Owner', 'Job / Employee', 'Self Employed', 'Professional','Farmer', 'Student', 'Retired', 'Not Working', 'Other', ''],
      default: '',
    },
    businessName: { type: String, default: '' },
    businessType: { type: String, default: '' },
    industry: { type: String, default: '' },
    yearsInBusiness: { type: String, default: '' },
    businessAddress: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    employer: { type: String, default: '' },
    designation: { type: String, default: '' },
    yearsInRole: { type: String, default: '' },
    workAddress: { type: String, default: '' },
    profession: { type: String, default: '' },
    organization: { type: String, default: '' },
    yearsExperience: { type: String, default: '' },
    institutionName: { type: String, default: '' },
    educationLevel: { type: String, default: '' },
    courseOrSubject: { type: String, default: '' },
    studyYear: { type: String, default: '' },
    studentStatus: { type: String, default: '' },
    previousOccupation: { type: String, default: '' },
    retirementYear: { type: String, default: '' },
    otherOccupationDetails: { type: String, default: '' },
  },
  { _id: false }
);

const childSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    age: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
  },
  { _id: true }
);

const additionalInfoSchema = new mongoose.Schema(
  {
    skills: { type: String, default: '' },
    achievements: { type: String, default: '' },
    professionalProfile: { type: String, default: '' },
    householdContext: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { _id: false }
);

const familySchema = new mongoose.Schema(
  {
    familyKey: { type: String, uppercase: true, trim: true, sparse: true, index: true },
    submissionId: { type: String, required: true, unique: true, index: true },
    mainMember: { type: mainMemberSchema, required: true },
    address: {
      current: { type: addressBlockSchema, default: () => ({}) },
      permanent: { type: addressBlockSchema, default: () => ({}) },
      sameAsCurrent: { type: Boolean, default: false },
    },
    familyMembers: { type: [familyMemberSchema], default: [] },
    businessWork: { type: businessWorkSchema, default: () => ({}) },
    children: {
      hasChildren: { type: Boolean, default: false },
      list: { type: [childSchema], default: [] },
    },
    additionalInfo: { type: additionalInfoSchema, default: () => ({}) },
    status: { type: String, enum: ['Submitted', 'Under Review', 'Verified'], default: 'Submitted' },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

familySchema.index({ 'mainMember.fullName': 'text', 'mainMember.mobileNumber': 'text', submissionId: 'text', familyKey: 'text' });
familySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Family', familySchema);
