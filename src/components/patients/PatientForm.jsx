import { createElement, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Calendar, ClipboardList, FileText, HeartPulse,
  MapPin, Pencil, Plus, Save, ShieldAlert, Trash2, User,
} from 'lucide-react';
import {
  deleteClinicalEntry,
  deleteRecord,
  saveClinicalEntry,
  savePatient,
  subscribeToClinicalEntries,
  subscribeToPatient,
  subscribeToRecords,
} from '../../services/db';
import { formatMesRef, localDateInputValue } from '../../utils/recordConsolidation';
import { formatCNS } from '../../services/dbSchema';
import { RAAS_LEFT, RAAS_RIGHT, BPA_IND_LEFT, BPA_IND_RIGHT } from '../../data/procedures';

const RACAS = ['1-Branco', '2-Preto', '3-Pardo', '4-Amarelo', '5-Indigena'];
const TIPOS_LOGRADOURO = ['Alameda','Area','Avenida','Beco','Bloco','Bosque','Boulevard','Caminho','Chacara','Condominio','Conjunto','Distrito','Estrada','Fazenda','Galeria','Granja','Jardim','Ladeira','Largo','Loteamento','Morro','Parque','Passarela','Patio','Praca','Quadra','Recanto','Residencial','Rodovia','Rua','Setor','Sitio','Travessa','Trecho','Trevo','Vale','Vereda','Via','Viaduto','Viela','Vila'];

