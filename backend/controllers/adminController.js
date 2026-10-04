const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Family = require('../models/Family');
const FamilyKey = require('../models/FamilyKey');
const ExcelJS = require('exceljs');
const { getCompleteFamilyRecord } = require('../services/familyRecordSerializer');

const SUBMITTED_STATUSES = ['Submitted', 'Under Review', 'Verified'];

const VILLAGE_OPTIONS = [
  'Select Village',

  'Asrawad Khurd',
  'Kalod Kartal',
  'Mirjapur',
  'Morod',
  'Ralamandal',
  'Umri Kheda',

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

  'Tejaji Nagar',
  'Indore',
  'Sendal',
  'Ganjinda',
  'Kurawad'
  ,'other'
];

function signToken(admin) {
  return jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function buildFullName(firstName, surname, legacyFullName) {
  const fn = String(firstName || '').trim();
  const sn = String(surname || '').trim();
  if (fn && sn) return `${fn} ${sn}`;
  if (fn) return fn;
  if (sn) return sn;
  return String(legacyFullName || '').trim();
}

function buildMemberFullName(m) {
  if (!m) return '';
  const fromNew = buildFullName(m.firstName, m.surname, m.fullName);
  if (fromNew) return fromNew;
  return m.fullName || m.name || '';
}

function mergeLegacyChildren(familyPojo) {
  const f = familyPojo || {};
  const baseMembers = (Array.isArray(f.familyMembers) ? f.familyMembers : []).map((m) => ({
    ...m,
    _displayName: buildMemberFullName(m),
  }));
  const legacyList = f.children && Array.isArray(f.children.list) ? f.children.list : [];
  const synthesized = legacyList.map((child) => ({
    _id: `${child._id || 'child'}_legacy`,
    fullName: child.fullName || '',
    firstName: child.firstName || '',
    surname: child.surname || '',
    _displayName: buildFullName(child.firstName, child.surname, child.fullName),
    relation: child.gender === 'Male' ? 'Son' : child.gender === 'Female' ? 'Daughter' : 'Other',
    otherRelationship: '',
    dateOfBirthOrAge: child.age || '',
    gender: child.gender || '',
    maritalStatus: 'Single',
    mobileNumber: '',
    workStatus: 'Student',
    otherStatus: '',
    workDetails: { occupation: '', organization: '', designation: '', otherDetails: '' },
    businessDetails: { businessName: '', businessType: '', otherDetails: '' },
    educationDetails: {
      instituteName: '', educationLevel: '', classOrYear: '', streamOrSubject: '',
      courseOrDegree: '', otherSubjectOrCourse: '', educationStatus: 'Currently Studying',
    },
    _isLegacyChild: true,
  }));
  return { ...f, familyMembersLegacyMerged: [...baseMembers, ...synthesized] };
}

function buildFamilyQuery(params, { submittedOnly = false } = {}) {
  const {
    search = '', name = '', state, city, district, occupationType, businessType,
    workStatus, status, hasChildren, dateFrom, dateTo, userType = '', category = '',
  } = params;
  const query = {};

  const searchParts = [];

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    searchParts.push(
      { familyKey: regex }, { submissionId: regex },
      { 'mainMember.fullName': regex }, { 'mainMember.firstName': regex },
      { 'mainMember.surname': regex }, { 'mainMember.mobileNumber': regex },
      { 'mainMember.email': regex }, { 'address.current.city': regex },
      { 'address.current.village': regex }, { 'address.current.addressLine1': regex },
      { 'address.current.district': regex }, { 'address.current.state': regex },
      { 'businessWork.occupationType': regex }, { 'businessWork.businessName': regex },
      { 'familyMembers.fullName': regex }, { 'familyMembers.firstName': regex },
      { 'familyMembers.surname': regex }, { 'familyMembers.mobileNumber': regex },
      { 'familyMembers.relation': regex },
    );
  }

  if (name) {
    const nameRegex = new RegExp(name.trim(), 'i');
    searchParts.push(
      { 'mainMember.fullName': nameRegex },
      { 'mainMember.firstName': nameRegex },
      { 'mainMember.surname': nameRegex },
      { 'familyMembers.fullName': nameRegex },
      { 'familyMembers.firstName': nameRegex },
      { 'familyMembers.surname': nameRegex },
    );
  }

  if (searchParts.length > 0) {
    query.$or = searchParts;
  }

  if (state) query['address.current.state'] = new RegExp(`^${state}$`, 'i');
  if (city) query['address.current.city'] = new RegExp(`^${city}$`, 'i');
  if (params.village) query['address.current.village'] = new RegExp(`^${params.village}$`, 'i');
  if (district) query['address.current.district'] = new RegExp(`^${district}$`, 'i');
  if (occupationType) query['businessWork.occupationType'] = occupationType;

  const effectiveType = userType || category;
  if (effectiveType === 'Student') {
    query['businessWork.occupationType'] = 'Student';
  } else if (effectiveType === 'Business Owner') {
    query['businessWork.occupationType'] = { $in: ['Business Owner', 'Self Employed'] };
  } else if (occupationType) {
    query['businessWork.occupationType'] = occupationType;
  }

  if (businessType) query['businessWork.businessType'] = new RegExp(businessType, 'i');
  if (workStatus) query['familyMembers.workStatus'] = workStatus;
  if (hasChildren !== undefined) query['children.hasChildren'] = hasChildren === 'true';
  if (status && SUBMITTED_STATUSES.includes(status)) query.status = status;
  else if (submittedOnly) query.status = { $in: SUBMITTED_STATUSES };

  if (dateFrom || dateTo) {
    query.submittedAt = {};
    if (dateFrom) query.submittedAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const endOfDate = new Date(dateTo);
      endOfDate.setUTCHours(23, 59, 59, 999);
      query.submittedAt.$lte = endOfDate;
    }
  }

  return query;
}

