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

  const riskDistribution = useMemo(() => {
    let intensivo = 0;
    let alerta = 0;
    let habitual = 0;
    attendedPatients.forEach(item => {
      const risco = item.patient?.risco || 'habitual';
      if (risco === 'intensivo') intensivo++;
      else if (risco === 'alerta') alerta++;
      else habitual++;
    });
    const total = attendedPatients.length || 1;
    return {
      intensivo,
      alerta,
      habitual,
      intensivoPct: ((intensivo / total) * 100).toFixed(0),
      alertaPct: ((alerta / total) * 100).toFixed(0),
      habitualPct: ((habitual / total) * 100).toFixed(0),
    };
  }, [attendedPatients]);

  return (
    <div className="reports-container">
      <div className="reports-header-wrapper">
        <div>
          <h1 className="reports-title">
            Relatórios de Produção
          </h1>
          <p className="reports-subtitle">
            Consolidado mensal e painel de controle clínico da unidade CAPS AD
          </p>
        </div>

        <div className="reports-actions">
          <div className="month-selector-bar">
            <button
              className="month-nav-btn"
              onClick={() => setMesRef(prev => addMonthsToMesRef(prev, -1))}
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="month-input-wrapper">
              <Calendar size={16} style={{ position: 'absolute', left: 14, color: 'var(--text-secondary)', pointerEvents: 'none' }} />
              <input
                type="month"
                className="month-input-field"
                value={mesRefToMonthInput(mesRef)}
                onChange={e => updateMonth(e.target.value)}
                aria-label="Mês do relatório"
              />
            </div>
            <button
              className="month-nav-btn"
              onClick={() => setMesRef(prev => addMonthsToMesRef(prev, 1))}
              title="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={printSelectedPatients}
            disabled={selectedPatients.length === 0}
            style={{ opacity: selectedPatients.length === 0 ? 0.6 : 1, height: 48, borderRadius: 'var(--radius-md)' }}
          >
            <Printer size={16} />
            Imprimir selecionados
          </button>
        </div>
      </div>

      <div className="reports-metrics-grid">
        <div className="report-metric-card" style={{ '--accent-color': 'var(--teal)' }}>
          <div className="report-metric-icon-box" style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}>
            <Users size={24} />
          </div>
          <div className="report-metric-content">
            <p className="report-metric-label">Pacientes no Mês</p>
            <p className="report-metric-value">{totalPatients}</p>
          </div>
        </div>

        <div className="report-metric-card" style={{ '--accent-color': 'var(--blue)' }}>
          <div className="report-metric-icon-box" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
            <ClipboardCheck size={24} />
          </div>
          <div className="report-metric-content">
            <p className="report-metric-label">Total Procedimentos</p>
            <p className="report-metric-value">{totalProcedures}</p>
          </div>
        </div>

        <div className="report-metric-card" style={{ '--accent-color': 'var(--success)' }}>
          <div className="report-metric-icon-box" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <BarChart3 size={24} />
          </div>
          <div className="report-metric-content">
            <p className="report-metric-label">Média por Paciente</p>
            <p className="report-metric-value">
              {totalPatients > 0 ? (totalProcedures / totalPatients).toFixed(1) : 0}
            </p>
          </div>
        </div>

        <div className="report-metric-card" style={{ '--accent-color': 'var(--navy)' }}>
          <div className="report-metric-icon-box" style={{ background: 'var(--bg-hover)', color: 'var(--navy)' }}>
            <ClipboardList size={24} />
          </div>
          <div className="report-metric-content">
            <p className="report-metric-label">Fichas Produzidas</p>
            <p className="report-metric-value">{producedRecords.length}</p>
          </div>
        </div>

        <div className="report-metric-card" style={{ '--accent-color': 'var(--warning)' }}>
          <div className="report-metric-icon-box" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <FileBarChart size={24} />
          </div>
          <div className="report-metric-content">
            <p className="report-metric-label">Tipos Diferentes</p>
            <p className="report-metric-value">{productionSummary.length}</p>
          </div>
        </div>

        <div className="report-metric-card" style={{ '--accent-color': 'var(--danger)' }}>
          <div className="report-metric-icon-box" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="report-metric-content">
            <p className="report-metric-label">CNS Pendente</p>
            <p className="report-metric-value">{missingCnsCount}</p>
          </div>
        </div>
      </div>

      <div className="analytics-section-grid">
        <div className="analytics-card">
          <h3 className="analytics-card-title">
            <AlertTriangle size={15} /> Perfil de Acompanhamento
          </h3>
          <div className="analytics-card-content">
            <div className="custom-progress-row">
              <div className="custom-progress-info">
                <span>Plano Intensivo (Alto Risco)</span>
                <span style={{ color: 'var(--danger)' }}>{riskDistribution.intensivo} ({riskDistribution.intensivoPct}%)</span>
              </div>
              <div className="custom-progress-bar-bg">
                <div className="custom-progress-bar-fill" style={{ width: `${riskDistribution.intensivoPct}%`, background: 'var(--grad-danger)' }} />
              </div>
            </div>

            <div className="custom-progress-row">
              <div className="custom-progress-info">
                <span>Plano em Alerta (Médio Risco)</span>
                <span style={{ color: 'var(--warning)' }}>{riskDistribution.alerta} ({riskDistribution.alertaPct}%)</span>
              </div>
              <div className="custom-progress-bar-bg">
                <div className="custom-progress-bar-fill" style={{ width: `${riskDistribution.alertaPct}%`, background: 'var(--warning)' }} />
              </div>
            </div>

            <div className="custom-progress-row">
              <div className="custom-progress-info">
                <span>Plano Habitual (Baixo Risco)</span>
                <span style={{ color: 'var(--success)' }}>{riskDistribution.habitual} ({riskDistribution.habitualPct}%)</span>
              </div>
              <div className="custom-progress-bar-bg">
                <div className="custom-progress-bar-fill" style={{ width: `${riskDistribution.habitualPct}%`, background: 'var(--grad-success)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <h3 className="analytics-card-title">
            <ClipboardCheck size={15} /> Procedimento Mais Frequente
          </h3>
          <div className="analytics-card-content">
            {topProcedure ? (
              <div className="top-procedure-highlight">
                <span className="top-procedure-code">{topProcedure.code}</span>
                <h4 className="top-procedure-name">{topProcedure.name}</h4>
                <p className="top-procedure-volume">
                  {topProcedure.total} <span>realizados</span>
                </p>
              </div>
            ) : (
              <div className="top-procedure-highlight" style={{ borderStyle: 'none' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Sem dados registrados.</p>
              </div>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <h3 className="analytics-card-title">
            <BarChart3 size={15} /> Pacientes de Maior Volume
          </h3>
          <div className="analytics-card-content">
            <div className="volume-ranking-list">
              {topPatients.length === 0 ? (
                <p style={{ margin: 'auto 0', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Sem pacientes registrados no período.</p>
              ) : topPatients.map(item => (
                <div key={item.patientId} className="volume-ranking-item">
                  <span className="volume-ranking-name" title={item.patient.nome}>
                    {item.patient.nome || 'Paciente Desconhecido'}
                  </span>
                  <span className="volume-ranking-badge">
                    {item.totalProcedures} proc.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid-layout">
        <div className="dashboard-panel-card">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">
              <FileBarChart size={18} color="var(--blue)" />
              Produção por Procedimento
            </h3>
          </div>
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead className="premium-table-header">
                <tr>
                  <th className="premium-table-th" style={{ width: 110 }}>Código</th>
                  <th className="premium-table-th">Nome do Procedimento</th>
                  <th className="premium-table-th" style={{ width: 100, textAlign: 'center' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Carregando dados de produção...
                    </td>
                  </tr>
                ) : productionSummary.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Nenhuma produção registrada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  productionSummary.map((proc, index) => (
                    <tr key={proc.code} className="premium-table-row">
                      <td className="premium-table-td premium-table-code">{proc.code}</td>
                      <td className="premium-table-td" style={{ fontWeight: 600 }}>{proc.name}</td>
                      <td className="premium-table-td" style={{ textAlign: 'center' }}>
                        <span className="premium-table-total">{proc.total}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-panel-card">
          <div className="dashboard-panel-header">
            <h3 className="dashboard-panel-title">
              <Users size={18} color="var(--blue)" />
              Fichas no Período ({attendedPatients.length})
            </h3>
            <div className="dashboard-panel-actions">
              <button
                className="btn btn-secondary"
                onClick={toggleAllPatients}
                disabled={attendedPatients.length === 0}
                style={{ height: 34, padding: '0 12px', fontSize: 12.5, borderRadius: 'var(--radius-sm)' }}
              >
                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                Selecionar todos
              </button>
              <button
                className="btn btn-primary"
                onClick={printSelectedPatients}
                disabled={selectedPatients.length === 0}
                style={{ height: 34, padding: '0 12px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', opacity: selectedPatients.length === 0 ? 0.6 : 1 }}
              >
                <Printer size={14} />
                Imprimir ({selectedPatients.length})
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 85px 85px 85px', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
            <span />
            <span>Paciente</span>
            <span>Fichas</span>
            <span>Total</span>
            <span>Última</span>
          </div>

          <div className="premium-patient-list">
            {attendedPatients.map((item, index) => {
              const checked = selectedSet.has(item.patientId);
              const risk = item.patient?.risco || 'habitual';
              const riskLabel = risk === 'intensivo' ? 'Intensivo' : risk === 'alerta' ? 'Alerta' : 'Habitual';
              return (
                <button
                  key={item.patientId}
                  className={`premium-patient-row ${checked ? 'is-selected' : ''}`}
                  onClick={() => togglePatient(item.patientId)}
                >
                  <div className={`patient-checkbox ${checked ? 'is-checked' : ''}`}>
                    {checked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div>
                    <p className="patient-info-title">{item.patient.nome || 'Paciente Desconhecido'}</p>
                    <div className="patient-info-sub">
                      <span>CNS: {item.patient.cns || 'pendente'}</span>
                      <span className={`patient-badge-risk risk-${risk}`}>
                        Plano {riskLabel}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="patient-pill patient-pill-records">
                      {item.records.length} f.
                    </span>
                  </div>
                  <div>
                    <span className="patient-pill patient-pill-procedures">
                      {item.totalProcedures} p.
                    </span>
                  </div>
                  <div className="patient-date-text">
                    {formatShortDate(item.latestDate)}
                  </div>
                </button>
              );
            })}
            {attendedPatients.length === 0 && !loading && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                Sem pacientes com procedimentos neste período.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

