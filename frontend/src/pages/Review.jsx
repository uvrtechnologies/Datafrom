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
    const stream = ed.streamOrSubject || ed.otherSubjectOrCourse;
    if (stream) lines.push(`Stream/Subject: ${stream}`);
    if (ed.courseOrDegree) lines.push(`Course/Degree: ${ed.courseOrDegree}`);
    if (ed.educationStatus) lines.push(`Education Status: ${ed.educationStatus}`);
  }
  return lines;
}

export default function Review({
  mainMember, currentAddress, permanentAddress, familyMembers, businessWork,
  additionalInfo, onEditStep, confirmed, setConfirmed,
}) {
  return (
    <div>
      <div className="text-center mb-5">
        <h2 className="font-serif font-bold text-brand-700 text-2xl">Review &amp; Submit</h2>
        <p className="text-sm text-gray-500 mt-1">Please review your data carefully before final submission to ensure accuracy.</p>
      </div>

      <SectionCard icon="👤" title="Personal Details" onEdit={() => onEditStep(1)}>
        <p className="text-sm"><span className="font-semibold">First Name:</span> {mainMember.firstName || '—'}</p>
        <p className="text-sm"><span className="font-semibold">Surname:</span> {mainMember.surname || '—'}</p>
        <p className="text-sm"><span className="font-semibold">Full Name:</span> {buildDisplayName(mainMember.firstName, mainMember.surname, mainMember.fullName) || '—'}</p>
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
          </div>
        ))}
      </SectionCard>

      <SectionCard icon="💼" title="Your Business / Work" onEdit={() => onEditStep(4)}>
        <p className="text-sm"><span className="font-semibold">Current Occupation:</span> {businessWork.occupationType || '—'}</p>
        {businessWork.businessName && (
          <span className="inline-block mt-2 text-xs font-bold bg-brand-100 text-brand-700 px-2 py-1 rounded">
            {businessWork.businessName}
          </span>
        )}
      </SectionCard>

      <SectionCard
        icon="📝" title="Additional Info" onEdit={() => onEditStep(5)}
        empty={!additionalInfo.remarks && !additionalInfo.achievements && !additionalInfo.professionalProfile}
      >
        {additionalInfo.achievements && <p className="text-sm mt-1"><span className="font-semibold">Achievements:</span> {additionalInfo.achievements}</p>}
        {additionalInfo.professionalProfile && <p className="text-sm mt-1"><span className="font-semibold">Website:</span> {additionalInfo.professionalProfile}</p>}
        {additionalInfo.remarks && <p className="text-sm italic text-gray-700 mt-2">"{additionalInfo.remarks}"</p>}
      </SectionCard>

      <div className="bg-brand-50 rounded-xl p-4 mt-2">
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I confirm that the information provided above is correct and accurate to the best of my knowledge. I understand
          that this data will be securely processed according to the privacy policy.
        </label>
      </div>
    </div>
  );
}
