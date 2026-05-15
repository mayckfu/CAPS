import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, firestore } from './firebase';
import {
  COLLECTIONS,
  DATA_SCHEMA_VERSION,
  ENTITY_TYPES,
  normalizeAppointment,
  normalizeClinicalEntry,
  onlyDigits,
  normalizePatient,
  normalizeProfessional,
  normalizeRecord,
} from './dbSchema';
import { localDateInputValue } from '../utils/recordConsolidation';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function requireUserId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Usuario nao autenticado.');
  return uid;
}

function sharedCollection(name) {
  return collection(firestore, name);
}

function sharedDoc(name, id) {
  return doc(firestore, name, id);
}

function withTimestamps(entity) {
  const now = new Date().toISOString();
  return {
    ...entity,
    updatedAt: now,
    createdAt: entity.createdAt || now,
  };
}

function userRootDoc() {
  return doc(firestore, 'users', requireUserId());
}

async function findLegacyProfessionalForUser(user) {
  const matches = [];
  if (user.uid) {
    const uidSnap = await getDocs(query(sharedCollection(COLLECTIONS.professionals), where('uid', '==', user.uid)));
    matches.push(...uidSnap.docs.map(item => ({ id: item.id, ...item.data() })));
  }

  const email = user.email?.toLowerCase().trim();
  if (email) {
    const emailSnap = await getDocs(query(sharedCollection(COLLECTIONS.professionals), where('email', '==', email)));
    matches.push(...emailSnap.docs.map(item => ({ id: item.id, ...item.data() })));
  }

  return matches.find(item => item.isDeleted !== true) || null;
}

