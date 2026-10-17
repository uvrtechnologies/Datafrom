/**
 * The single source of truth for the admin Excel export of family records.
 *
 * The admin download — GET /api/admin/export/excel (adminController) — uses this
 * module for the database query, the row order and the row set; the worksheet
 * layout comes from services/familySheet.
 */

const Family = require('../models/Family');

const SUBMITTED_STATUSES = ['Submitted', 'Under Review', 'Verified'];

/** Row order of every export: newest submission first. */
const EXPORT_SORT = { createdAt: -1 };

/** The family rows an unfiltered export contains, as a MongoDB query. */
function buildExportQuery() {
  return buildFamilyQuery({}, { submittedOnly: true });
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

function sortSpec(params = {}) {
  const { sortBy = 'createdAt', sortDir = 'desc' } = params;
  return { [sortBy]: sortDir === 'asc' ? 1 : -1 };
}

/**
 * Loads exactly the rows the Excel download contains: submitted families only,
 * in the requested (default: newest-first) order.
 */
async function loadExportFamilies(params = {}) {
  const query = buildFamilyQuery(params, { submittedOnly: true });
  return Family.find(query).sort(sortSpec(params)).lean();
}

module.exports = {
  SUBMITTED_STATUSES,
  EXPORT_SORT,
  buildExportQuery,
  buildFamilyQuery,
  sortSpec,
  loadExportFamilies,
};
