export const DATA_SCHEMA_VERSION = 1;

export const COLLECTIONS = {
  users: 'users',
  patients: 'patients',
  records: 'records',
  appointments: 'appointments',
  clinicalEntries: 'clinicalEntries',
  professionals: 'professionals',
  auditLogs: 'auditLogs',
  loginIdentifiers: 'loginIdentifiers',
};

export const ENTITY_TYPES = {
  patient: 'patient',
  record: 'record',
  appointment: 'appointment',
  clinicalEntry: 'clinicalEntry',
  professional: 'professional',
};

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function formatCNS(value = '') {
  const digits = onlyDigits(value).slice(0, 15);
  let res = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (i === 3 || i === 7 || i === 11)) res += ' ';
    res += digits[i];
  }
  return res;
}

export function buildPatientSearchText(patient) {
  return normalizeText([
    patient.nome,
    patient.nomeMae,
    patient.cns,
    patient.cpf,
    patient.telefone,
    patient.dataNasc,
  ].filter(Boolean).join(' '));
}

export function baseEntity(entity, uid) {
  return {
    ...entity,
    ownerUid: uid,
    schemaVersion: DATA_SCHEMA_VERSION,
    isDeleted: false,
  };
}

export function normalizePatient(patient, uid) {
  return baseEntity({
    ...patient,
    cnsDigits: onlyDigits(patient.cns),
    cpfDigits: onlyDigits(patient.cpf),
    telefoneDigits: onlyDigits(patient.telefone),
    searchText: buildPatientSearchText(patient),
  }, uid);
}

export function normalizeRecord(record, uid) {
  return baseEntity(record, uid);
}

export function normalizeAppointment(appointment, uid) {
  return baseEntity({
    ...appointment,
    dateTimeKey: `${appointment.date || ''}T${appointment.hora || ''}`,
  }, uid);
}

export function normalizeClinicalEntry(entry, uid) {
  return baseEntity(entry, uid);
}

export function normalizeProfessional(prof, uid) {
  return baseEntity({
    ...prof,
    role: prof.role || 'professional',
    mustChangePassword: prof.mustChangePassword ?? false,
    email: prof.email?.toLowerCase().trim() || '',
    cpfDigits: onlyDigits(prof.cpf),
  }, uid);
}
