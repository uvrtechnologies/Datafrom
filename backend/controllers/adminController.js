const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Family = require('../models/Family');
const FamilyKey = require('../models/FamilyKey');

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

// GET /api/admin/families?page=&limit=&search=&state=&city=&occupationType=&businessType=&sortBy=&sortDir=
async function getFamilies(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      state,
      city,
      district,
      occupationType,
      businessType,
      workStatus,
      hasChildren,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    const query = {};

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { familyKey: regex },
        { submissionId: regex },
        { 'mainMember.fullName': regex },
        { 'mainMember.firstName': regex },
        { 'mainMember.surname': regex },
        { 'mainMember.mobileNumber': regex },
        { 'mainMember.email': regex },
        { 'address.current.city': regex },
        { 'address.current.district': regex },
        { 'address.current.state': regex },
        { 'businessWork.businessName': regex },
      ];
    }

    if (state) query['address.current.state'] = new RegExp(`^${state}$`, 'i');
    if (city) query['address.current.city'] = new RegExp(`^${city}$`, 'i');
    if (district) query['address.current.district'] = new RegExp(`^${district}$`, 'i');
    if (occupationType) query['mainMember.occupationType'] = occupationType;
    if (businessType) query['businessWork.businessType'] = new RegExp(businessType, 'i');
    if (workStatus) query['familyMembers.workStatus'] = workStatus;
    if (hasChildren !== undefined) query['children.hasChildren'] = hasChildren === 'true';

    if (dateFrom || dateTo) {
      query.submittedAt = {};
      if (dateFrom) query.submittedAt.$gte = new Date(dateFrom);
      if (dateTo) query.submittedAt.$lte = new Date(dateTo);
    }

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
        city: addrCur.city || '',
        district: addrCur.district || '',
        state: addrCur.state || '',
        occupationType: mm.occupationType,
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

// GET /api/admin/families/:id
async function getFamilyById(req, res, next) {
  try {
    const family = await Family.findById(req.params.id);
    if (!family) return res.status(404).json({ success: false, message: 'Family not found.' });
    const merged = mergeLegacyChildren(family.toObject());
    res.json({ success: true, data: merged });
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
      recent,
      stateAgg,
      cityAgg,
      occupationAgg,
    ] = await Promise.all([
      Family.countDocuments(),
      Family.countDocuments({ submittedAt: { $gte: startOfToday } }),
      Family.countDocuments({ submittedAt: { $gte: startOfWeek } }),
      Family.countDocuments({ submittedAt: { $gte: lastWeekStart, $lt: startOfWeek } }),
      Family.countDocuments({ submittedAt: { $gte: startOfMonth } }),
      Family.countDocuments({ 'mainMember.occupationType': { $in: ['Business Owner', 'Self Employed'] } }),
      Family.countDocuments({ 'mainMember.occupationType': 'Professional' }),
      Family.aggregate([{ $group: { _id: null, total: { $sum: { $size: '$familyMembers' } } } }]),
      Family.aggregate([
        { $project: { studentCount: { $size: { $filter: { input: '$familyMembers', as: 'm', cond: { $eq: ['$$m.workStatus', 'Student'] } } } } } },
        { $group: { _id: null, total: { $sum: '$studentCount' } } },
      ]),
      Family.find().sort({ createdAt: -1 }).limit(5).select('submissionId mainMember.fullName status mainMember.occupationType').lean(),
      Family.aggregate([
        { $group: { _id: '$address.current.state', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      Family.aggregate([
        { $group: { _id: '$address.current.city', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      Family.aggregate([
        { $group: { _id: '$mainMember.occupationType', count: { $sum: 1 } } },
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
          occupationType: r.mainMember.occupationType,
          status: r.status,
        })),
        charts: {
          byState: stateAgg,
          byCity: cityAgg,
          byOccupation: occupationAgg,
        },
      },
    });
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

module.exports = {
  login,
  getFamilies,
  getFamilyById,
  updateFamily,
  deleteFamily,
  getDashboardStats,
  exportFamilies,
};
