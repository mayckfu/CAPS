import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Users,
  ClipboardCheck,
  Calendar,
  ClipboardList,
  FileBarChart,
  Printer,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getRecordsByMonth, getPatients } from '../../services/db';
import {
  RAAS_LEFT,
  RAAS_RIGHT,
  BPA_IND_LEFT,
  BPA_IND_RIGHT,
  BPA_CONSOLIDADO,
  dayKey,
  bpaKey,
  calcTotal,
  calcBpaTotal,
} from '../../data/procedures';

const ALL_PROCEDURE_META = [
  ...RAAS_LEFT,
  ...RAAS_RIGHT,
  ...BPA_IND_LEFT,
  ...BPA_IND_RIGHT,
  ...BPA_CONSOLIDADO.flat(),
];

const BPA_CONSOLIDADO_CODES = new Set(BPA_CONSOLIDADO.flat().map(proc => proc.code));
const PROCEDURE_GROUPS = [
  { title: 'RAAS', procedures: [...RAAS_LEFT, ...RAAS_RIGHT] },
  { title: 'BPA Individualizado', procedures: [...BPA_IND_LEFT, ...BPA_IND_RIGHT] },
  { title: 'BPA Consolidado', procedures: BPA_CONSOLIDADO.flat() },
];

function mesRefToMonthInput(value) {
  const cleaned = String(value || '').replace(/\D/g, '');
  if (cleaned.length !== 6) return '';
  return `${cleaned.slice(2)}-${cleaned.slice(0, 2)}`;
}

function monthInputToMesRef(value) {
  const [year, month] = String(value || '').split('-');
  if (!year || !month) return '';
  return `${month}/${year}`;
}

