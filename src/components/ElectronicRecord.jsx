import { createElement, useMemo, useState } from 'react';
import {
  ArrowLeft, Calendar, ClipboardList, FileText, HeartPulse,
  Pencil, Plus, Save, ShieldAlert, Trash2, User,
} from 'lucide-react';
import {
  deleteClinicalEntry,
  getClinicalEntries,
  getRecords,
  saveClinicalEntry,
} from '../services/db';
import { formatMesRef, localDateInputValue } from '../utils/recordConsolidation';

function calcAge(dataNasc) {
  if (!dataNasc) return null;
  const [d, m, y] = dataNasc.split('/');
  const birth = new Date(`${y}-${m}-${d}`);
  if (!y || isNaN(birth)) return null;
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)' }}>{value || '-'}</p>
    </div>
  );
}

function SummaryCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: ['var(--blue-light)', 'var(--blue)'],
    teal: ['var(--teal-light)', 'var(--teal-hover)'],
    warn: ['var(--warning-light)', 'var(--warning)'],
    green: ['var(--success-light)', 'var(--success)'],
  };
  const [bg, fg] = tones[tone];
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {createElement(icon, { size: 18 })}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 20, lineHeight: 1.1, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}

function createEmptyEntry() {
  return {
    dataAtendimento: localDateInputValue(),
    tipo: 'Evolucao',
    risco: 'habitual',
    profissional: '',
    cid: '',
    subjetivo: '',
    objetivo: '',
    avaliacao: '',
    plano: '',
  };
}

