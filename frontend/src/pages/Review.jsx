import React from 'react';

function SectionCard({ icon, title, onEdit, children, empty }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <span>{icon}</span>{title}
        </h3>
        {onEdit && <button type="button" onClick={onEdit} className="text-brand-600 text-xs font-bold flex items-center gap-1">✎ EDIT</button>}
      </div>
      {empty ? <p className="text-sm text-gray-400">Not provided.</p> : children}
    </div>
  );
}

const fmtAddr = (a) => a && [a.addressLine1, a.village, a.city].filter(Boolean).join(', ');

function buildDisplayName(firstName, surname, fullName) {
  const fn = String(firstName || '').trim();
  const sn = String(surname || '').trim();
  if (fn && sn) return `${fn} ${sn}`;
  if (fn) return fn;
  if (sn) return sn;
  return String(fullName || '').trim();
}

function relationText(m) {
  if (m.relation === 'Other' && m.otherRelationship) return `Other: ${m.otherRelationship}`;
  return m.relation || '—';
}

function statusText(m) {
  if (m.workStatus === 'Other' && m.otherStatus) return `Other: ${m.otherStatus}`;
  return m.workStatus || 'Unspecified';
}

function memberDetails(m) {
  const wd = m.workDetails || {};
  const bd = m.businessDetails || {};
  const ed = m.educationDetails || {};
  const lines = [];
  if (m.workStatus === 'Working') {
    if (wd.occupation) lines.push(`Occupation: ${wd.occupation}`);
    if (wd.organization) lines.push(`Organization: ${wd.organization}`);
    if (wd.designation) lines.push(`Designation: ${wd.designation}`);
    if (wd.otherDetails) lines.push(`Other Details: ${wd.otherDetails}`);
  } else if (m.workStatus === 'Business') {
    if (bd.businessName) lines.push(`Business: ${bd.businessName}`);
    if (bd.businessType) lines.push(`Business Type: ${bd.businessType}`);
    if (bd.otherDetails) lines.push(`Other Details: ${bd.otherDetails}`);
  } else if (m.workStatus === 'Student') {
    if (ed.instituteName) lines.push(`School/College: ${ed.instituteName}`);
    if (ed.educationLevel) {
      let lvl = `Education Level: ${ed.educationLevel}`;
      if (ed.classOrYear) lvl += ` · Class/Year: ${ed.classOrYear}`;
      lines.push(lvl);
    }
    if (ed.educationLevel === 'Other Special' && ed.educationName) {
      lines.push(`Education Name: ${ed.educationName}`);
    }
    const stream = ed.streamOrSubject || ed.otherSubjectOrCourse;
    if (stream) lines.push(`Stream/Subject: ${stream}`);
    if (ed.courseOrDegree) lines.push(`Course/Degree: ${ed.courseOrDegree}`);
    if (ed.educationStatus) lines.push(`Education Status: ${ed.educationStatus}`);
    if (ed.resultType) {
      lines.push(`Result Type: ${ed.resultType}`);
      if (ed.resultType === 'Percentage' && ed.percentage !== '' && ed.percentage != null) {
        lines.push(`Percentage: ${ed.percentage}%`);
      } else if (ed.resultType === 'CGPA' && ed.cgpa !== '' && ed.cgpa != null) {
        lines.push(`CGPA: ${ed.cgpa}`);
      }
    }
  }
  return lines;
}