function addMonthsToMesRef(value, delta) {
  const monthInput = mesRefToMonthInput(value);
  if (!monthInput) return value;
  const [year, month] = monthInput.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function procedureData(record) {
  return record.procedures || record;
}

function recordProcedureTotal(record) {
  const data = procedureData(record);
  return ALL_PROCEDURE_META.reduce((total, proc) => (
    total + (BPA_CONSOLIDADO_CODES.has(proc.code) ? calcBpaTotal(proc.code, data) : calcTotal(proc.code, data))
  ), 0);
}

function groupProcedureTotal(records, procedures) {
  return procedures.reduce((sum, proc) => (
    sum + records.reduce((recordSum, record) => {
      const data = procedureData(record);
      return recordSum + (BPA_CONSOLIDADO_CODES.has(proc.code) ? calcBpaTotal(proc.code, data) : calcTotal(proc.code, data));
    }, 0)
  ), 0);
}

function formatShortDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function buildPrintableMonthlyRecord(records, mesRef) {
  const orderedRecords = [...records].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const source = orderedRecords.at(-1) || orderedRecords[0] || {};
  const printable = {
    ...source,
    ...(source.procedures || {}),
    id: `${source.id || 'relatorio'}-print`,
    mesRef: source.mesRef || mesRef || '',
    createdAt: source.createdAt || new Date().toISOString(),
  };

  ALL_PROCEDURE_META.forEach(proc => {
    for (let day = 1; day <= 31; day++) {
      printable[dayKey(proc.code, day)] = orderedRecords.some(record => (
        procedureData(record)[dayKey(proc.code, day)] === 'X'
      )) ? 'X' : '';
    }
  });

  BPA_CONSOLIDADO.flat().forEach(proc => {
    for (let col = 1; col <= 4; col++) {
      const total = orderedRecords.reduce((sum, record) => (
        sum + (Number.parseInt(procedureData(record)[bpaKey(proc.code, col)] || '0', 10) || 0)
      ), 0);
      printable[bpaKey(proc.code, col)] = total > 0 ? String(total) : '';
    }
  });

  return printable;
}

export default function ReportsView({ onPrintBatch }) {
  const [mesRef, setMesRef] = useState(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [recs, pats] = await Promise.all([
          getRecordsByMonth(mesRef),
          getPatients(),
        ]);
        setRecords(recs);
        setPatients(pats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mesRef]);

  const attendedPatients = useMemo(() => {
    const patientsById = new Map(patients.map(patient => [patient.id, patient]));
    const groups = new Map();

    records.forEach(record => {
      if (!record.patientId || recordProcedureTotal(record) <= 0) return;
      const current = groups.get(record.patientId) || {
        patient: patientsById.get(record.patientId),
        patientId: record.patientId,
        records: [],
        totalProcedures: 0,
        latestDate: record.createdAt,
      };

      current.records.push(record);
      current.totalProcedures += recordProcedureTotal(record);
      if (new Date(record.createdAt || 0) > new Date(current.latestDate || 0)) {
        current.latestDate = record.createdAt;
      }
      groups.set(record.patientId, current);
    });

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        patient: group.patient || { id: group.patientId, nome: 'Paciente Desconhecido' },
        printableRecord: buildPrintableMonthlyRecord(group.records, mesRef),
      }))
      .sort((a, b) => (a.patient.nome || '').localeCompare(b.patient.nome || ''));
  }, [records, patients, mesRef]);

  useEffect(() => {
    setSelectedPatientIds(attendedPatients.map(item => item.patientId));
  }, [attendedPatients]);

  const productionSummary = ALL_PROCEDURE_META.map(proc => {
    const total = records.reduce((sum, record) => {
      const data = procedureData(record);
      return sum + (BPA_CONSOLIDADO_CODES.has(proc.code) ? calcBpaTotal(proc.code, data) : calcTotal(proc.code, data));
    }, 0);
    return { ...proc, total };
  }).filter(proc => proc.total > 0);

  const totalProcedures = productionSummary.reduce((acc, curr) => acc + curr.total, 0);
  const totalPatients = attendedPatients.length;
  const producedRecords = records.filter(record => recordProcedureTotal(record) > 0);
  const missingCnsCount = attendedPatients.filter(item => !item.patient?.cns).length;
  const topProcedure = [...productionSummary].sort((a, b) => b.total - a.total)[0];
  const topPatients = [...attendedPatients]
    .sort((a, b) => b.totalProcedures - a.totalProcedures)
    .slice(0, 5);
  const categoryTotals = PROCEDURE_GROUPS.map(group => ({
    title: group.title,
    total: groupProcedureTotal(records, group.procedures),
  })).filter(group => group.total > 0);
  const selectedSet = new Set(selectedPatientIds);
  const selectedPatients = attendedPatients.filter(item => selectedSet.has(item.patientId));
  const allSelected = attendedPatients.length > 0 && selectedPatients.length === attendedPatients.length;

  function togglePatient(patientId) {
    setSelectedPatientIds(prev => (
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    ));
  }

  function toggleAllPatients() {
    setSelectedPatientIds(allSelected ? [] : attendedPatients.map(item => item.patientId));
  }

  function printSelectedPatients() {
    if (!selectedPatients.length || !onPrintBatch) return;
    onPrintBatch(selectedPatients.map(item => ({
      patient: item.patient,
      record: item.printableRecord,
    })));
  }

  function updateMonth(value) {
    const nextMesRef = monthInputToMesRef(value);
    if (nextMesRef) setMesRef(nextMesRef);
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
            Relatorios de Producao
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-muted)' }}>
            Consolidado mensal da unidade CAPS AD
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 48, border: '1px solid var(--border)', background: '#fff', borderRadius: 8, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <button
              className="icon-btn"
              onClick={() => setMesRef(prev => addMonthsToMesRef(prev, -1))}
              title="Mes anterior"
              style={{ width: 38, height: 46, borderRadius: 0, borderRight: '1px solid var(--border)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="month"
                value={mesRefToMonthInput(mesRef)}
                onChange={e => updateMonth(e.target.value)}
                aria-label="Mes do relatorio"
                style={{
                  width: 158,
                  height: 46,
                  border: 'none',
                  outline: 'none',
                  paddingLeft: 38,
                  paddingRight: 12,
                  background: '#fff',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                }}
              />
            </div>
            <button
              className="icon-btn"
              onClick={() => setMesRef(prev => addMonthsToMesRef(prev, 1))}
              title="Proximo mes"
              style={{ width: 38, height: 46, borderRadius: 0, borderLeft: '1px solid var(--border)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={printSelectedPatients}
            disabled={selectedPatients.length === 0}
            style={{ opacity: selectedPatients.length === 0 ? 0.6 : 1 }}
          >
            <Printer size={16} />
            Imprimir selecionados
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
            <Users size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pacientes no Mes</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{totalPatients}</p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <ClipboardCheck size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Procedimentos</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{totalProcedures}</p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <BarChart3 size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Media por Paciente</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
              {totalPatients > 0 ? (totalProcedures / totalPatients).toFixed(1) : 0}
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>
            <ClipboardList size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Fichas com Producao</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{producedRecords.length}</p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
            <FileBarChart size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Procedimentos Diferentes</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{productionSummary.length}</p>
          </div>
        </div>

        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>CNS Pendente</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{missingCnsCount}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Producao por Grupo</p>
          {categoryTotals.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Sem producao registrada.</p>
          ) : categoryTotals.map(group => (
            <div key={group.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{group.title}</span>
              <strong style={{ color: 'var(--blue)' }}>{group.total}</strong>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Procedimento Mais Frequente</p>
          {topProcedure ? (
            <>
              <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800 }}>{topProcedure.name}</p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>{topProcedure.code}</p>
              <strong style={{ display: 'block', marginTop: 14, fontSize: 24, color: 'var(--blue)' }}>{topProcedure.total}</strong>
            </>
          ) : (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Sem dados no periodo.</p>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Pacientes com Maior Volume</p>
          {topPatients.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Sem pacientes no periodo.</p>
          ) : topPatients.map(item => (
            <div key={item.patientId} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.patient.nome || 'Paciente Desconhecido'}</span>
              <strong style={{ color: 'var(--blue)', flexShrink: 0 }}>{item.totalProcedures}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1.15fr', gap: 24 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileBarChart size={18} color="var(--blue)" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Producao por Procedimento</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>CODIGO</th>
                <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>NOME DO PROCEDIMENTO</th>
                <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados...</td></tr>
              ) : productionSummary.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma producao registrada neste mes.</td></tr>
              ) : (
                productionSummary.map((proc, index) => (
                  <tr key={proc.code} style={{ borderBottom: index === productionSummary.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>{proc.code}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-primary)' }}>{proc.name}</td>
                    <td style={{ padding: '14px 20px', fontSize: 15, fontWeight: 800, textAlign: 'center', background: 'var(--blue-light)', color: 'var(--blue)' }}>{proc.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Users size={18} color="var(--blue)" />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Pacientes Atendidos ({attendedPatients.length})</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={toggleAllPatients}
                disabled={attendedPatients.length === 0}
                style={{ height: 32, padding: '0 10px', fontSize: 12, gap: 6 }}
              >
                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                Selecionar todos
              </button>
              <button
                className="btn btn-primary"
                onClick={printSelectedPatients}
                disabled={selectedPatients.length === 0}
                style={{ height: 32, padding: '0 10px', fontSize: 12, gap: 6, opacity: selectedPatients.length === 0 ? 0.6 : 1 }}
              >
                <Printer size={14} />
                Imprimir {selectedPatients.length}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 90px 90px', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
            <span />
            <span>Paciente</span>
            <span>Fichas</span>
            <span>Total</span>
            <span>Ultima</span>
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {attendedPatients.map((item, index) => {
              const checked = selectedSet.has(item.patientId);
              return (
                <button
                  key={item.patientId}
                  onClick={() => togglePatient(item.patientId)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    border: 'none',
                    borderBottom: index === attendedPatients.length - 1 ? 'none' : '1px solid var(--border-light)',
                    background: checked ? 'var(--blue-light)' : '#fff',
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 90px 90px 90px',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ color: checked ? 'var(--blue)' : 'var(--text-muted)' }}>
                    {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.patient.nome || 'Paciente Desconhecido'}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                      CNS: {item.patient.cns || 'pendente'}
                      {!item.patient.cns && <span style={{ marginLeft: 8, color: 'var(--danger)', fontWeight: 800 }}>regularizar</span>}
                    </p>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', background: '#fff', padding: '2px 8px', borderRadius: 4, justifySelf: 'start' }}>
                    {item.records.length}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue)', background: '#fff', padding: '2px 8px', borderRadius: 4, justifySelf: 'start' }}>
                    {item.totalProcedures}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {formatShortDate(item.latestDate)}
                  </div>
                </button>
              );
            })}
            {attendedPatients.length === 0 && !loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Sem pacientes com procedimentos neste periodo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
