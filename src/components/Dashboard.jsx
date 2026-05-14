import { createElement, useState, useMemo, useRef } from 'react';
import {
  Search, UserPlus, FileText, Trash2, ChevronRight,
  Calendar, User, ClipboardList, Download, Upload,
  CheckCircle, XCircle, Clock,
} from 'lucide-react';
import { getPatients, deletePatient, getRecords, exportData, importData } from '../services/db';
import { formatMesRef } from '../utils/recordConsolidation';

/* ─── Avatar ─── */
function Avatar({ name }) {
  const letter = name?.charAt(0)?.toUpperCase() || '?';
  const colors = [
    ['#EFF6FF', '#2563EB'], ['#D1FAE5', '#10B981'], ['#FEF3C7', '#D97706'],
    ['#FCE7F3', '#DB2777'], ['#E0F2FE', '#0284C7'],
  ];
  const [bg, fg] = colors[letter.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: 16,
    }}>
      {letter}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon, gradient }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 22px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {createElement(icon, { size: 22, color: '#fff' })}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ─── */
export default function Dashboard({ onNewPatient, onSelectPatient, onNewRecord, onSelectRecord }) {
  const [search, setSearch]       = useState('');
  const [patients, setPatients]   = useState(() => getPatients());
  const [expandedId, setExpanded] = useState(null);
  const [toast, setToast]         = useState(null);
  const toastTimer                = useRef(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  const refresh = () => setPatients(getPatients());

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (confirm('Importar dados? Isso substituirá os dados atuais.')) {
        await importData(file);
        refresh();
        showToast('Dados importados com sucesso!', 'success');
      }
    } catch {
      showToast('Erro na importação.', 'error');
    }
  }

  const filtered = useMemo(() =>
    patients.filter(p =>
      p.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.cns?.includes(search) ||
      p.cpf?.includes(search)
    ), [patients, search]);

  function handleDeletePatient(e, id) {
    e.stopPropagation();
    if (!confirm('Excluir este paciente e todos os seus registros?')) return;
    deletePatient(id);
    refresh();
  }

  const allRecords = getRecords();
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100%', padding: '28px 24px 80px', maxWidth: 960, margin: '0 auto' }}>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', border: `1.5px solid ${toast.type === 'success' ? 'var(--emerald)' : 'var(--danger)'}`,
          color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
          padding: '12px 22px', borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-lg)', whiteSpace: 'nowrap',
        }}>
          {toast.type === 'success'
            ? <CheckCircle size={16} color="var(--emerald)" />
            : <XCircle size={16} color="var(--danger)" />}
          {toast.msg}
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Painel de Pacientes
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>{today}</p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="file" id="import-db" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          <button
            onClick={() => document.getElementById('import-db').click()}
            className="btn-ghost"
            style={{ height: 36, minHeight: 36, fontSize: 13 }}
          >
            <Upload size={14} /> Importar
          </button>
          <button onClick={exportData} className="btn-ghost" style={{ height: 36, minHeight: 36, fontSize: 13 }}>
            <Download size={14} /> Exportar
          </button>
          <button onClick={onNewPatient} className="btn-primary" style={{ height: 40 }}>
            <UserPlus size={16} /> Novo Paciente
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Pacientes"
          value={patients.length}
          icon={User}
          gradient="linear-gradient(135deg, #2563EB, #0EA5E9)"
        />
        <StatCard
          label="Total de Fichas"
          value={allRecords.length}
          icon={FileText}
          gradient="linear-gradient(135deg, #10B981, #0EA5E9)"
        />
        <StatCard
          label="Mês Atual"
          value={new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          icon={Calendar}
          gradient="linear-gradient(135deg, #F59E0B, #EF4444)"
        />
      </div>

      {/* ── SEARCH ── */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          placeholder="Buscar por nome, CNS ou CPF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', height: 46,
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            paddingLeft: 42, paddingRight: 18,
            fontSize: 14, color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
            outline: 'none', transition: 'all 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'var(--shadow-sm)'; }}
        />
      </div>

      {/* ── PATIENT LIST ── */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          background: '#fff', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #EFF6FF, #E0F2FE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <User size={30} color="var(--accent)" />
          </div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            {search ? 'Nenhum resultado encontrado' : 'Nenhum paciente cadastrado'}
          </p>
          <p style={{ margin: '6px 0 20px', fontSize: 14, color: 'var(--text-muted)' }}>
            {search ? 'Tente outro nome ou CNS' : 'Clique em "Novo Paciente" para começar'}
          </p>
          {!search && (
            <button onClick={onNewPatient} className="btn-primary">
              <UserPlus size={16} /> Adicionar Paciente
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '0 0 4px 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {filtered.length} paciente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>

          {filtered.map(patient => {
            const records  = getRecords(patient.id);
            const isOpen   = expandedId === patient.id;
            const lastRec  = records.at(-1);

            return (
              <div key={patient.id} style={{
                background: '#fff',
                border: `1.5px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: isOpen ? '0 0 0 4px rgba(37,99,235,0.07)' : 'var(--shadow-sm)',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              }}>
                {/* Patient row */}
                <div
                  onClick={() => setExpanded(prev => prev === patient.id ? null : patient.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer' }}
                >
                  <Avatar name={patient.nome} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {patient.nome || 'Sem nome'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      CNS: {patient.cns || '–'}
                      {patient.dataNasc && ` · Nasc: ${patient.dataNasc}`}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {lastRec && (
                      <span className="badge badge-gray" style={{ fontSize: 11 }}>
                        <Clock size={10} style={{ marginRight: 4 }} />
                        {lastRec.mesRef ? formatMesRef(lastRec.mesRef) : new Date(lastRec.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    <span className="badge badge-blue">{records.length} ficha{records.length !== 1 ? 's' : ''}</span>

                    <button
                      onClick={e => { e.stopPropagation(); onSelectPatient(patient); }}
                      className="btn-ghost"
                      style={{ height: 34, minHeight: 34, fontSize: 12, padding: '0 14px' }}
                    >
                      Editar
                    </button>

                    <button
                      onClick={e => handleDeletePatient(e, patient.id)}
                      className="btn-danger"
                    >
                      <Trash2 size={14} />
                    </button>

                    <ChevronRight size={16} color="var(--text-muted)" style={{
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                </div>

                {/* Records sub-panel */}
                {isOpen && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg-subtle)',
                    padding: '14px 18px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Fichas de Atendimento
                      </p>
                      <button
                        onClick={() => onNewRecord(patient)}
                        className="btn-teal"
                        style={{ height: 32, minHeight: 32, fontSize: 12, padding: '0 14px' }}
                      >
                        <FileText size={13} /> Nova Ficha
                      </button>
                    </div>

                    {records.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                        Nenhuma ficha registrada ainda.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {records.map(rec => (
                          <div
                            key={rec.id}
                            onClick={() => onSelectRecord(patient, rec)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: '#fff', border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)', padding: '12px 16px',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.07)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                Mês: {rec.mesRef || '–'}
                              </p>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                                Criado em: {new Date(rec.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <ChevronRight size={14} color="var(--text-muted)" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MOBILE FAB ── */}
      <div style={{
        position: 'fixed', bottom: 24, right: 20, zIndex: 30,
      }}>
        <button
          onClick={onNewPatient}
          className="btn-primary"
          style={{ padding: '12px 22px', height: 'auto', fontSize: 14, boxShadow: 'var(--shadow-lg)' }}
        >
          <UserPlus size={18} /> Novo Paciente
        </button>
      </div>
    </div>
  );
}