function createEmptyClinicalEntry() {
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

function calcAge(dataNasc) {
  if (!dataNasc) return null;
  const [d, m, y] = dataNasc.split('/');
  const birth = new Date(`${y}-${m}-${d}`);
  if (!y || isNaN(birth)) return null;
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
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

function hasClinicalContent(entry) {
  return Boolean(
    entry.subjetivo?.trim() ||
    entry.objetivo?.trim() ||
    entry.avaliacao?.trim() ||
    entry.plano?.trim() ||
    entry.cid?.trim() ||
    entry.profissional?.trim() ||
    entry.risco !== 'habitual' ||
    entry.tipo !== 'Evolucao'
  );
}

export default function PatientForm({ patient: initial, onBack, profile }) {
  const [patientForm, setPatientForm] = useState({
    origemUsuario: '1',
    destinoUsuario: '0',
    coberturaEsf: 'N',
    ...initial
  });
  const [clinicalForm, setClinicalForm] = useState(createEmptyClinicalEntry);
  const [entries, setEntries] = useState([]);
  const [records, setRecords] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const age = calcAge(patientForm.dataNasc);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const pid = initial?.id;
    if (!pid) {
      setEntries([]);
      setRecords([]);
      return;
    }
    
    const unsubPatient = subscribeToPatient(pid, (data) => {
      setPatientForm(prev => ({ ...prev, ...data }));
    });
    const unsubEntries = subscribeToClinicalEntries(pid, setEntries);
    const unsubRecords = subscribeToRecords(pid, setRecords);

    return () => {
      unsubPatient();
      unsubEntries();
      unsubRecords();
    };
  }, [initial?.id]);

  const timeline = useMemo(() => {
    // Evoluções Clínicas
    const clinical = entries.map(entry => ({
      id: entry.id,
      kind: 'clinical',
      date: entry.dataAtendimento || entry.createdAt,
      title: entry.tipo || 'Evolucao',
      subtitle: entry.profissional || 'Profissional nao informado',
      entry,
    }));

    // Fichas de Atendimento (RAAS/BPA) -> Desmembrar em lançamentos diários + Resumo Mensal
    const attendanceItems = [];
    records.forEach(record => {
      const data = record.data || {};
      const [yearStr, monthStr] = (record.mesRef || '').split('/'); // mesRef is MM/YYYY in form
      const year = parseInt(yearStr?.includes('/') ? yearStr.split('/')[1] : (record.mesRef?.split('/')[1] || ''));
      const month = parseInt(yearStr?.includes('/') ? yearStr.split('/')[0] : (record.mesRef?.split('/')[0] || ''));

      let hasDaily = false;
      for (let d = 1; d <= 31; d++) {
        const procedures = [];
        // RAAS e BPA-Ind
        [...RAAS_LEFT, ...RAAS_RIGHT, ...BPA_IND_LEFT, ...BPA_IND_RIGHT].forEach(p => {
          if (record[p.code + '_d' + d] === 'X' || data[p.code + '_d' + d] === 'X') {
            procedures.push(p.name);
          }
        });

        if (procedures.length > 0) {
          hasDaily = true;
          let itemDate;
          if (year && month) {
            itemDate = new Date(year, month - 1, d, 12, 0, 0).toISOString();
          } else {
            itemDate = record.createdAt;
          }

          attendanceItems.push({
            id: `${record.id}-d${d}`,
            kind: 'record-day',
            date: itemDate,
            title: `Procedimentos - Dia ${String(d).padStart(2, '0')}/${record.mesRef}`,
            subtitle: record.nomeProfissional || 'Produção registrada',
            details: procedures.join(', '),
            recordId: record.id,
          });
        }
      }

      // Sempre adicionar o resumo mensal da ficha para garantir que ela apareça e permita exclusão/impressão
      attendanceItems.push({
        id: record.id,
        kind: 'record',
        date: record.createdAt,
        title: `Ficha de Atendimento - ${record.mesRef || 'Mês não informado'}`,
        subtitle: record.nomeProfissional || 'Registro de produção mensal',
        details: 'Clique para ver detalhes ou imprimir na busca.',
        record,
      });
    });

    return [...clinical, ...attendanceItems].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [entries, records]);

  const setPatient = (key, value) => {
    const finalValue = key === 'cns' ? formatCNS(value) : value;
    setPatientForm(prev => ({ ...prev, [key]: finalValue }));
  };
  const setClinical = (key, value) => setClinicalForm(prev => ({ ...prev, [key]: value }));

  function resetClinicalForm() {
    setClinicalForm(createEmptyClinicalEntry());
    setEditingEntryId(null);
  }

  function upsertEntry(saved) {
    setEntries(prev => {
      const exists = prev.some(entry => entry.id === saved.id);
      return exists ? prev.map(entry => entry.id === saved.id ? saved : entry) : [saved, ...prev];
    });
  }

  async function saveClinicalForPatient(patientId) {
    // Só salva a evolução se houver conteúdo clínico preenchido ou se estiver editando uma existente
    if (!hasClinicalContent(clinicalForm) && !editingEntryId) return null;
    const saved = await saveClinicalEntry({ ...clinicalForm, id: editingEntryId, patientId });
    resetClinicalForm();
    return saved;
  }

  async function handleSave() {
    if (!patientForm.nome?.trim()) {
      setError('O nome do cidadao e obrigatorio.');
      return;
    }

    setError('');
    setNotice('');
    setIsSaving(true);

    try {
      // patientForm.risco ja e atualizado imediatamente ao mudar o dropdown
      const savedPatient = await savePatient(patientForm);
      setPatientForm(savedPatient);

      // Salva a evolucao clinica (se houver conteudo preenchido)
      await saveClinicalForPatient(savedPatient.id);

      setNotice('Cadastro e prontuario salvos com sucesso.');
    } catch (err) {
      setError(err.message || 'Erro ao salvar no Firebase.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditEntry(entry) {
    setEditingEntryId(entry.id);
    setClinicalForm({
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDeleteEntry(id) {
    if (!isAdmin) return;
    if (!confirm('Excluir esta evolucao do prontuario?')) return;
    await deleteClinicalEntry(id);
    // Removido update manual: listener fará o sync
  }

  async function handleDeleteRecord(id) {
    if (!isAdmin) return;
    if (!confirm('Excluir esta ficha de atendimento? Ela tambem sera removida das fichas anteriores e do consolidado.')) return;
    await deleteRecord(id);
    // Removido update manual: listener fará o sync
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div className="page-header">
        <div className="header-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} className="btn btn-ghost" style={{ padding: '0 8px' }}>
              <ArrowLeft size={20} color="var(--text-primary)" />
            </button>
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Prontuário do Paciente
            </h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
            style={{ gap: 7, height: 38, padding: '0 20px', opacity: isSaving ? 0.7 : 1 }}
          >
            <Save size={16} />
            {isSaving ? 'Salvando...' : 'Salvar Prontuário'}
          </button>
        </div>
      </div>

      <main className="page-body unified-record-page">
        {error && (
          <div style={{ background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {notice && (
          <div style={{ background: 'var(--success-light)', border: '1px solid rgba(46,125,50,0.35)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--success)', fontWeight: 700 }}>
            {notice}
          </div>
        )}

        <section className="emr-hero">
          <div className="emr-avatar">{patientForm.nome?.charAt(0)?.toUpperCase() || '+'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800, color: 'var(--text-primary)' }}>
                {patientForm.nome || 'Novo cidadao'}
              </h2>
              <span className="badge badge-blue">{age !== null ? `${age} anos` : 'Idade nao informada'}</span>
              <span className={`badge ${
                (patientForm.risco || 'habitual') === 'intensivo' ? 'badge-danger' : 
                (patientForm.risco || 'habitual') === 'alerta' ? 'badge-blue' : 'badge-success'
              }`}>
                Plano {(patientForm.risco || 'habitual') === 'intensivo' ? 'intensivo' : 
                       (patientForm.risco || 'habitual') === 'alerta' ? 'em alerta' : 'habitual'}
              </span>
            </div>
            <div className="emr-info-grid">
              <div><p className="form-label">CNS</p><strong>{patientForm.cns || '-'}</strong></div>
              <div><p className="form-label">Nascimento</p><strong>{patientForm.dataNasc || '-'}</strong></div>
              <div><p className="form-label">Mae</p><strong>{patientForm.nomeMae || '-'}</strong></div>
              <div><p className="form-label">Telefone</p><strong>{patientForm.telefone || '-'}</strong></div>
            </div>
          </div>
        </section>

        <div className="emr-summary">
          <SummaryCard icon={ClipboardList} label="Evolucoes" value={entries.length} tone="teal" />
          <SummaryCard icon={FileText} label="Fichas" value={records.length} />
          <SummaryCard icon={Calendar} label="Ultimo registro" value={timeline[0] ? new Date(timeline[0].date).toLocaleDateString('pt-BR') : '-'} tone="green" />
          <SummaryCard 
            icon={ShieldAlert} 
            label="Acompanhamento" 
            value={(patientForm.risco || 'habitual').charAt(0).toUpperCase() + (patientForm.risco || 'habitual').slice(1)} 
            tone={(patientForm.risco || 'habitual') === 'intensivo' ? 'warn' : (patientForm.risco || 'habitual') === 'alerta' ? 'blue' : 'green'} 
          />
        </div>

        <div className="unified-record-grid">
          <section>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} color="var(--blue)" />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Identificacao Pessoal</span>
                </div>
              </div>
              <div className="card-body">
                <div className="patient-form-grid" style={{ gridTemplateColumns: '1.2fr 2fr 1fr', gap: 16, marginBottom: 16 }}>
                  <Field label="Cartao Nacional de Saude (CNS)">
                    <input className="input" value={patientForm.cns || ''} onChange={e => setPatient('cns', e.target.value)} placeholder="000 0000 0000 0000" />
                  </Field>
                  <Field label="Nome Completo" required>
                    <input className="input" value={patientForm.nome || ''} onChange={e => setPatient('nome', e.target.value)} placeholder="Nome completo do cidadao" />
                  </Field>
                  <Field label="Nivel do Paciente">
                    <select className="input" value={patientForm.risco || 'habitual'} onChange={e => {
                      const v = e.target.value;
                      setPatient('risco', v);
                      setClinical('risco', v);
                    }}>
                      <option value="habitual">Habitual</option>
                      <option value="alerta">Alerta</option>
                      <option value="intensivo">Intensivo</option>
                    </select>
                  </Field>
                </div>

                <div className="patient-form-grid three">
                  <Field label="Data de Nascimento">
                    <input className="input" type="text" placeholder="DD/MM/AAAA" value={patientForm.dataNasc || ''} onChange={e => setPatient('dataNasc', e.target.value)} />
                  </Field>
                  <Field label="Sexo Biologico">
                    <select className="input" value={patientForm.sexo || ''} onChange={e => setPatient('sexo', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </Field>
                  <Field label="Raca / Cor">
                    <select className="input" value={patientForm.raca || ''} onChange={e => setPatient('raca', e.target.value)}>
                      <option value="">Selecione...</option>
                      {RACAS.map(raca => <option key={raca} value={raca}>{raca}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="patient-form-grid two">
                  <Field label="Nome da Mae">
                    <input className="input" value={patientForm.nomeMae || ''} onChange={e => setPatient('nomeMae', e.target.value)} placeholder="Nome completo da mae" />
                  </Field>
                  <Field label="Nacionalidade">
                    <input className="input" value={patientForm.nacionalidade || ''} onChange={e => setPatient('nacionalidade', e.target.value)} placeholder="Ex: Brasileira" />
                  </Field>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} color="var(--teal)" />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Endereco e Contato</span>
                </div>
              </div>
              <div className="card-body">
                <div className="patient-form-grid address">
                  <Field label="Tipo">
                    <input list="tipos-logradouro" className="input" value={patientForm.logTipo || ''} onChange={e => setPatient('logTipo', e.target.value)} placeholder="Rua, Av..." />
                    <datalist id="tipos-logradouro">
                      {TIPOS_LOGRADOURO.map(tipo => <option key={tipo} value={tipo} />)}
                    </datalist>
                  </Field>
                  <Field label="Logradouro">
                    <input className="input" value={patientForm.logradouro || ''} onChange={e => setPatient('logradouro', e.target.value)} placeholder="Nome do logradouro" />
                  </Field>
                  <Field label="Numero">
                    <input className="input" value={patientForm.numero || ''} onChange={e => setPatient('numero', e.target.value)} placeholder="S/N" />
                  </Field>
                </div>

                <div className="patient-form-grid three">
                  <Field label="Bairro / Complemento">
                    <input className="input" value={patientForm.descEndereco || ''} onChange={e => setPatient('descEndereco', e.target.value)} placeholder="Bairro, Apto, Bloco..." />
                  </Field>
                  <Field label="CEP">
                    <input className="input" value={patientForm.cep || ''} onChange={e => setPatient('cep', e.target.value)} placeholder="00000-000" />
                  </Field>
                  <Field label="Municipio">
                    <input className="input" value={patientForm.municipio || ''} onChange={e => setPatient('municipio', e.target.value)} placeholder="Cidade" />
                  </Field>
                </div>

                <div className="patient-form-grid three">
                  <Field label="Telefone">
                    <input className="input" value={patientForm.telefone || ''} onChange={e => setPatient('telefone', e.target.value)} placeholder="(00) 0 0000-0000" />
                  </Field>
                  <Field label="Responsavel (se menor)">
                    <input className="input" value={patientForm.nomeResponsavel || ''} onChange={e => setPatient('nomeResponsavel', e.target.value)} placeholder="Apenas se necessario" />
                  </Field>
                  <Field label="Situacao de Rua">
                    <select className="input" value={patientForm.situacaoRua || ''} onChange={e => setPatient('situacaoRua', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="S">Sim</option>
                      <option value="N">Nao</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="var(--blue)" />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Dados Clinicos e Admissao</span>
                </div>
              </div>
              <div className="card-body">
                <div className="patient-form-grid" style={{ gridTemplateColumns: '1fr 120px 120px 1fr', gap: 16, marginBottom: 16 }}>
                  <Field label="Data de Admissao">
                    <input className="input" placeholder="DD/MM/AAAA" value={patientForm.dataAdmissao || ''} onChange={e => setPatient('dataAdmissao', e.target.value)} />
                  </Field>
                  <Field label="CID Principal">
                    <input className="input" placeholder="Ex: F10.2" value={patientForm.cidPrincipal || ''} onChange={e => setPatient('cidPrincipal', e.target.value)} />
                  </Field>
                  <Field label="Causas Assoc.">
                    <input className="input" placeholder="Ex: F32.0" value={patientForm.cidCausas || ''} onChange={e => setPatient('cidCausas', e.target.value)} />
                  </Field>
                  <Field label="CID Acolhimento">
                    <input className="input" placeholder="Opcional" value={patientForm.cidAcolhimento || ''} onChange={e => setPatient('cidAcolhimento', e.target.value)} />
                  </Field>
                </div>

                <div className="patient-form-grid" style={{ gridTemplateColumns: '1fr 1fr 150px', gap: 16, marginBottom: 16 }}>
                  <Field label="Origem do Usuario (1-6)">
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <button key={n}
                          type="button"
                          onClick={() => setPatient('origemUsuario', String(n))}
                          className="btn"
                          style={{
                            flex: 1, minWidth: 32, height: 32, padding: 0, fontSize: 12,
                            background: patientForm.origemUsuario === String(n) ? 'var(--blue)' : '#fff',
                            color: patientForm.origemUsuario === String(n) ? '#fff' : 'var(--text-secondary)',
                            border: `1.5px solid ${patientForm.origemUsuario === String(n) ? 'var(--blue)' : 'var(--border)'}`,
                          }}
                        >{n}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Destino do Usuario (0-4)">
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2, 3, 4].map(n => (
                        <button key={n}
                          type="button"
                          onClick={() => setPatient('destinoUsuario', String(n))}
                          className="btn"
                          style={{
                            flex: 1, height: 32, padding: 0, fontSize: 12,
                            background: patientForm.destinoUsuario === String(n) ? 'var(--blue)' : '#fff',
                            color: patientForm.destinoUsuario === String(n) ? '#fff' : 'var(--text-secondary)',
                            border: `1.5px solid ${patientForm.destinoUsuario === String(n) ? 'var(--blue)' : 'var(--border)'}`,
                          }}
                        >{n}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Cobertura ESF?">
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['S', 'N'].map(v => (
                        <button key={v}
                          type="button"
                          onClick={() => setPatient('coberturaEsf', v)}
                          className="btn"
                          style={{
                            flex: 1, height: 32, padding: 0, fontSize: 12,
                            background: patientForm.coberturaEsf === v ? 'var(--blue)' : '#fff',
                            color: patientForm.coberturaEsf === v ? '#fff' : 'var(--text-secondary)',
                            border: `1.5px solid ${patientForm.coberturaEsf === v ? 'var(--blue)' : 'var(--border)'}`,
                          }}
                        >{v === 'S' ? 'Sim' : 'Nao'}</button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div style={{ width: '100%' }}>
                  <Field label="Unidade ESF (se coberta)">
                    <input className="input" placeholder="Nome ou codigo da unidade de saude da familia" value={patientForm.unidadeEsf || ''} onChange={e => setPatient('unidadeEsf', e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>
          </section>

          <aside>
            <section className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HeartPulse size={16} color="var(--teal-hover)" />
                  <span style={{ fontSize: 13.5, fontWeight: 750 }}>{editingEntryId ? 'Editar Evolucao Clinica' : 'Nova Evolucao Clinica'}</span>
                </div>
                {editingEntryId && <span className="badge badge-blue">Editando</span>}
              </div>
              <div className="card-body">
                <div className="emr-form-grid">
                  <Field label="Data">
                    <input className="input" type="date" value={clinicalForm.dataAtendimento} onChange={e => setClinical('dataAtendimento', e.target.value)} />
                  </Field>
                  <Field label="Tipo">
                    <select className="input" value={clinicalForm.tipo} onChange={e => setClinical('tipo', e.target.value)}>
                      <option value="Evolucao">Evolucao</option>
                      <option value="Acolhimento">Acolhimento</option>
                      <option value="Retorno">Retorno</option>
                      <option value="Intercorrencia">Intercorrencia</option>
                      <option value="Projeto Terapeutico">Projeto Terapeutico</option>
                    </select>
                  </Field>
                  <Field label="Risco">
                    <select className="input" value={clinicalForm.risco} onChange={e => {
                      const v = e.target.value;
                      setClinical('risco', v);  // Atualiza o formulario clinico
                      setPatient('risco', v);   // Persiste no cadastro do paciente
                    }}>
                      <option value="habitual">Habitual</option>
                      <option value="alerta">Alerta</option>
                      <option value="intensivo">Intensivo</option>
                    </select>
                  </Field>
                  <Field label="CID">
                    <input className="input" placeholder="Ex: F10.2" value={clinicalForm.cid} onChange={e => setClinical('cid', e.target.value)} />
                  </Field>
                </div>

                <div style={{ marginTop: 16 }}>
                  <Field label="Profissional">
                    <input className="input" placeholder="Nome do profissional responsavel" value={clinicalForm.profissional} onChange={e => setClinical('profissional', e.target.value)} />
                  </Field>
                </div>

                <div className="emr-text-grid">
                  <Field label="Subjetivo / queixa">
                    <textarea className="input emr-textarea" placeholder="Relato do usuario, familiares ou equipe..." value={clinicalForm.subjetivo} onChange={e => setClinical('subjetivo', e.target.value)} />
                  </Field>
                  <Field label="Objetivo / observacoes">
                    <textarea className="input emr-textarea" placeholder="Achados, sinais, comportamento, adesao..." value={clinicalForm.objetivo} onChange={e => setClinical('objetivo', e.target.value)} />
                  </Field>
                  <Field label="Avaliacao">
                    <textarea className="input emr-textarea" placeholder="Sintese clinica, hipoteses, riscos e necessidades..." value={clinicalForm.avaliacao} onChange={e => setClinical('avaliacao', e.target.value)} />
                  </Field>
                  <Field label="Plano / conduta">
                    <textarea className="input emr-textarea" placeholder="Condutas, orientacoes, retornos, encaminhamentos..." value={clinicalForm.plano} onChange={e => setClinical('plano', e.target.value)} />
                  </Field>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                  <button onClick={resetClinicalForm} className="btn btn-secondary">Limpar evolucao</button>
                  <button onClick={handleSave} className="btn btn-teal">
                    <Save size={15} /> Salvar Tudo
                  </button>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ClipboardList size={16} color="var(--blue)" />
                  <span style={{ fontSize: 13.5, fontWeight: 750 }}>Linha do Tempo</span>
                </div>
              </div>
              <div className="card-body">
                {timeline.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 12px' }}>
                    <Plus size={30} color="var(--border-strong)" style={{ marginBottom: 10 }} />
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Nenhum registro ainda</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Preencha uma evolucao e salve tudo para iniciar o prontuario.</p>
                  </div>
                ) : (
                  <div className="emr-timeline">
                    {timeline.map(item => (
                      <article key={`${item.kind}-${item.id}`} className="emr-timeline-item">
                        <div className={`emr-dot ${item.kind.startsWith('record') ? 'is-record' : ''}`} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'var(--text-primary)' }}>{item.title}</p>
                              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-muted)' }}>
                                {new Date(item.date).toLocaleDateString('pt-BR')} - {item.subtitle}
                              </p>
                            </div>
                            {(item.kind === 'record' || item.kind === 'record-day') && isAdmin && (
                              <button className="icon-btn danger" title="Excluir ficha vinculada" onClick={() => handleDeleteRecord(item.record?.id || item.recordId)}><Trash2 size={13} /></button>
                            )}
                            {item.kind === 'clinical' && (
                              <>
                                <button className="icon-btn" title="Editar evolucao" onClick={() => handleEditEntry(item.entry)}><Pencil size={13} /></button>
                                {isAdmin && (
                                  <button className="icon-btn danger" title="Excluir evolucao" onClick={() => handleDeleteEntry(item.id)}><Trash2 size={13} /></button>
                                )}
                              </>
                            )}
                          </div>
                          {item.kind === 'clinical' && (
                            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                              {item.entry.avaliacao || item.entry.subjetivo || item.entry.plano || item.entry.cid}
                            </p>
                          )}
                          {(item.kind === 'record' || item.kind === 'record-day') && (
                            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                              {item.details}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingBottom: 40 }}>
          <button onClick={onBack} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="btn btn-primary" style={{ opacity: isSaving ? 0.7 : 1 }}>
            <Save size={15} />
            {isSaving ? 'Salvando...' : 'Salvar Tudo'}
          </button>
        </div>
      </main>
    </div>
  );
}
