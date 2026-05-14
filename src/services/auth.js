import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { auth, firebaseConfig } from './firebase';
import { ensureDatabaseProfile } from './db';

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} demorou demais. Verifique sua conexao.`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function ensureProfileInBackground(user) {
  try {
    await withTimeout(ensureDatabaseProfile(user), 8000, 'Inicializacao do banco');
  } catch (err) {
    console.warn('Perfil do Firestore nao foi inicializado agora:', err);
  }
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, user => {
    if (user) ensureProfileInBackground(user);
    callback(user);
  });
}

export async function loginWithEmail(email, password) {
  const credential = await withTimeout(
    signInWithEmailAndPassword(auth, email, password),
    15000,
    'Login'
  );
  ensureProfileInBackground(credential.user);
  return credential.user;
}

export async function registerWithEmail(email, password) {
  const credential = await withTimeout(
    createUserWithEmailAndPassword(auth, email, password),
    15000,
    'Cadastro'
  );
  ensureProfileInBackground(credential.user);
  return credential.user;
}

export async function createProfessionalAuthAccount(email, password) {
  const appName = 'professional-user-creation';
  const secondaryApp = getApps().some(app => app.name === appName)
    ? getApp(appName)
    : initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  const credential = await withTimeout(
    createUserWithEmailAndPassword(secondaryAuth, email, password),
    15000,
    'Cadastro do profissional'
  );

  await signOut(secondaryAuth).catch(() => {});
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}

export async function updateUserEmail(newEmail) {
  if (!auth.currentUser) return;
  await withTimeout(updateEmail(auth.currentUser, newEmail), 10000, 'Atualizacao de e-mail');
}

export async function updateUserPassword(newPassword) {
  if (!auth.currentUser) return;
  await withTimeout(updatePassword(auth.currentUser, newPassword), 10000, 'Atualizacao de senha');
}