export default function ElectronicRecord({ patient, onBack, onEditPatient, onNewRecord, onSelectRecord }) {
  const [entries, setEntries] = useState(() => getClinicalEntries(patient.id));
  const [form, setForm] = useState(createEmptyEntry);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const records = useMemo(() => getRecords(patient.id), [patient.id]);
  const age = calcAge(patient.dataNasc);

  const timeline = useMemo(() => {
    const clinical = entries.map(entry => ({
      id: entry.id,
      kind: 'clinical',
      date: entry.dataAtendimento || entry.createdAt,
      title: entry.tipo || 'Evolucao',
      subtitle: entry.profissional || 'Profissional nao informado',
      entry,
    }));
    const attendance = records.map(record => ({
      id: record.id,
      kind: 'record',
      date: record.createdAt,
      title: `Ficha de Atendimento ${record.mesRef ? `- ${formatMesRef(record.mesRef)}` : ''}`,
      subtitle: record.nomeProfissional || 'Registro de producao',
      record,
    }));
    return [...clinical, ...attendance].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [entries, records]);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(createEmptyEntry());
    setEditingId(null);
    setError('');
  }

  function handleSave() {
    if (!form.subjetivo.trim() && !form.avaliacao.trim() && !form.plano.trim()) {
      setError('Informe pelo menos uma evolucao, avaliacao ou conduta antes de salvar.');
      return;
    }
    const saved = saveClinicalEntry({ ...form, id: editingId, patientId: patient.id });
    setEntries(prev => {
      const exists = prev.some(e => e.id === saved.id);
      return exists ? prev.map(e => e.id === saved.id ? saved : e) : [saved, ...prev];
    });
    resetForm();
  }

  function handleEdit(entry) {
    setEditingId(entry.id);
    setForm({
      dataAtendimento: entry.dataAtendimento || localDateInputValue(),
      tipo: entry.tipo || 'Evolucao',
      risco: entry.risco || 'habitual',
      profissional: entry.profissional || '',
      cid: entry.cid || '',
      subjetivo: entry.subjetivo || '',
      objetivo: entry.objetivo || '',
      avaliacao: entry.avaliacao || '',
      plano: entry.plano || '',
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    if (!confirm('Excluir esta evolucao do prontuario?')) return;
    deleteClinicalEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} className="btn btn-ghost" style={{ gap: 6 }}>
            <ArrowLeft size={15} /> Voltar
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 750, color: 'var(--text-primary)' }}>Prontuario Eletronico</h1>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>Registro clinico longitudinal do cidadao</p>
          </div>
        </div>
        <button onClick={() => onNewRecord(patient)} className="btn btn-primary">
          <FileText size={15} /> Nova Ficha
        </button>
      </div>

      <main className="page-body emr-page">
        <section className="emr-hero">
          <div className="emr-avatar">{patient.nome?.charAt(0)?.toUpperCase() || '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800, color: 'var(--text-primary)' }}>{patient.nome || 'Cidadao sem nome'}</h2>
              <span className="badge badge-blue">{age !== null ? `${age} anos` : 'Idade nao informada'}</span>
              <span className={`badge ${(patient.risco || 'habitual') === 'intensivo' ? 'badge-danger' : (patient.risco || 'habitual') === 'alerta' ? 'badge-blue' : 'badge-success'}`}>
                Plano {(patient.risco || 'habitual') === 'intensivo' ? 'intensivo' : (patient.risco || 'habitual') === 'alerta' ? 'em alerta' : 'habitual'}
              </span>
            </div>
            <div className="emr-info-grid">
              <InfoItem label="CNS" value={patient.cns} />
              <InfoItem label="Nascimento" value={patient.dataNasc} />
              <InfoItem label="Mae" value={patient.nomeMae} />
              <InfoItem label="Telefone" value={patient.telefone} />
            </div>
          </div>
          <button onClick={() => onEditPatient(patient)} className="btn btn-secondary">
            <User size={15} /> Editar Cadastro
          </button>
        </section>

        <div className="emr-summary">
          <SummaryCard icon={ClipboardList} label="Evolucoes" value={entries.length} tone="teal" />
          <SummaryCard icon={FileText} label="Fichas" value={records.length} />
          <SummaryCard icon={Calendar} label="Ultimo registro" value={timeline[0] ? new Date(timeline[0].date).toLocaleDateString('pt-BR') : '-'} tone="green" />
          <SummaryCard icon={ShieldAlert} label="Acompanhamento" value={(patient.risco || 'habitual').charAt(0).toUpperCase() + (patient.risco || 'habitual').slice(1)} tone={(patient.risco || 'habitual') === 'intensivo' ? 'warn' : (patient.risco || 'habitual') === 'alerta' ? 'blue' : 'green'} />
        </div>

        <div className="emr-grid">
          <section className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartPulse size={16} color="var(--teal-hover)" />
                <span style={{ fontSize: 13.5, fontWeight: 750 }}>Nova Evolucao Clinica</span>
              </div>
              {editingId && <span className="badge badge-blue">Editando</span>}
            </div>
            <div className="card-body">
              {error && (
                <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 13, fontWeight: 650 }}>
                  {error}
                </div>
              )}
              <div className="emr-form-grid">
                <Field label="Data">
                  <input className="input" type="date" value={form.dataAtendimento} onChange={e => set('dataAtendimento', e.target.value)} />
                </Field>
                <Field label="Tipo">
                  <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    <option value="Evolucao">Evolucao</option>
                    <option value="Acolhimento">Acolhimento</option>
                    <option value="Retorno">Retorno</option>
                    <option value="Intercorrencia">Intercorrencia</option>
                    <option value="Projeto Terapeutico">Projeto Terapeutico</option>
                  </select>
                </Field>
                <Field label="Risco / intensidade">
                  <select className="input" value={form.risco} onChange={e => set('risco', e.target.value)}>
                    <option value="habitual">Habitual</option>
                    <option value="alerta">Alerta</option>
                    <option value="intensivo">Intensivo</option>
                  </select>
                </Field>
                <Field label="CID">
                  <input className="input" placeholder="Ex: F10.2" value={form.cid} onChange={e => set('cid', e.target.value)} />
                </Field>
              </div>
              <div style={{ marginTop: 16 }}>
                <Field label="Profissional">
                  <input className="input" placeholder="Nome do profissional responsavel" value={form.profissional} onChange={e => set('profissional', e.target.value)} />
                </Field>
              </div>
              <div className="emr-text-grid">
                <Field label="Subjetivo / queixa">
                  <textarea className="input emr-textarea" placeholder="Relato do usuario, familiares ou equipe..." value={form.subjetivo} onChange={e => set('subjetivo', e.target.value)} />
                </Field>
                <Field label="Objetivo / observacoes">
                  <textarea className="input emr-textarea" placeholder="Achados, sinais, comportamento, adesao..." value={form.objetivo} onChange={e => set('objetivo', e.target.value)} />
                </Field>
                <Field label="Avaliacao">
                  <textarea className="input emr-textarea" placeholder="Sintese clinica, hipoteses, riscos e necessidades..." value={form.avaliacao} onChange={e => set('avaliacao', e.target.value)} />
                </Field>
                <Field label="Plano / conduta">
                  <textarea className="input emr-textarea" placeholder="Condutas, orientacoes, retornos, encaminhamentos..." value={form.plano} onChange={e => set('plano', e.target.value)} />
                </Field>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button onClick={resetForm} className="btn btn-secondary">Limpar</button>
                <button onClick={handleSave} className="btn btn-teal">
                  <Save size={15} /> Salvar Evolucao
                </button>
              </div>
            </div>
          </section>

          <aside className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={16} color="var(--blue)" />
                <span style={{ fontSize: 13.5, fontWeight: 750 }}>Linha do Tempo</span>
              </div>
            </div>
            <div className="card-body">
              {timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px' }}>
                  <Plus size={30} color="var(--border-strong)" style={{ marginBottom: 10 }} />
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Nenhum registro ainda</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Salve a primeira evolucao clinica do prontuario.</p>
                </div>
              ) : (
                <div className="emr-timeline">
                  {timeline.map(item => (
                    <article key={`${item.kind}-${item.id}`} className="emr-timeline-item">
                      <div className={`emr-dot ${item.kind === 'record' ? 'is-record' : ''}`} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                          <div>
                            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'var(--text-primary)' }}>{item.title}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                              {new Date(item.date).toLocaleDateString('pt-BR')} - {item.subtitle}
                            </p>
                          </div>
                          {item.kind === 'clinical' ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="icon-btn" title="Editar evolucao" onClick={() => handleEdit(item.entry)}><Pencil size={13} /></button>
                              <button className="icon-btn danger" title="Excluir evolucao" onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
                            </div>
                          ) : (
                            <button className="btn btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={() => onSelectRecord(patient, item.record)}>
                              Abrir
                            </button>
                          )}
                        </div>
                        {item.kind === 'clinical' && (
                          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                            {item.entry.avaliacao || item.entry.subjetivo || item.entry.plano}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
