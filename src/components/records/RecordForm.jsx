import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Save, User, CalendarCheck, ClipboardList, CheckCircle } from 'lucide-react';
import { saveRecord } from '../../services/db';
import {
  ALL_DAY_PROCEDURES,
  BPA_CONSOLIDADO,
  buildEmptyData, dayKey, bpaKey
} from '../../data/procedures';
import { currentMesRef, localDateInputValue } from '../../utils/recordConsolidation';

// UI Components
import Field from '../ui/Field';
import SectionCard from '../ui/SectionCard';
import QuickDailyModal from './QuickDailyModal';

function todayInputValue() {
  return localDateInputValue();
}

function getDateParts(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function formatDatePt(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function professionalDefaults(profile) {
  return {
    nomeProfissional: profile?.displayName || '',
    cartaoSusProfissional: profile?.cns || '',
    cbo: profile?.cbo || '',
  };
}

function mergeMissingProfessionalData(record, profile) {
  const defaults = professionalDefaults(profile);
  return {
    ...record,
    nomeProfissional: record.nomeProfissional || defaults.nomeProfissional,
    cartaoSusProfissional: record.cartaoSusProfissional || defaults.cartaoSusProfissional,
    cbo: record.cbo || defaults.cbo,
  };
}

export default function RecordForm({ patient, record: initial, profile, onBack, onSaved }) {
  const [sections, setSections] = useState({ prof: true, clinical: true, raas: false, bpaInd: false, bpaCons: false });
  const toggle = k => setSections(prev => ({ ...prev, [k]: !prev[k] }));

  const [form, setForm] = useState(() => mergeMissingProfessionalData(
    initial || { ...buildEmptyData(), mesRef: currentMesRef() },
    profile
  ));
  const [quickOpen, setQuickOpen] = useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const today = todayInputValue();
  const todayDay = getDateParts(today).day;
  const todayMarked = ALL_DAY_PROCEDURES.filter(proc => form[dayKey(proc.code, todayDay)] === 'X').length;

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    setForm(prev => mergeMissingProfessionalData(prev, profile));
  }, [profile?.displayName, profile?.cns, profile?.cbo]);

  async function handleSave() {
    const saved = await saveRecord({ ...form, patientId: patient.id });
    onSaved(saved);
    showToast('Ficha salva com sucesso!');
  }

  function applyDailyProcedures(dateStr, selectedCodes) {
    const { month, year, day } = getDateParts(dateStr);
    const mesRef = `${String(month).padStart(2, '0')}/${year}`;
    let updatedForm = null;
    
    setForm(prev => {
      const next = { ...prev, mesRef: prev.mesRef || mesRef };
      // RAAS + BPA Individualizado + BPA Consolidado: mark day
      ALL_DAY_PROCEDURES.forEach(proc => {
        next[dayKey(proc.code, day)] = selectedCodes.has(proc.code) ? 'X' : '';
      });
      // BPA Consolidado: auto-calculate week columns (1-4) based on day marks
      BPA_CONSOLIDADO.flat().forEach(proc => {
        let col1 = 0, col2 = 0, col3 = 0, col4 = 0;
        for (let d = 1; d <= 31; d++) {
          if (next[dayKey(proc.code, d)] === 'X') {
            if (d <= 7) col1++;
            else if (d <= 14) col2++;
            else if (d <= 21) col3++;
            else col4++;
          }
        }
        next[bpaKey(proc.code, 1)] = col1 > 0 ? col1.toString() : '';
        next[bpaKey(proc.code, 2)] = col2 > 0 ? col2.toString() : '';
        next[bpaKey(proc.code, 3)] = col3 > 0 ? col3.toString() : '';
        next[bpaKey(proc.code, 4)] = col4 > 0 ? col4.toString() : '';
      });
      updatedForm = next;
      return next;
    });
    
    setQuickOpen(false);
    showToast(`Procedimentos do dia ${day} aplicados na ficha.`);

    // Auto-save the form to prevent data loss if the user forgets to click "Salvar"
    if (updatedForm) {
      setTimeout(() => {
        saveRecord({ ...updatedForm, patientId: patient.id }).then(saved => {
          onSaved(saved);
        }).catch(console.error);
      }, 100);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* TOAST */}
      {toast && (
        <div className="toast">
          <CheckCircle size={16} color="var(--success)" />
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      {quickOpen && (
        <QuickDailyModal
          data={form}
          onClose={() => setQuickOpen(false)}
          onApply={applyDailyProcedures}
        />
      )}

      <div className="page-header">
        <div className="header-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} className="btn btn-ghost" style={{ padding: '0 8px' }}>
              <ArrowLeft size={20} color="var(--text-primary)" />
            </button>
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Ficha de Atendimento
              </h1>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                Paciente: <strong style={{ color: 'var(--text-primary)' }}>{patient.nome}</strong>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setQuickOpen(true)} className="btn btn-secondary" style={{ gap: 7, height: 38 }}>
              <CalendarCheck size={16} /> Marcar Hoje
            </button>
            <button onClick={handleSave} className="btn btn-teal" style={{ gap: 7, height: 38 }}>
              <Save size={16} /> Salvar
            </button>
          </div>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 1200 }}>

        <section className="quick-entry-card">
          <div className="quick-entry-icon">
            <CalendarCheck size={24} />
          </div>
          <div className="quick-entry-copy">
            <p className="quick-entry-kicker">Atendimento de hoje</p>
            <h2>Marcar procedimentos realizados</h2>
            <p>
              Abra uma janela simples, confirme a data e marque apenas o que foi feito. Os dias e totais do mes ficam consolidados automaticamente na ficha.
            </p>
            <div className="quick-entry-meta">
              <span>{formatDatePt(today)}</span>
              <span>{todayMarked} procedimento{todayMarked !== 1 ? 's' : ''} marcado{todayMarked !== 1 ? 's' : ''} hoje</span>
            </div>
          </div>
          <div className="quick-entry-actions">
            <button onClick={() => setQuickOpen(true)} className="btn btn-primary">
              <CalendarCheck size={16} /> Marcar Agora
            </button>
          </div>
        </section>

        {/* PROFISSIONAL */}
        <SectionCard title="Dados do Profissional" icon={User} opened={sections.prof} onToggle={() => toggle('prof')}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 180px', gap: 16, marginBottom: 16 }}>
            <Field label="Mês de Referência">
              <input 
                className="input" 
                placeholder="MM/AAAA" 
                value={form.mesRef||''} 
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                  set('mesRef', v);
                }} 
              />
            </Field>
            <Field label="Nome do Profissional">
              <input className="input" placeholder="Nome completo" value={form.nomeProfissional||''} onChange={e=>set('nomeProfissional',e.target.value)} />
            </Field>
            <Field label="Nº Cartão SUS">
              <input className="input" placeholder="CNS" value={form.cartaoSusProfissional||''} onChange={e=>set('cartaoSusProfissional',e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
            <Field label="Unidade">
              <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                6359825 – CAPS AD
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 16 }}>
              <Field label="CBO">
                <input className="input" placeholder="CBO" value={form.cbo||''} onChange={e=>set('cbo',e.target.value)} />
              </Field>
              <Field label="Local de Atendimento">
                <select 
                  className="input" 
                  style={{ height: 44, fontSize: 15, fontWeight: 600 }}
                  value={form.localRealizacao||'C'} 
                  onChange={e=>set('localRealizacao',e.target.value)}
                >
                  <option value="C">Centro (Atendimento na Unidade)</option>
                  <option value="T">Território (Atendimento Externo)</option>
                </select>
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* PROCEDIMENTOS */}
        <div style={{ marginBottom: 20 }}>
          <SectionCard title="Produção / Procedimentos do Mês" icon={ClipboardList} opened={sections.raas} onToggle={() => toggle('raas')}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Utilize o botão <strong>"Marcar Hoje"</strong> acima para um lançamento rápido, ou abra as seções abaixo para conferência detalhada.
            </p>
          </SectionCard>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 40, paddingTop: 10 }}>
          <button onClick={handleSave} className="btn btn-teal" style={{ padding: '0 24px', height: 44 }}>
            <Save size={16} /> Salvar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