export default function Review({
  mainMember, currentAddress, permanentAddress, familyMembers, businessWork,
  additionalInfo, onEditStep, confirmed, setConfirmed, confirmationError,
}) {
  return (
    <div>
      <div className="text-center mb-5">
        <h2 className="font-serif font-bold text-brand-700 text-2xl">Review &amp; Submit</h2>
        <p className="text-sm text-gray-500 mt-1">Please review your data carefully before final submission to ensure accuracy.</p>
      </div>

      <SectionCard icon="👤" title="Personal Details" onEdit={() => onEditStep(1)}>
        <p className="text-sm"><span className="font-semibold">Full Name:</span> {buildDisplayName(mainMember.firstName, mainMember.surname, mainMember.fullName) || '—'}</p>
        {mainMember.firstName && <p className="text-sm"><span className="font-semibold">First Name:</span> {mainMember.firstName}</p>}
        {mainMember.surname && <p className="text-sm"><span className="font-semibold">Surname:</span> {mainMember.surname}</p>}
        <p className="text-sm"><span className="font-semibold">DOB:</span> {mainMember.dateOfBirth || '—'}</p>
        <p className="text-sm"><span className="font-semibold">Email:</span> {mainMember.email || '—'}</p>
        <p className="text-sm"><span className="font-semibold">Mobile:</span> {mainMember.mobileNumber || '—'}</p>
      </SectionCard>

      <SectionCard icon="🏠" title="Address Details" onEdit={() => onEditStep(2)}>
        <p className="text-sm font-semibold text-gray-600 mb-0.5">Current Residence:</p>
        <p className="text-sm text-gray-700 mb-2">{fmtAddr(currentAddress) || '—'}</p>
        <p className="text-sm font-semibold text-gray-600 mb-0.5">Permanent Residence:</p>
        <p className="text-sm text-gray-700">{fmtAddr(permanentAddress) || '—'}</p>
      </SectionCard>

      <SectionCard icon="👥" title="Family Members" onEdit={() => onEditStep(3)} empty={familyMembers.length === 0}>
        {familyMembers.map((m, i) => (
          <div key={i} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0 border-gray-50">
            <p className="text-sm font-semibold text-gray-800">
              {buildDisplayName(m.firstName, m.surname, m.fullName) || '(no name)'} <span className="text-gray-400 font-normal">({relationText(m)})</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Status: <span className="font-medium text-gray-700">{statusText(m)}</span></p>
            {memberDetails(m).length > 0 && (
              <div className="mt-2 pl-3 border-l-2 border-brand-200 space-y-0.5">
                {memberDetails(m).map((line, j) => (
                  <p key={j} className="text-xs text-gray-600">{line}</p>
                ))}
              </div>
            )}
            {(m.achievements || m.additionalRemarks || m.startupPlan) && (
              <div className="mt-2 pl-3 border-l-2 border-amber-200 space-y-0.5">
                {m.achievements && <p className="text-xs text-gray-600"><span className="font-semibold">Achievements:</span> {m.achievements}</p>}
                {m.additionalRemarks && <p className="text-xs text-gray-600"><span className="font-semibold">Additional Remarks:</span> {m.additionalRemarks}</p>}
                {m.startupPlan && <p className="text-xs text-gray-600"><span className="font-semibold">Startup Plan:</span> {m.startupPlan}</p>}
              </div>
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard icon="💼" title="Your Business / Work" onEdit={() => onEditStep(1)} empty={!businessWork.occupationType}>
        <p className="text-sm"><span className="font-semibold">Current Occupation:</span> {businessWork.occupationType || '—'}</p>
        {businessWork.businessName && (
          <span className="inline-block mt-2 text-xs font-bold bg-brand-100 text-brand-700 px-2 py-1 rounded">
            {businessWork.businessName}
          </span>
        )}
        {businessWork.occupationType === 'Student' && (
          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
            {businessWork.institutionName && <p className="text-sm"><span className="font-semibold">Institution:</span> {businessWork.institutionName}</p>}
            {businessWork.educationLevel && <p className="text-sm"><span className="font-semibold">Education Level:</span> {businessWork.educationLevel}</p>}
            {businessWork.educationLevel === 'Other Special' && businessWork.educationName && (
              <p className="text-sm"><span className="font-semibold">Education Name:</span> {businessWork.educationName}</p>
            )}
            {['College', 'Diploma', 'Professional Degree', 'Master Degree'].includes(businessWork.educationLevel) && businessWork.courseOrSubject && (
              <p className="text-sm"><span className="font-semibold">Course / Degree:</span> {businessWork.courseOrSubject}</p>
            )}
            {(businessWork.lastClassOrYear || businessWork.studyYear) && (
              <p className="text-sm"><span className="font-semibold">Last Class / Year:</span> {businessWork.lastClassOrYear || businessWork.studyYear}</p>
            )}
            {businessWork.studentStatus && <p className="text-sm"><span className="font-semibold">Study Status:</span> {businessWork.studentStatus}</p>}
            {businessWork.resultType && (
              <>
                <p className="text-sm"><span className="font-semibold">Result Type:</span> {businessWork.resultType}</p>
                {businessWork.resultType === 'Percentage' && businessWork.percentage !== '' && businessWork.percentage != null && (
                  <p className="text-sm"><span className="font-semibold">Percentage:</span> {businessWork.percentage}%</p>
                )}
                {businessWork.resultType === 'CGPA' && businessWork.cgpa !== '' && businessWork.cgpa != null && (
                  <p className="text-sm"><span className="font-semibold">CGPA:</span> {businessWork.cgpa}</p>
                )}
              </>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon="📝" title="Additional Info" onEdit={() => onEditStep(1)}
        empty={!additionalInfo.remarks && !additionalInfo.achievements && !additionalInfo.professionalProfile && !additionalInfo.startupPlan}
      >
        {additionalInfo.achievements && <p className="text-sm mt-1"><span className="font-semibold">Achievements:</span> {additionalInfo.achievements}</p>}
        {additionalInfo.professionalProfile && <p className="text-sm mt-1"><span className="font-semibold">Website:</span> {additionalInfo.professionalProfile}</p>}
        {additionalInfo.remarks && <p className="text-sm italic text-gray-700 mt-2">"{additionalInfo.remarks}"</p>}
        {additionalInfo.startupPlan && <p className="text-sm mt-2"><span className="font-semibold">Startup Plan:</span> {additionalInfo.startupPlan}</p>}
      </SectionCard>

      <div className="bg-brand-50 rounded-xl p-4 mt-2">
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input id="review-confirmed" type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} aria-invalid={!!confirmationError} />
          I confirm that the information provided above is correct and accurate to the best of my knowledge. I understand
          that this data will be securely processed according to the privacy policy.
        </label>
        {confirmationError && <p className="mt-2 text-xs text-red-600" role="alert">{confirmationError}</p>}
      </div>
    </div>
  );
}
