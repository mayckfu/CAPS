import React, { useState } from 'react';
import { ChevronLeft, Save, Shield, User, Copy, CreditCard, Lock, AtSign, Briefcase, CheckCircle } from 'lucide-react';
import { saveProfessional } from '../../services/db';
import { createProfessionalAuthAccount } from '../../services/auth';

const Field = ({ label, required, children }) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ 
      display: 'block', 
      fontSize: 11, 
      fontWeight: 800, 
      color: '#64748b', 
      textTransform: 'uppercase', 
      marginBottom: 8, 
      letterSpacing: '0.05em' 
    }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </label>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
    <div style={{ color: '#2563eb' }}>
      <Icon size={18} />
    </div>
    <span style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{title}</span>
  </div>
);

export default function ProfessionalForm({ professional, onBack, onSaved }) {
  const [form, setForm] = useState(professional || {
    displayName: '',
    email: '',
    cns: '',
    cbo: '',
    role: 'professional',
    mustChangePassword: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function generateTempPassword() {
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `Caps@${Math.floor(1000 + Math.random() * 9000)}${suffix}`;
  }

  async function copyCredentials() {
    if (!createdCredentials) return;
    const text = `Acesso CAPS AD\nE-mail: ${createdCredentials.email}\nSenha temporaria: ${createdCredentials.password}`;
    await navigator.clipboard.writeText(text);
    alert('Credenciais copiadas.');
  }

  async function handleSaveOld() {
    return handleSave();
  /*
    if (!form.displayName || !form.email) {
      alert('Por favor, preencha o Nome e o E-mail.');
      return;
    }

    setIsSaving(true);
    try {
      const isNew = !form.id;
      const tempPassword = isNew ? `Caps${Math.floor(1000 + Math.random() * 9000)}` : null;
      
      const payload = { ...form };
      if (isNew) payload.tempPassword = tempPassword;

      await saveProfessional(payload);
      
      if (isNew) {
        alert(`Sucesso! Profissional cadastrado.\n\nSENHA TEMPORÁRIA: ${tempPassword}\n\nForneça esta senha ao colega para o primeiro acesso.`);
      }

      onSaved();
    } catch (err) {
      console.error(err);
      alert('Ocorreu um erro ao salvar os dados.');
    } finally {
      setIsSaving(false);
    }
  */
  }

  async function handleSave() {
    if (!form.displayName || !form.email) {
      alert('Por favor, preencha o Nome e o E-mail.');
      return;
    }

    setIsSaving(true);
    try {
      const isNew = !form.id;
      const tempPassword = isNew ? generateTempPassword() : null;
      let authUser = null;

      if (isNew) {
        authUser = await createProfessionalAuthAccount(form.email.trim(), tempPassword);
      }

      const payload = { ...form };
      if (isNew && authUser) {
        payload.id = authUser.uid;
        payload.uid = authUser.uid;
        payload.email = authUser.email || form.email.trim();
        payload.providerId = 'password';
        payload.mustChangePassword = true;
      }

      await saveProfessional(payload);

      if (isNew) {
        setCreatedCredentials({
          name: form.displayName,
          email: payload.email,
          password: tempPassword,
        });
        return;
      }

      onSaved();
    } catch (err) {
      console.error(err);
      const message = err?.code === 'auth/email-already-in-use'
        ? 'Este e-mail ja existe no Firebase Authentication.'
        : 'Ocorreu um erro ao salvar os dados.';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="professional-form-view" style={{ background: '#f8fafc', minHeight: 'calc(100vh - 54px)' }}>
      
      {/* Header Fixo e Elegante */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button 
              onClick={onBack}
              style={{ 
                width: 36, height: 36, borderRadius: '50%', border: '1px solid #e2e8f0', 
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748b'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                {professional ? 'Editar Cadastro' : 'Cadastrar Profissional'}
              </h1>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Gestão de acesso e identidade profissional</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={onBack} style={{ borderRadius: 10 }}>Cancelar</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave} 
              disabled={isSaving}
              style={{ 
                borderRadius: 10, 
                background: '#2563eb', 
                padding: '10px 24px', 
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' 
              }}
            >
              <Save size={18} style={{ marginRight: 8 }} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: '40px 20px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        {createdCredentials && (
          <div className="card" style={{ marginBottom: 24, padding: 24, border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#14532d' }}>
                  Usuario criado com sucesso
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#166534' }}>
                  Entregue estes dados ao profissional. Esta senha aparece somente agora.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12, alignItems: 'end' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="E-mail de acesso">
                      <input className="input" readOnly value={createdCredentials.email} style={{ height: 44, borderRadius: 10, background: '#fff' }} />
                    </Field>
                    <Field label="Senha temporaria">
                      <input className="input" readOnly value={createdCredentials.password} style={{ height: 44, borderRadius: 10, background: '#fff', fontWeight: 800, letterSpacing: '0.04em' }} />
                    </Field>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <button className="btn btn-secondary" onClick={copyCredentials} style={{ height: 44, borderRadius: 10, gap: 8 }}>
                      <Copy size={16} /> Copiar
                    </button>
                    <button className="btn btn-primary" onClick={onSaved} style={{ height: 44, borderRadius: 10 }}>
                      Concluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
          
          {/* Coluna Principal: Formulário */}
          <div style={{ display: 'grid', gap: 24 }}>
            
            {/* Seção 1: Conta */}
            <div className="card" style={{ padding: 32, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionTitle icon={User} title="Informações Pessoais e Conta" />
              
              <Field label="Nome Completo do Profissional" required>
                <div className="input-with-icon">
                  <User size={16} className="field-icon" color="#94a3b8" />
                  <input 
                    className="input" 
                    value={form.displayName} 
                    onChange={e => set('displayName', e.target.value)} 
                    placeholder="Ex: Dra. Maria Silva" 
                    style={{ height: 46, borderRadius: 10, fontSize: 14 }}
                  />
                </div>
              </Field>

              <Field label="E-mail de Login (Acesso ao Sistema)" required>
                <div className="input-with-icon">
                  <AtSign size={16} className="field-icon" color="#94a3b8" />
                  <input 
                    className="input" 
                    type="email" 
                    value={form.email} 
                    onChange={e => set('email', e.target.value)} 
                    placeholder="nome.sobrenome@caps.gov.br"
                    style={{ height: 46, borderRadius: 10, fontSize: 14 }}
                  />
                </div>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Field label="Nível de Permissão">
                  <select 
                    className="input" 
                    value={form.role} 
                    onChange={e => set('role', e.target.value)}
                    style={{ height: 46, borderRadius: 10, fontSize: 14 }}
                  >
                    <option value="professional">Profissional de Saúde</option>
                    <option value="admin">Administrador (Gestão)</option>
                  </select>
                </Field>
                <Field label="Status da Conta">
                  <select 
                    className="input"
                    style={{ height: 46, borderRadius: 10, fontSize: 14 }}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Suspenso</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Seção 2: Documentação */}
            <div className="card" style={{ padding: 32, border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <SectionTitle icon={Briefcase} title="Identificação Profissional" />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Field label="Número do CNS">
                  <div className="input-with-icon">
                    <CreditCard size={16} className="field-icon" color="#94a3b8" />
                    <input 
                      className="input" 
                      value={form.cns} 
                      onChange={e => set('cns', e.target.value)} 
                      placeholder="000 0000 0000 0000"
                      style={{ height: 46, borderRadius: 10, fontSize: 14 }}
                    />
                  </div>
                </Field>
                <Field label="CBO (Ocupação)">
                  <input 
                    className="input" 
                    value={form.cbo} 
                    onChange={e => set('cbo', e.target.value)} 
                    placeholder="Código CBO"
                    style={{ height: 46, borderRadius: 10, fontSize: 14 }}
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Coluna Lateral: Dicas e Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {!professional && (
              <div style={{ 
                background: '#fff', border: '1px solid #e2e8f0', padding: 24, borderRadius: 16,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, background: '#eff6ff', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
                  color: '#2563eb'
                }}>
                  <Lock size={24} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Segurança & Acesso</h3>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: 0 }}>
                  Ao cadastrar um novo colega, o sistema gera automaticamente uma <strong>senha temporária</strong>.
                </p>
                <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#475569', borderLeft: '3px solid #2563eb' }}>
                  O usuário será obrigado a trocar a senha no primeiro acesso para garantir a privacidade dos dados.
                </div>
              </div>
            )}

            <div style={{ 
              background: '#fff', border: '1px solid #e2e8f0', padding: 24, borderRadius: 16,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color="#10b981" /> Dica de Gestão
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Certifique-se de que o e-mail está correto. Este será o principal identificador para auditoria e recuperação de conta.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
