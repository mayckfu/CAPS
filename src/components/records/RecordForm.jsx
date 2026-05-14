import { useState, useRef } from 'react';
import { ArrowLeft, Save, ChevronDown, ChevronUp, CheckCircle, User, CalendarCheck, X, Search, ClipboardList } from 'lucide-react';
import { saveRecord } from '../../services/db';
import {
  RAAS_LEFT, RAAS_RIGHT, BPA_IND_LEFT, BPA_IND_RIGHT, BPA_CONSOLIDADO,
  buildEmptyData, dayKey, bpaKey
} from '../../data/procedures';
import { currentMesRef, localDateInputValue } from '../../utils/recordConsolidation';

function Field({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      <label className="form-label">
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionCard({ title, icon: Icon, opened, onToggle, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: '#FAFBFD',
          borderBottom: opened ? '1px solid var(--border)' : 'none',
          borderRadius: opened ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
          cursor: 'pointer', border: 'none', color: 'var(--text-primary)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = '#FAFBFD'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={16} color="var(--blue)" />}
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</span>
        </div>
        {opened ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
      </button>
      {opened && <div className="card-body" style={{ padding: '20px' }}>{children}</div>}
    </div>
  );
}

const DAY_PROCEDURE_GROUPS = [
  { title: 'RAAS', procedures: [...RAAS_LEFT, ...RAAS_RIGHT] },
  { title: 'BPA Individualizado', procedures: [...BPA_IND_LEFT, ...BPA_IND_RIGHT] },
  { title: 'BPA Consolidado', procedures: BPA_CONSOLIDADO.flat() },
];

const ALL_DAY_PROCEDURES = DAY_PROCEDURE_GROUPS.flatMap(group => group.procedures);

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

function QuickDailyModal({ data, onClose, onApply }) {

  const [date, setDate] = useState(todayInputValue());
  const [query, setQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({ 'RAAS': true, 'BPA Individualizado': true, 'BPA Consolidado': false });

  const selectedDay = getDateParts(date).day || 1;
  const [selected, setSelected] = useState(() => {
    const initial = new Set();
    ALL_DAY_PROCEDURES.forEach(proc => {
      if (data[dayKey(proc.code, selectedDay)] === 'X') initial.add(proc.code);
    });
    return initial;
  });

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  function handleDateChange(nextDate) {
    const nextDay = getDateParts(nextDate).day || 1;
    const nextSelected = new Set();
    ALL_DAY_PROCEDURES.forEach(proc => {
      if (data[dayKey(proc.code, nextDay)] === 'X') nextSelected.add(proc.code);
    });
    setDate(nextDate);
    setSelected(nextSelected);
  }

  function toggleProcedure(code) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function markGroup(procedures, checked) {
    setSelected(prev => {
      const next = new Set(prev);
      procedures.forEach(proc => {
        if (checked) next.add(proc.code);
        else next.delete(proc.code);
      });
      return next;
    });
  }

  const normalizedQuery = query.trim().toLowerCase();
  const selectedCount = selected.size;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quick-procedure-title">
      <div className="quick-modal">
        <div className="quick-modal-header">
          <div>
            <p className="quick-modal-kicker">Lancamento rapido</p>
            <h2 id="quick-procedure-title">Procedimentos do atendimento</h2>
            <p>{formatDatePt(date)}</p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="quick-modal-toolbar">
          <Field label="Data do atendimento">
            <input className="input" type="date" value={date} onChange={e => handleDateChange(e.target.value)} />
          </Field>
          <Field label="Buscar procedimento">
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Digite parte do nome ou codigo"
                style={{ paddingLeft: 36 }}
              />
            </div>
          </Field>
        </div>

        <div className="quick-selected-bar">
          <span>{selectedCount} procedimento{selectedCount !== 1 ? 's' : ''} marcado{selectedCount !== 1 ? 's' : ''} para o dia {selectedDay}</span>
          <button className="btn btn-ghost" onClick={() => setSelected(new Set())}>Limpar marcacoes do dia</button>
        </div>

        <div className="quick-procedure-list">
          {DAY_PROCEDURE_GROUPS.map(group => {
            const filtered = group.procedures.filter(proc =>
              !normalizedQuery ||
              proc.name.toLowerCase().includes(normalizedQuery) ||
              proc.code.includes(normalizedQuery)
            );

            if (filtered.length === 0) return null;

            const isExpanded = expandedGroups[group.title];
            const allGroupSelected = filtered.every(proc => selected.has(proc.code));

            return (
              <section key={group.title} className="quick-group">
                <div className="quick-group-header" onClick={() => toggleGroup(group.title)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    <h3>{group.title}</h3>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    onClick={(e) => { e.stopPropagation(); markGroup(filtered, !allGroupSelected); }}
                    style={{ height: 30, fontSize: 11, padding: '0 10px' }}
                  >
                    {allGroupSelected ? 'Desmarcar grupo' : 'Marcar grupo'}
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="quick-group-list">
                    {filtered.map(proc => {
                      const checked = selected.has(proc.code);
                      return (
                        <button
                          type="button"
                          key={proc.code}
                          className={`quick-procedure-option ${checked ? 'selected' : ''}`}
                          aria-pressed={checked}
                          onClick={() => toggleProcedure(proc.code)}
                        >
                          <span className="quick-check">{checked ? 'Feito' : 'Nao feito'}</span>
                          <span>
                            <strong>{proc.name}</strong>
                            <small>{proc.code}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="quick-modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-teal" onClick={() => onApply(date, selected)}>
            <Save size={15} /> Aplicar no dia {selectedDay}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecordForm({ patient, record: initial, onBack, onSaved }) {
  const [sections, setSections] = useState({ prof: true, clinical: true, raas: false, bpaInd: false, bpaCons: false });
  const toggle = k => setSections(prev => ({ ...prev, [k]: !prev[k] }));

  const [form, setForm] = useState(initial || { ...buildEmptyData(), mesRef: currentMesRef() });
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
