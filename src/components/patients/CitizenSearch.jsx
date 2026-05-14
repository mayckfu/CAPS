import { useEffect, useMemo, useState } from 'react';
import {
  Search, UserPlus, FileText, Trash2, ChevronRight, ChevronDown,
  Clock, User, AlertCircle, CheckCircle, X, Calendar, Hash, ClipboardList,
  Printer,
} from 'lucide-react';
import { getRecords, deletePatient, subscribeToAllPatients } from '../../services/db';
import { formatCNS } from '../../services/dbSchema';
import {
  BPA_CONSOLIDADO,
  BPA_IND_LEFT,
  BPA_IND_RIGHT,
  RAAS_LEFT,
  RAAS_RIGHT,
  bpaKey,
  dayKey,
} from '../../data/procedures';

import {
  buildRecordConsolidation,
  buildRecordDailyBreakdown,
  currentYearMonthGroups,
  formatMesRef,
} from '../../utils/recordConsolidation';

/* Calcula idade */
function calcAge(dataNasc) {
  if (!dataNasc) return null;
  const [d, m, y] = dataNasc.split('/');
  if (!y) return null;
  const birth = new Date(`${y}-${m}-${d}`);
  if (isNaN(birth)) return null;
  return Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function maskString(val, visibleCount = 4) {
  if (!val) return '–';
  const s = String(val).trim();
  if (s.length <= visibleCount) return s;
  return '•'.repeat(s.length - visibleCount) + s.slice(-visibleCount);
}

const DAY_PRINT_PROCEDURES = [
  ...RAAS_LEFT,
  ...RAAS_RIGHT,
  ...BPA_IND_LEFT,
  ...BPA_IND_RIGHT,
  ...BPA_CONSOLIDADO.flat(),
];

function buildPrintableMirrorRecord(records, mesRef) {
  const orderedRecords = [...records].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const source = orderedRecords.at(-1) || orderedRecords[0] || {};
  const printable = {
    ...source,
    id: `${source.id || 'ficha-espelho'}-print`,
    mesRef: source.mesRef || mesRef || '',
    createdAt: source.createdAt || new Date().toISOString(),
  };

  DAY_PRINT_PROCEDURES.forEach(proc => {
    for (let day = 1; day <= 31; day++) {
      printable[dayKey(proc.code, day)] = orderedRecords.some(record => record[dayKey(proc.code, day)] === 'X') ? 'X' : '';
    }
  });

  BPA_CONSOLIDADO.flat().forEach(proc => {
    for (let col = 1; col <= 4; col++) {
      const total = orderedRecords.reduce((sum, record) => (
        sum + (Number.parseInt(record[bpaKey(proc.code, col)] || '0', 10) || 0)
      ), 0);
      printable[bpaKey(proc.code, col)] = total > 0 ? String(total) : '';
    }
  });

  return printable;
}

function RecordMirrorModal({ patient, recordGroup, monthGroups = [], onClose, onPrint }) {
  const [view, setView] = useState('consolidated');
  const [selectedKey, setSelectedKey] = useState(recordGroup.key);
  const selectorGroups = useMemo(() => {
    const groupsByKey = new Map(currentYearMonthGroups().map(group => [group.key, group]));

    monthGroups.forEach(group => {
      const existing = groupsByKey.get(group.key);
      groupsByKey.set(group.key, existing ? { ...existing, ...group } : group);
    });

    if (recordGroup?.key && !groupsByKey.has(recordGroup.key)) {
      groupsByKey.set(recordGroup.key, recordGroup);
    }

    return Array.from(groupsByKey.values());
  }, [monthGroups, recordGroup]);
  const selectedGroup = selectorGroups.find(group => group.key === selectedKey) || recordGroup;
  const records = selectedGroup.records || [];
  const consolidation = useMemo(() => buildRecordConsolidation(records), [records]);
  const dailyBreakdown = useMemo(() => buildRecordDailyBreakdown(records), [records]);
  const monthLabel = selectedGroup.key || formatMesRef(selectedGroup.mesRef);
  const canPrint = records.length > 0;

  useEffect(() => {
    setSelectedKey(recordGroup.key);
  }, [recordGroup.key]);

  function handlePrintMirror() {
    if (!canPrint || !onPrint) return;
    onPrint(patient, buildPrintableMirrorRecord(records, selectedGroup.mesRef));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="record-mirror-title">
      <div className="record-mirror-modal">
        <header className="record-mirror-header">
          <div>
            <p className="record-mirror-kicker">Ficha espelho</p>
            <h2 id="record-mirror-title">{patient.nome || 'Paciente'} - {monthLabel}</h2>
            <span>Consulta consolidada dos procedimentos lançados. {records.length} ficha{records.length !== 1 ? 's' : ''} agrupada{records.length !== 1 ? 's' : ''}.</span>
          </div>
          <label className="record-mirror-month-select">
            Mês de referência
            <select value={selectedKey} onChange={event => setSelectedKey(event.target.value)}>
              {selectorGroups.map(group => (
                <option key={group.key} value={group.key}>
                  {group.key}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-primary"
            style={{ height: 38, padding: '0 14px', gap: 7, whiteSpace: 'nowrap' }}
            onClick={handlePrintMirror}
            disabled={!canPrint}
            title={canPrint ? 'Imprimir ficha BPA preenchida deste periodo' : 'Nao ha ficha neste periodo'}
          >
            <Printer size={15} /> Imprimir BPA
          </button>
          <button className="icon-btn" onClick={onClose} title="Fechar">
            <X size={16} />
          </button>
        </header>

        <div className="record-mirror-tabs">
          <button className={view === 'consolidated' ? 'active' : ''} onClick={() => setView('consolidated')}>
            Consolidado mensal
          </button>
          <button className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>
            Diário do paciente
          </button>
        </div>

        <div className="record-mirror-body">
          {view === 'consolidated' ? (
            <>
              <div className="record-mirror-summary">
                <div>
                  <span>Procedimentos diferentes</span>
                  <strong>{consolidation.totalProcedures}</strong>
                </div>
                <div>
                  <span>Quantidade geral</span>
                  <strong>{consolidation.totalQuantity}</strong>
                </div>
                <div>
                  <span>Mês de referência</span>
                  <strong>{monthLabel}</strong>
                </div>
              </div>

              {consolidation.groups.length === 0 ? (
                <div className="record-mirror-empty">Nenhum procedimento marcado nesta ficha.</div>
              ) : (
                <div className="record-mirror-groups">
                  {consolidation.groups.map(group => (
                    <section key={group.title} className="record-mirror-group">
                      <h3>{group.title}</h3>
                      <div className="record-mirror-table">
                        {group.items.map(item => (
                          <article key={item.code} className="record-mirror-row">
                            <div>
                              <strong>{item.name}</strong>
                              <span>{item.code}</span>
                              {item.detail && <small>{item.detail}</small>}
                            </div>
                            <b>{item.quantity}</b>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="record-mirror-daily">
              {dailyBreakdown.length === 0 ? (
                <div className="record-mirror-empty">Nenhum dia com procedimento marcado nesta ficha.</div>
              ) : (
                dailyBreakdown.map(day => (
                  <section key={day.day} className="record-mirror-day">
                    <div className="record-mirror-day-number">
                      <span>Dia</span>
                      <strong>{String(day.day).padStart(2, '0')}</strong>
                    </div>
                    <div className="record-mirror-day-items">
                      {day.items.map(item => (
                        <article key={`${day.day}-${item.code}`}>
                          <strong>{item.name}</strong>
                          <span>{item.group} - {item.code}{item.quantity > 1 ? ` - ${item.quantity}x` : ''}</span>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Card de resultado de paciente */
function PatientResult({ patient, onEdit, onNewRecord, onOpenMedicalRecord, onSelectRecord, onDelete, onPrint }) {
  const [records, setRecords] = useState([]);
  const [mirrorRecord, setMirrorRecord] = useState(null);
  const age     = calcAge(patient.dataNasc);
  const lastRec = records.at(-1);
  const monthGroups = useMemo(() => {
    const groups = new Map();
    records.forEach(rec => {
      const key = rec.mesRef ? formatMesRef(rec.mesRef) : 'Sem mês de referência';
      const current = groups.get(key) || {
        key,
        mesRef: rec.mesRef,
        records: [],
        latestDate: rec.createdAt,
      };
      current.records.push(rec);
      if (new Date(rec.createdAt || 0) > new Date(current.latestDate || 0)) {
        current.latestDate = rec.createdAt;
        current.mesRef = rec.mesRef || current.mesRef;
      }
      groups.set(key, current);
    });

    return Array.from(groups.values()).sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0));
  }, [records]);

  const openFullHistory = () => {
    if (monthGroups.length === 0) return;
    setMirrorRecord(monthGroups[0]);
  };

  useEffect(() => {
    let active = true;
    getRecords(patient.id).then(items => {
      if (active) setRecords(items);
    });
    return () => { active = false; };
  }, [patient.id]);

  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: expanded ? 'var(--shadow-sm)' : 'none',
      transition: 'all 0.2s',
    }}>
      {/* Cabecalho do card */}
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '16px 20px',
          background: expanded ? 'linear-gradient(135deg, #F0F6FF 0%, #F8FBFF 100%)' : '#fff',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: 'var(--blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 20,
          boxShadow: '0 3px 10px rgba(21,101,192,0.25)',
        }}>
          {patient.nome?.charAt(0)?.toUpperCase() || '?'}
        </div>

        {/* Nome e dados basicos */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {patient.nome || 'Sem nome'}
            </h3>
            {age !== null && (
              <span className="badge badge-blue">{age} anos</span>
            )}
            <span className="badge badge-gray">
              {patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : 'Sexo não informado'}
            </span>
            {/* Badge de Plano de Acompanhamento - sincronizado com a evolução clínica */}
            <span className={`badge ${
              (patient.risco || 'habitual') === 'intensivo' ? 'badge-danger' :
              (patient.risco || 'habitual') === 'alerta'    ? 'badge-blue'   : 'badge-success'
            }`}>
              Plano {
                (patient.risco || 'habitual') === 'intensivo' ? 'intensivo' :
                (patient.risco || 'habitual') === 'alerta'    ? 'em alerta' : 'habitual'
              }
            </span>
          </div>
          <div style={{ marginTop: 5, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-secondary)' }}>
            {patient.cns && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={11} /> CNS: <strong>{maskString(patient.cns, 4)}</strong>
              </span>
            )}
            {patient.cpf && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                CPF: <strong>{maskString(patient.cpf, 3)}</strong>
              </span>
            )}
            {patient.dataNasc && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={11} /> {patient.dataNasc}
              </span>
            )}
            {patient.nomeMae && (
              <span>Mãe: <strong>{patient.nomeMae}</strong></span>
            )}
            {patient.telefone && (
              <span>Tel: <strong>{patient.telefone}</strong></span>
            )}
          </div>
        </div>

        {/* Acoes de exclusao pequenas */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Excluir ${patient.nome}? Esta ação é irreversível.`)) onDelete(patient.id);
            }}
            className="btn btn-danger-ghost"
          >
            <Trash2 size={13} />
          </button>
        </div>
        
        {/* Seta de expansao */}
        <div style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
          <ChevronDown size={20} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* Acoes principais */}
      {expanded && (
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'stretch' }}>

        {/* Nova Ficha */}
        <button
          onClick={() => onNewRecord(patient)}
          className="btn-action btn-action-primary"
          style={{ flex: 1 }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={17} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Nova Ficha de Atendimento</div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 400, marginTop: 1 }}>Iniciar nova consulta agora</div>
          </div>
        </button>

        {/* Historico */}
        <button
          onClick={() => onOpenMedicalRecord(patient)}
          className="btn-action btn-action-teal"
          style={{ flex: 1 }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={17} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Prontuario Eletronico</div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 400, marginTop: 1 }}>Evolucao clinica e linha do tempo</div>
          </div>
        </button>

        <button
          onClick={openFullHistory}
          className={`btn-action ${records.length > 0 ? 'btn-action-teal' : 'btn-action-outline'}`}
          style={{ flex: 1, cursor: records.length === 0 ? 'default' : 'pointer', opacity: records.length === 0 ? 0.7 : 1 }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: records.length > 0 ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Clock size={17} color={records.length > 0 ? '#fff' : 'var(--text-muted)'} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Ver Histórico</div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 400, marginTop: 1 }}>
              {records.length > 0
                ? `${records.length} ficha${records.length !== 1 ? 's' : ''} · Última: ${lastRec?.mesRef ? formatMesRef(lastRec.mesRef) : new Date(lastRec?.createdAt).toLocaleDateString('pt-BR')}`
                : 'Nenhuma ficha registrada'}
            </div>
          </div>
        </button>
      </div>
      )}

      {mirrorRecord && (
        <RecordMirrorModal
          patient={patient}
          recordGroup={mirrorRecord}
          monthGroups={monthGroups}
          onPrint={onPrint}
          onClose={() => setMirrorRecord(null)}
        />
      )}
    </div>
  );
}

/* Main CitizenSearch */
export default function CitizenSearch({ initialContext, onSearchUpdate, onNewPatient, onSelectPatient, onNewRecord, onSelectRecord, onOpenMedicalRecord, onPrint }) {
  const [query, setQuery]       = useState(initialContext?.query || '');
  const [searched, setSearched] = useState(initialContext?.searched || false);
  const [results, setResults]   = useState(initialContext?.results || []);
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllPatients((items) => {
      setAllPatients(items);
      setLoading(false);
      setError(null);
    });
    return unsub;
  }, []);

  // Sincroniza os resultados da busca com as alteracoes ao vivo (ex: risco/plano alterado)
  useEffect(() => {
    setResults(prev => {
      if (!prev.length) return prev;
      const updated = prev.map(p => allPatients.find(a => a.id === p.id) || p);
      if (JSON.stringify(prev) !== JSON.stringify(updated)) {
        return updated;
      }
      return prev;
    });
  }, [allPatients]);

  function handleSearch(e) {
    e?.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;

    const found = allPatients.filter(p =>
      p.nome?.toLowerCase().includes(q) ||
      p.cns?.includes(q) ||
      p.cpf?.includes(q) ||
      p.nomeMae?.toLowerCase().includes(q)
    );
    setResults(found);
    setSearched(true);
    onSearchUpdate({ query: q, results: found, searched: true });
  }

  function handleClear() {
    setQuery(''); 
    setSearched(false); 
    setResults([]);
    onSearchUpdate({ query: '', results: [], searched: false });
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este cadastro de cidadao permanentemente?')) return;
    await deletePatient(id);
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="header-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={18} color="var(--text-primary)" />
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Busca de Cidadão
            </h1>
          </div>
          <button onClick={onNewPatient} className="btn btn-primary" style={{ gap: 7, height: 38, padding: '0 20px' }}>
            <UserPlus size={16} /> Novo Cadastro
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="page-body">

        {/* Busca principal */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ padding: '20px 24px' }}>
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: 13 }}>{error}</span>
              </div>
            )}
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {loading ? 'Carregando base do Firebase...' : 'Buscar por nome, CNS, CPF ou nome da mae'}
            </p>

            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{
                  position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none',
                }} />
                <input
                  autoFocus
                  type="text"
                  disabled={loading}
                  value={query}
                  onChange={e => { setQuery(e.target.value); if (searched) { setSearched(false); setResults([]); } }}
                  placeholder="Ex: Maria da Silva, 000 0000 0000 0000..."
                  className="input input-lg"
                  style={{ paddingLeft: 42, paddingRight: query ? 40 : 16 }}
                />
                {query && (
                  <button type="button" onClick={handleClear} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', padding: 4,
                  }}>
                    <X size={15} />
                  </button>
                )}
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ height: 48, padding: '0 28px', fontSize: 14, opacity: loading ? 0.6 : 1 }}>
                <Search size={16} /> Buscar
              </button>
            </form>
          </div>
        </div>

        {/* Resultados */}
        {searched && (
          <div>
            {results.length > 0 ? (
              <>
                {/* Header resultados */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {results.length} cidadão{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {results.map(p => (
                    <PatientResult
                      key={p.id}
                      patient={p}
                      onEdit={onSelectPatient}
                      onNewRecord={onNewRecord}
                      onOpenMedicalRecord={onOpenMedicalRecord}
                      onSelectRecord={onSelectRecord}
                      onDelete={handleDelete}
                      onPrint={onPrint}
                    />
                  ))}
                </div>
              </>
            ) : (
              /* NENHUM RESULTADO */
              <div className="card">
                <div className="card-body" style={{ padding: '36px 28px', textAlign: 'center' }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'var(--warning-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <AlertCircle size={28} color="var(--warning)" />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Cidadão não encontrado
                  </h3>
                  <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                    Não encontramos nenhum registro para <strong>"{query}"</strong> na base local.
                    Deseja realizar um novo cadastro?
                  </p>
                  <button onClick={onNewPatient} className="btn btn-primary" style={{ height: 44, padding: '0 32px', fontSize: 14, margin: '0 auto' }}>
                    <UserPlus size={17} /> Cadastrar Novo Cidadão
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {!searched && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <Search size={40} color="var(--border-strong)" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Digite o nome ou CNS do cidadão para buscar
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13 }}>
              Ou <button onClick={onNewPatient} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontWeight: 600, fontSize: 13, padding: 0 }}>cadastre um novo cidadão</button>
            </p>
          </div>
        )}

      </div>
    </>
  );
}