// POST /api/admin/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(admin);
    res.json({
      success: true,
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, mobileNumber: admin.mobileNumber, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/admins
async function createAdmin(req, res, next) {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const mobileNumber = String(req.body.mobileNumber || '').trim();
    const password = String(req.body.password || '');
    const role = req.body.role === 'viewer' ? 'viewer' : 'admin';

    if (name.length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An admin with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.create({ name, email, mobileNumber, passwordHash, role });
    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      data: { id: admin._id, name: admin.name, email: admin.email, mobileNumber: admin.mobileNumber, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/families?page=&limit=&search=&state=&city=&occupationType=&businessType=&sortBy=&sortDir=
async function getFamilies(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query;
    const query = buildFamilyQuery(req.query);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

    const families = await Family.find(query)
      .sort(sort)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Family.countDocuments(query);

    const rows = families.map((f) => {
      const merged = mergeLegacyChildren(f);
      const mm = merged.mainMember || {};
      const addrCur = merged.address?.current || {};
      return {
        _id: merged._id,
        submissionId: merged.submissionId,
        familyKey: merged.familyKey,
        mainMemberFirstName: mm.firstName || '',
        mainMemberSurname: mm.surname || '',
        mainMemberName: buildFullName(mm.firstName, mm.surname, mm.fullName),
        mobileNumber: mm.mobileNumber,
        village: addrCur.village || '',
        city: addrCur.city || '',
        district: addrCur.district || '',
        state: addrCur.state || '',
        occupationType: merged.businessWork?.occupationType || '',
        numberOfFamilyMembers: merged.familyMembersLegacyMerged?.length || merged.familyMembers.length,
        submissionDate: merged.submittedAt,
        status: merged.status,
      };
    });

    res.json({
      success: true,
      data: rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/students?page=&limit=&search=
async function getStudents(req, res, next) {
  try {
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const search = String(req.query.search || '').trim();
    const studentMatch = { 'familyMembers.workStatus': 'Student' };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      Object.assign(studentMatch, {
        $or: [
          { 'familyMembers.fullName': searchRegex },
          { 'familyMembers.firstName': searchRegex },
          { 'familyMembers.surname': searchRegex },
          { 'familyMembers.mobileNumber': searchRegex },
          { 'familyMembers.educationDetails.instituteName': searchRegex },
          { 'familyMembers.educationDetails.educationLevel': searchRegex },
          { 'familyMembers.educationDetails.classOrYear': searchRegex },
          { 'familyMembers.educationDetails.streamOrSubject': searchRegex },
        ],
      });
    }

    const [result] = await Family.aggregate([
      { $match: { 'familyMembers.workStatus': 'Student' } },
      { $unwind: '$familyMembers' },
      { $match: studentMatch },
      {
        $project: {
          _id: '$familyMembers._id',
          fullName: '$familyMembers.fullName',
          firstName: '$familyMembers.firstName',
          surname: '$familyMembers.surname',
          mobileNumber: '$familyMembers.mobileNumber',
          gender: '$familyMembers.gender',
          dateOfBirthOrAge: '$familyMembers.dateOfBirthOrAge',
          educationDetails: '$familyMembers.educationDetails',
          createdAt: 1,
        },
      },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1, fullName: 1, _id: 1 } },
            { $skip: skip },
            { $limit: limitNum },
            { $project: { _id: 0, studentId: '$_id', fullName: 1, firstName: 1, surname: 1, mobileNumber: 1, gender: 1, dateOfBirthOrAge: 1, educationDetails: 1 } },
          ],
          pagination: [{ $count: 'total' }],
        },
      },
    ]);

    const total = result?.pagination[0]?.total || 0;
    res.json({
      success: true,
      data: result?.data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/occupations/:type?page=&limit=&search=
async function getOccupationMembers(req, res, next) {
  try {
    const occupationTypes = {
      'business-owners': ['Business Owner', 'Self Employed'],
      professionals: ['Professional'],
    };
    const requestedTypes = occupationTypes[req.params.type];
    if (!requestedTypes) {
      return res.status(404).json({ success: false, message: 'Occupation list not found.' });
    }

    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const query = { 'businessWork.occupationType': { $in: requestedTypes } };
    const search = String(req.query.search || '').trim();

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      query.$or = [
        { 'mainMember.fullName': searchRegex },
        { 'mainMember.firstName': searchRegex },
        { 'mainMember.surname': searchRegex },
        { 'mainMember.mobileNumber': searchRegex },
        { 'mainMember.email': searchRegex },
        { 'businessWork.businessName': searchRegex },
        { 'businessWork.businessType': searchRegex },
        { 'businessWork.industry': searchRegex },
        { 'businessWork.jobTitle': searchRegex },
        { 'businessWork.employer': searchRegex },
        { 'businessWork.designation': searchRegex },
        { 'businessWork.profession': searchRegex },
        { 'businessWork.organization': searchRegex },
      ];
    }

    const [result] = await Family.aggregate([
      { $match: query },
      {
        $project: {
          _id: 1,
          mainMember: 1,
          businessWork: 1,
          createdAt: 1,
        },
      },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1, 'mainMember.fullName': 1, _id: 1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                fullName: '$mainMember.fullName',
                firstName: '$mainMember.firstName',
                surname: '$mainMember.surname',
                mobileNumber: '$mainMember.mobileNumber',
                email: '$mainMember.email',
                gender: '$mainMember.gender',
                occupationType: '$businessWork.occupationType',
                businessName: '$businessWork.businessName',
                businessType: '$businessWork.businessType',
                industry: '$businessWork.industry',
                designation: '$businessWork.designation',
                jobTitle: '$businessWork.jobTitle',
                employer: '$businessWork.employer',
                profession: '$businessWork.profession',
                organization: '$businessWork.organization',
                yearsInBusiness: '$businessWork.yearsInBusiness',
                yearsInRole: '$businessWork.yearsInRole',
                yearsExperience: '$businessWork.yearsExperience',
              },
            },
          ],
          pagination: [{ $count: 'total' }],
        },
      },
    ]);

    const total = result?.pagination[0]?.total || 0;
    res.json({
      success: true,
      data: result?.data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/families/:id
async function getFamilyById(req, res, next) {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found.' });
    const merged = mergeLegacyChildren(family.toObject());
    const { completeDetails } = getCompleteFamilyRecord(merged);
    res.json({ success: true, data: { ...merged, completeFamilyDetails: completeDetails } });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/families/:id
async function updateFamily(req, res, next) {
  try {
    const updates = req.body;
    delete updates.familyKey;
    delete updates.submissionId;

    const family = await Family.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!family) return res.status(404).json({ success: false, message: 'Family not found.' });
    res.json({ success: true, data: family });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/families/:id
async function deleteFamily(req, res, next) {
  try {
    const family = await Family.findByIdAndDelete(req.params.id);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found.' });

    await FamilyKey.findOneAndUpdate(
      { familyKey: family.familyKey },
      { status: 'UNUSED', usedBy: null, usedAt: null, familyRef: null }
    );

    res.json({ success: true, message: 'Family record deleted.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/villages/overview
async function getVillageOverview(req, res, next) {
  try {
    const villageData = await Family.aggregate([
      {
        $group: {
          _id: '$address.current.village',
          total: { $sum: 1 },
          students: {
            $sum: {
              $cond: [{ $eq: ['$businessWork.occupationType', 'Student'] }, 1, 0],
            },
          },
          businessOwners: {
            $sum: {
              $cond: [
                { $in: ['$businessWork.occupationType', ['Business Owner', 'Self Employed']] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $match: { _id: { $nin: [null, ''] } } },
      { $sort: { total: -1 } },
    ]);

    const villages = villageData.map((v) => ({
      village: v._id,
      total: v.total,
      students: v.students,
      businessOwners: v.businessOwners,
    }));

    res.json({
      success: true,
      data: { villages },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/dashboard/stats
async function getDashboardStats(req, res, next) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastWeekStart = new Date(startOfWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const [
      totalRecords,
      submittedToday,
      submittedThisWeek,
      submittedLastWeek,
      submittedThisMonth,
      businessOwners,
      professionals,
      familyMembersAgg,
      studentsAgg,
      mainMemberStudents,
      recent,
      cityAgg,
      villageAgg,
      villageDetailedAgg,
      occupationAgg,
    ] = await Promise.all([
      Family.countDocuments(),
      Family.countDocuments({ submittedAt: { $gte: startOfToday } }),
      Family.countDocuments({ submittedAt: { $gte: startOfWeek } }),
      Family.countDocuments({ submittedAt: { $gte: lastWeekStart, $lt: startOfWeek } }),
      Family.countDocuments({ submittedAt: { $gte: startOfMonth } }),
      Family.countDocuments({ 'businessWork.occupationType': { $in: ['Business Owner', 'Self Employed'] } }),
      Family.countDocuments({ 'businessWork.occupationType': 'Professional' }),
      Family.aggregate([{ $group: { _id: null, total: { $sum: { $size: '$familyMembers' } } } }]),
      Family.aggregate([
        { $project: { studentCount: { $size: { $filter: { input: '$familyMembers', as: 'm', cond: { $eq: ['$$m.workStatus', 'Student'] } } } } } },
        { $group: { _id: null, total: { $sum: '$studentCount' } } },
      ]),
      Family.countDocuments({ 'businessWork.occupationType': 'Student' }),
      Family.find().sort({ submittedAt: -1 }).limit(5).select('submissionId mainMember businessWork status submittedAt').lean(),
      Family.aggregate([
        { $group: { _id: '$address.current.city', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      Family.aggregate([
        { $group: { _id: '$address.current.village', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      Family.aggregate([
        { $group: { _id: '$businessWork.occupationType', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
      ]),
    ]);

    const weekChangePct = submittedLastWeek > 0
      ? Math.round(((submittedThisWeek - submittedLastWeek) / submittedLastWeek) * 100)
      : submittedThisWeek > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        cards: {
          totalRecords,
          submittedToday,
          submittedThisWeek,
          submittedThisMonth,
          businessOwners,
          professionals,
          totalFamilyMembers: familyMembersAgg[0]?.total || 0,
          totalStudents: studentsAgg[0]?.total || 0,
          weekChangePct,
        },
        recentSubmissions: recent.map((r) => ({
          submissionId: r.submissionId,
          firstName: r.mainMember.firstName || '',
          surname: r.mainMember.surname || '',
          name: buildFullName(r.mainMember.firstName, r.mainMember.surname, r.mainMember.fullName),
          occupationType: r.businessWork?.occupationType || '',
          submittedAt: r.submittedAt,
          status: r.status,
        })),
        charts: {
          byCity: cityAgg,
          byVillage: villageAgg,
          byOccupation: occupationAgg,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/export/excel
async function exportFamiliesExcel(req, res, next) {
  try {
    const query = buildFamilyQuery(req.query, { submittedOnly: true });
    const { sortBy = 'createdAt', sortDir = 'desc' } = req.query;
    const families = await Family.find(query)
      .sort({ [sortBy]: sortDir === 'asc' ? 1 : -1 })
      .lean();
    const records = families.map((family) => getCompleteFamilyRecord(mergeLegacyChildren(family)).row);
    const headerSource = records.length
      ? records
      : [getCompleteFamilyRecord(mergeLegacyChildren(new Family().toObject())).row];
    const headers = [...new Set(headerSource.flatMap((record) => Object.keys(record)))];
    const completeDetailsIndex = headers.indexOf('Complete Family Details');
    if (completeDetailsIndex !== -1) {
      headers.splice(completeDetailsIndex, 1);
      headers.push('Complete Family Details');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Completed Family Records');
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: header === 'Complete Family Details' ? 52 : Math.min(Math.max(header.length + 3, 18), 40),
    }));
    worksheet.addRows(records.map((record) => Object.fromEntries(headers.map((header) => {
      const value = record[header] ?? '';
      const isDateOfBirth = header.endsWith('/ Date Of Birth');
      return [header, isDateOfBirth && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00.000Z`)
        : value];
    }))));
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = `A1:${worksheet.getColumn(headers.length).letter}${Math.max(1, records.length + 1)}`;

    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { vertical: 'top', wrapText: true };
        let lineCount = 1;
        row.eachCell((cell) => {
          if (cell.value instanceof Date) cell.numFmt = 'yyyy-mm-dd hh:mm';
          if (typeof cell.value === 'string') lineCount = Math.max(lineCount, cell.value.split('\n').length);
        });
        row.height = Math.min(Math.max(lineCount * 15, 20), 300);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="completed-family-records.xlsx"',
    });
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/export
async function exportFamilies(req, res, next) {
  try {
    req.query.limit = '100000';
    req.query.page = '1';
    const chunks = [];
    const fakeRes = { json: (payload) => chunks.push(payload) };
    await getFamilies(req, fakeRes, next);
    const payload = chunks[0];
    if (!payload) return;

    res.json({
      success: true,
      message: 'Use the returned rows on the client to generate the Excel/CSV/PDF file (see client/src/utils/exportUtils.js).',
      count: payload.data.length,
      data: payload.data,
    });
  } catch (err) {
    next(err);
  }
}

async function getVillagesList(req, res, next) {
  try {
    const dynamicVillages = await Family.distinct('address.current.village');
    const staticVillages = VILLAGE_OPTIONS.filter(v => v !== 'Select Village');
    const combined = [...staticVillages, ...dynamicVillages]
      .filter(v => v != null && String(v).trim() !== '')
      .map(v => String(v).trim());
    const sorted = [...new Set(combined)].sort((a, b) => a.localeCompare(b));
    res.json({ success: true, data: { villages: sorted } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  createAdmin,
  getFamilies,
  getStudents,
  getOccupationMembers,
  getFamilyById,
  updateFamily,
  deleteFamily,
  getVillagesList,
  getVillageOverview,
  getDashboardStats,
  exportFamilies,
  exportFamiliesExcel,
};