async function saveLoginIdentifier(prof) {
  const cpfDigits = onlyDigits(prof.cpf);
  const email = prof.email?.toLowerCase().trim();
  if (!cpfDigits || !email) return;

  await setDoc(sharedDoc(COLLECTIONS.loginIdentifiers, cpfDigits), {
    email,
    uid: prof.uid || prof.id || '',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

function normalizeEntity(name, entity, uid) {
  if (name === COLLECTIONS.patients) return normalizePatient(entity, uid);
  if (name === COLLECTIONS.records) return normalizeRecord(entity, uid);
  if (name === COLLECTIONS.appointments) return normalizeAppointment(entity, uid);
  if (name === COLLECTIONS.clinicalEntries) return normalizeClinicalEntry(entity, uid);
  if (name === COLLECTIONS.professionals || name === COLLECTIONS.users) return normalizeProfessional(entity, uid);
  return entity;
}

async function listCollection(name, constraints = []) {
  try {
    const ref = sharedCollection(name);
    const snap = await getDocs(constraints.length ? query(ref, ...constraints) : ref);
    return snap.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(item => item.isDeleted !== true);
  } catch (err) {
    console.error(`Erro ao listar colecao ${name}:`, err);
    throw err;
  }
}

async function logAudit(action, entityType, entityId, details = {}) {
  const id = generateId();
  const payload = withTimestamps({
    id,
    action,
    entityType,
    entityId,
    ownerUid: requireUserId(),
    schemaVersion: DATA_SCHEMA_VERSION,
    details,
  });
  await setDoc(sharedDoc(COLLECTIONS.auditLogs, id), payload);
  return payload;
}

async function saveEntity(name, entity, entityType) {
  const uid = requireUserId();
  const id = entity.id || generateId();
  const payload = withTimestamps(normalizeEntity(name, { ...entity, id }, uid));
  
  await setDoc(sharedDoc(name, id), payload, { merge: true });
  
  // Auditoria em background para não travar a UI
  logAudit(entity.id ? 'update' : 'create', entityType, id).catch(e => console.warn('Audit fail:', e));
  
  return payload;
}

async function deleteEntity(name, id, entityType) {
  await deleteDoc(sharedDoc(name, id));
  logAudit('delete', entityType, id).catch(e => console.warn('Audit fail:', e));
}

export async function ensureDatabaseProfile(user) {
  if (!user) return null;
  const ref = userRootDoc();
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  const legacyProfessional = await findLegacyProfessionalForUser(user).catch(err => {
    console.warn('Nao foi possivel buscar cadastro legado do profissional:', err);
    return null;
  });
  const now = new Date().toISOString();
  const payload = {
    uid: user.uid,
    email: user.email || '',
    displayName: existing.displayName || legacyProfessional?.displayName || user.displayName || '',
    cpf: existing.cpf || legacyProfessional?.cpf || '',
    cpfDigits: existing.cpfDigits || legacyProfessional?.cpfDigits || onlyDigits(legacyProfessional?.cpf),
    cns: existing.cns || legacyProfessional?.cns || '',
    cbo: existing.cbo || legacyProfessional?.cbo || '',
    role: snap.exists() ? (existing.role || 'professional') : (legacyProfessional?.role || 'admin'),
    mustChangePassword: user.mustChangePassword ?? (snap.exists() ? (existing.mustChangePassword ?? false) : (legacyProfessional?.mustChangePassword ?? false)),
    providerId: user.providerData?.[0]?.providerId || 'password',
    schemaVersion: DATA_SCHEMA_VERSION,
    updatedAt: now,
    createdAt: existing.createdAt || now,
  };
  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function getPatients() {
  const patients = await listCollection(COLLECTIONS.patients);
  return patients.sort((a, b) => (a.searchText || a.nome || '').localeCompare(b.searchText || b.nome || ''));
}

export async function savePatient(patient) {
  return saveEntity(COLLECTIONS.patients, patient, ENTITY_TYPES.patient);
}

export async function deletePatient(id) {
  const batch = writeBatch(firestore);
  batch.delete(sharedDoc(COLLECTIONS.patients, id));

  const [records, appointments, entries] = await Promise.all([
    getRecords(id),
    getAppointments(null, id),
    getClinicalEntries(id),
  ]);

  records.forEach(record => batch.delete(sharedDoc(COLLECTIONS.records, record.id)));
  appointments.forEach(appt => batch.delete(sharedDoc(COLLECTIONS.appointments, appt.id)));
  entries.forEach(entry => batch.delete(sharedDoc(COLLECTIONS.clinicalEntries, entry.id)));

  await batch.commit();
  await logAudit('deleteCascade', ENTITY_TYPES.patient, id, {
    records: records.length,
    appointments: appointments.length,
    clinicalEntries: entries.length,
  });
}

export async function getRecords(patientId = null) {
  const constraints = patientId ? [where('patientId', '==', patientId)] : [];
  const records = await listCollection(COLLECTIONS.records, constraints);
  return records.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

export async function getRecordsByMonth(mesRef) {
  // Busca global de registros por mês de referência (Ex: "05/2026")
  const constraints = [where('mesRef', '==', mesRef)];
  return listCollection(COLLECTIONS.records, constraints);
}

export async function saveRecord(record) {
  return saveEntity(COLLECTIONS.records, record, ENTITY_TYPES.record);
}

export async function deleteRecord(id) {
  return deleteEntity(COLLECTIONS.records, id, ENTITY_TYPES.record);
}

export async function getRecord(id) {
  const records = await getRecords();
  return records.find(record => record.id === id) || null;
}

export async function getClinicalEntries(patientId = null) {
  const constraints = patientId ? [where('patientId', '==', patientId)] : [];
  const entries = await listCollection(COLLECTIONS.clinicalEntries, constraints);
  return entries.sort((a, b) => new Date(b.dataAtendimento || b.createdAt || 0) - new Date(a.dataAtendimento || a.createdAt || 0));
}

export async function saveClinicalEntry(entry) {
  return saveEntity(COLLECTIONS.clinicalEntries, entry, ENTITY_TYPES.clinicalEntry);
}

export async function deleteClinicalEntry(id) {
  return deleteEntity(COLLECTIONS.clinicalEntries, id, ENTITY_TYPES.clinicalEntry);
}

export async function getAppointments(date = null, patientId = null) {
  const constraints = [];
  if (date) constraints.push(where('date', '==', date));
  if (patientId) constraints.push(where('patientId', '==', patientId));
  const appointments = await listCollection(COLLECTIONS.appointments, constraints);
  return appointments.sort((a, b) => (a.dateTimeKey || '').localeCompare(b.dateTimeKey || ''));
}

export async function saveAppointment(appt) {
  return saveEntity(COLLECTIONS.appointments, appt, ENTITY_TYPES.appointment);
}

export async function deleteAppointment(id) {
  return deleteEntity(COLLECTIONS.appointments, id, ENTITY_TYPES.appointment);
}

export async function getAuditLogs() {
  const logs = await listCollection(COLLECTIONS.auditLogs);
  return logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function exportData() {
  const data = {
    patients: await getPatients(),
    records: await getRecords(),
    appointments: await getAppointments(),
    clinicalEntries: await getClinicalEntries(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `caps_backup_${localDateInputValue()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.patients || !data.records) {
          reject('Formato de arquivo invalido');
          return;
        }

        const batch = writeBatch(firestore);
        const uid = requireUserId();
        data.patients.forEach(patient => {
          const id = patient.id || generateId();
          batch.set(sharedDoc(COLLECTIONS.patients, id), withTimestamps(normalizePatient({ ...patient, id }, uid)), { merge: true });
        });
        data.records.forEach(record => {
          const id = record.id || generateId();
          batch.set(sharedDoc(COLLECTIONS.records, id), withTimestamps(normalizeRecord({ ...record, id }, uid)), { merge: true });
        });
        (data.appointments || []).forEach(appt => {
          const id = appt.id || generateId();
          batch.set(sharedDoc(COLLECTIONS.appointments, id), withTimestamps(normalizeAppointment({ ...appt, id }, uid)), { merge: true });
        });
        (data.clinicalEntries || []).forEach(entry => {
          const id = entry.id || generateId();
          batch.set(sharedDoc(COLLECTIONS.clinicalEntries, id), withTimestamps(normalizeClinicalEntry({ ...entry, id }, uid)), { merge: true });
        });
        await batch.commit();
        await logAudit('import', 'backup', 'json', {
          patients: data.patients.length,
          records: data.records.length,
          appointments: data.appointments?.length || 0,
          clinicalEntries: data.clinicalEntries?.length || 0,
        });
        resolve(true);
      } catch {
        reject('Erro ao ler arquivo JSON');
      }
    };
    reader.readAsText(file);
  });
}

export async function getProfessionals() {
  const [users, legacyProfessionals] = await Promise.all([
    listCollection(COLLECTIONS.users).catch(err => {
      console.warn('Nao foi possivel listar usuarios do Firestore:', err);
      return [];
    }),
    listCollection(COLLECTIONS.professionals).catch(err => {
      console.warn('Nao foi possivel listar profissionais legados:', err);
      return [];
    }),
  ]);

  const byKey = new Map();

  users.forEach(item => {
    const key = item.uid || item.id || item.email;
    if (!key) return;
    byKey.set(key, {
      ...item,
      id: item.uid || item.id,
      uid: item.uid || item.id,
      sourceCollection: COLLECTIONS.users,
    });
  });

  legacyProfessionals.forEach(item => {
    const key = item.uid || item.email || item.id;
    if (!key || byKey.has(key)) return;
    byKey.set(key, {
      ...item,
      sourceCollection: COLLECTIONS.professionals,
    });
  });

  return Array.from(byKey.values())
    .filter(item => item.isDeleted !== true)
    .sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''));
}

export async function saveProfessional(prof) {
  const normalizedInput = {
    ...prof,
    cpfDigits: onlyDigits(prof.cpf),
  };

  if (prof.sourceCollection === COLLECTIONS.users || prof.uid) {
    const uid = prof.uid || prof.id;
    if (uid) {
      const payload = {
        ...normalizedInput,
        id: uid,
        uid,
      };
      delete payload.sourceCollection;
      const saved = await saveEntity(COLLECTIONS.users, payload, ENTITY_TYPES.professional);
      await saveLoginIdentifier(saved);
      return saved;
    }
  }
  const saved = await saveEntity(COLLECTIONS.professionals, normalizedInput, ENTITY_TYPES.professional);
  await saveLoginIdentifier(saved);
  return saved;
}

export async function resolveLoginEmail(identifier) {
  const value = String(identifier || '').trim();
  if (!value) return '';
  if (value.includes('@')) return value.toLowerCase();

  const cpfDigits = onlyDigits(value);
  if (cpfDigits.length !== 11) {
    throw new Error('Informe um CPF com 11 digitos ou um e-mail valido.');
  }

  const snap = await getDoc(sharedDoc(COLLECTIONS.loginIdentifiers, cpfDigits));
  if (!snap.exists() || !snap.data()?.email) {
    throw new Error('CPF nao encontrado. Procure o administrador para conferir seu cadastro.');
  }

  return snap.data().email;
}

export async function deleteProfessional(professional) {
  const id = typeof professional === 'string' ? professional : professional?.id;
  if (!id) throw new Error('Profissional invalido.');

  if (professional?.sourceCollection === COLLECTIONS.users || professional?.uid) {
    const uid = professional.uid || id;
    await setDoc(sharedDoc(COLLECTIONS.users, uid), withTimestamps({ isDeleted: true }), { merge: true });
    await logAudit('deactivate', ENTITY_TYPES.professional, uid).catch(e => console.warn('Audit fail:', e));
    return;
  }

  return deleteEntity(COLLECTIONS.professionals, id, ENTITY_TYPES.professional);
}

export async function promoteUserToAdmin(email) {
  const q = query(collection(firestore, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  
  const userDoc = snap.docs[0];
  await setDoc(userDoc.ref, { role: 'admin' }, { merge: true });
  return true;
}

/**
 * SINCRONIZAÇÃO EM TEMPO REAL (REAL-TIME)
 * Garante que profissionais vejam atualizações uns dos outros imediatamente
 */

export function subscribeToPatient(id, onData) {
  // Auditoria de visualização conforme LGPD
  logAudit('view', ENTITY_TYPES.patient, id).catch(e => console.warn('Audit view fail:', e));
  
  return onSnapshot(sharedDoc(COLLECTIONS.patients, id), (snap) => {
    if (snap.exists()) onData({ id: snap.id, ...snap.data() });
  });
}

export function subscribeToClinicalEntries(patientId, onData) {
  const q = query(
    sharedCollection(COLLECTIONS.clinicalEntries),
    where('patientId', '==', patientId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(item => item.isDeleted !== true); // Filtro em memória aceita undefined
    
    onData(list.sort((a, b) => {
      const dateB = new Date(b.dataAtendimento || b.createdAt || 0);
      const dateA = new Date(a.dataAtendimento || a.createdAt || 0);
      return dateB - dateA;
    }));
  });
}

export function subscribeToRecords(patientId, onData) {
  const q = query(
    sharedCollection(COLLECTIONS.records),
    where('patientId', '==', patientId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(item => item.isDeleted !== true);
    onData(list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  });
}

export function subscribeToAllPatients(onData) {
  const q = query(
    sharedCollection(COLLECTIONS.patients),
    where('isDeleted', '==', false)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(list.sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
  });
}

export function subscribeToAppointments(onData) {
  const q = query(
    sharedCollection(COLLECTIONS.appointments),
    where('isDeleted', '==', false)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(list);
  });
}

export function subscribeToProfile(uid, onData) {
  return onSnapshot(doc(firestore, 'users', uid), (snap) => {
    if (snap.exists()) onData({ uid: snap.id, ...snap.data() });
  });
}
