import React, { useState } from 'react';
import { X, Save, Key, User, Mail, AlertTriangle } from 'lucide-react';
import { updateUserEmail, updateUserPassword } from '../../services/auth';
import { ensureDatabaseProfile } from '../../services/db';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../../services/firebase';
import { COLLECTIONS, onlyDigits } from '../../services/dbSchema';

const Field = ({ label, children }) => (
  <div className="profile-field">
    <label>{label}</label>
    {children}
  </div>
);

export default function UserProfileModal({ user, profile, onClose }) {
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    email: profile?.email || user?.email || '',
    cns: profile?.cns || '',
    cbo: profile?.cbo || '',
    password: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const canEditProfessionalData = profile?.role === 'admin';

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates = {};
      if (canEditProfessionalData && form.displayName !== profile?.displayName) updates.displayName = form.displayName;
      if (canEditProfessionalData && form.cns !== profile?.cns) updates.cns = form.cns;
      if (canEditProfessionalData && form.cbo !== profile?.cbo) updates.cbo = form.cbo;

      if (Object.keys(updates).length > 0) {
        await setDoc(doc(firestore, 'users', user.uid), updates, { merge: true });
      }

      if (form.email !== user?.email) {
        await updateUserEmail(form.email);
        const nextEmail = form.email.trim().toLowerCase();
        await setDoc(doc(firestore, 'users', user.uid), { email: nextEmail }, { merge: true });

        const cpfDigits = profile?.cpfDigits || onlyDigits(profile?.cpf);
        if (cpfDigits) {
          await setDoc(doc(firestore, COLLECTIONS.loginIdentifiers, cpfDigits), {
            email: nextEmail,
            uid: user.uid,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      if (form.password) {
        if (form.password !== form.confirmPassword) {
          throw new Error('As senhas não conferem.');
        }
        if (form.password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres.');
        }
        await updateUserPassword(form.password);

        if (profile?.mustChangePassword) {
          await setDoc(doc(firestore, 'users', user.uid), { mustChangePassword: false }, { merge: true });
          await ensureDatabaseProfile({ ...user, mustChangePassword: false });
        }
      }

      setSuccess('Perfil atualizado com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Falha ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="profile-modal">
        <header className="profile-modal-header">
          <div className="profile-modal-title">
            <div className="profile-modal-icon">
              <User size={18} />
            </div>
            <h3 id="profile-modal-title">Meu Perfil</h3>
          </div>
          <button onClick={onClose} className="icon-btn" title="Fechar"><X size={18} /></button>
        </header>

        <div className="profile-modal-body">
          {profile?.mustChangePassword && (
            <div className="profile-warning">
              <AlertTriangle size={20} />
              <div>
                <p>Senha temporária detectada</p>
                <span>Por segurança, altere sua senha agora para continuar usando o sistema.</span>
              </div>
            </div>
          )}

          {error && <div className="alert alert-danger profile-alert">{error}</div>}
          {success && <div className="alert alert-success profile-alert">{success}</div>}

          <Field label="Nome completo">
            <div className="input-with-icon">
              <User size={16} className="field-icon" />
              <input className="input" value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Seu nome" readOnly={!canEditProfessionalData} />
            </div>
          </Field>

          <Field label="E-mail de acesso">
            <div className="input-with-icon">
              <Mail size={16} className="field-icon" />
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Cartão SUS (CNS)">
              <input className="input" value={form.cns} onChange={e => set('cns', e.target.value)} placeholder="000 0000 0000 0000" readOnly={!canEditProfessionalData} />
            </Field>

            <Field label="CBO">
              <input className="input" value={form.cbo} onChange={e => set('cbo', e.target.value)} placeholder="CBO" readOnly={!canEditProfessionalData} />
            </Field>
          </div>

          <Field label="Cargo (não editável)">
            <div className="profile-readonly-field">
              {profile?.role === 'admin' ? 'Administrador' : 'Profissional de Saúde'}
            </div>
          </Field>

          <div className="profile-section-divider" />

          <p className="profile-section-title">
            <Key size={14} /> Alterar Senha
          </p>

          <div className="profile-password-grid">
            <Field label="Nova senha">
              <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="******" />
            </Field>
            <Field label="Confirmar">
              <input className="input" type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="******" />
            </Field>
          </div>
        </div>

        <footer className="profile-modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
            <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </footer>
      </div>
    </div>
  );
}
