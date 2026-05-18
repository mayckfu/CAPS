import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2,
  Clock, User, CalendarDays, X, Search,
} from 'lucide-react';
import {
  deleteAppointment,
  getPatients,
  saveAppointment,
  subscribeToAllPatients,
  subscribeToAppointments,
} from '../../services/db';

const WEEKDAYS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildCalendar(year, month) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

/* ─── New Appointment Modal ─── */
function NewApptModal({ date, onClose, onSaved }) {
  const [patients, setPatients] = useState([]);
  const [patSearch, setPatSearch] = useState('');
  const [selected, setSelected]   = useState(null);
  const [hora, setHora]           = useState('08:00');
  const [obs, setObs]             = useState('');

  useEffect(() => {
    return subscribeToAllPatients(setPatients);
  }, []);

  const filtered = patients.filter(p =>
    p.nome?.toLowerCase().includes(patSearch.toLowerCase()) || p.cns?.includes(patSearch)
  ).slice(0, 6);

  async function handleSave() {
    if (!selected) return;
    await saveAppointment({ patientId: selected.id, patientName: selected.nome, date, hora, observacao: obs });
    onSaved();
    onClose();
  }

  const inp = {
    width: '100%', height: 42, padding: '0 14px',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontSize: 14, color: 'var(--text-primary)', background: '#F8FAFC',
    outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,23,42,0.40)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
        width: '100%', maxWidth: 460, padding: 28,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Novo Agendamento</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: '50%', width: 34, height: 34, minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Patient */}
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paciente *</label>
        {selected ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--accent-light)', border: '1.5px solid var(--accent)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{selected.nome}</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex', minHeight: 'unset', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={patSearch}
              onChange={e => setPatSearch(e.target.value)}
              style={{ ...inp, paddingLeft: 36 }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = '#fff'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#F8FAFC'; }}
            />
            {patSearch.length > 0 && filtered.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: '#fff', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                marginTop: 6, overflow: 'hidden',
              }}>
                {filtered.map(p => (
                  <div key={p.id} onClick={() => { setSelected(p); setPatSearch(''); }} style={{
                    padding: '11px 16px', cursor: 'pointer', fontSize: 13,
                    color: 'var(--text-primary)', fontWeight: 500,
                    borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {p.nome}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>CNS: {p.cns || '–'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hora */}
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Horário</label>
        <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ ...inp, marginBottom: 16 }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = '#fff'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#F8FAFC'; }}
        />

        {/* Obs */}
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observação (opcional)</label>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          rows={2}
          placeholder="Ex: Retorno, acolhimento..."
          style={{
            ...inp, height: 'auto', padding: '10px 14px',
            resize: 'vertical', marginBottom: 24,
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.background = '#fff'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = '#F8FAFC'; }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!selected}
            className="btn-primary"
            style={{ flex: 1, opacity: selected ? 1 : 0.4, cursor: selected ? 'pointer' : 'not-allowed' }}
          >
            Confirmar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main AgendaView ─── */
export default function AgendaView({ onBack, onStartRecord, embedded = false }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [appts, setAppts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [allPatients, setAllPatients] = useState([]);

  useEffect(() => {
    const unsubAppts = subscribeToAppointments(setAppts);
    const unsubPatients = subscribeToAllPatients(setAllPatients);
    return () => {
      unsubAppts();
      unsubPatients();
    };
  }, []);

  const cells = useMemo(() => buildCalendar(year, month), [year, month]);

  const apptsByDate = useMemo(() => {
    const map = {};
    appts.forEach(a => { map[a.date] = (map[a.date] || 0) + 1; });
    return map;
  }, [appts]);

  const selectedDate = toDateStr(year, month, selectedDay);
  const dayAppts     = appts.filter(a => a.date === selectedDate).sort((a, b) => a.hora.localeCompare(b.hora));
  const todayStr     = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(1);
  }

  function handleDelete(id) {
    if (!confirm('Excluir este agendamento?')) return;
    deleteAppointment(id);
  }

  return (
    <div style={{ background: 'transparent', display: 'flex', flexDirection: 'column', minHeight: embedded ? 'auto' : '100%' }}>

      {/* Standalone header */}
      {!embedded && (
        <div style={{
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={onBack} className="btn-ghost" style={{ height: 36, minHeight: 36, gap: 6 }}>
            <ArrowLeft size={15} /> Pacientes
          </button>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--teal-light), #E0F2FE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarDays size={17} color="var(--teal)" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>Agenda</h1>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Agendamentos e atendimentos</p>
            </div>
          </div>
        </div>
      )}

      <main style={{ flex: 1, maxWidth: 960, margin: '0 auto', width: '100%', padding: embedded ? '24px 32px' : '24px 20px', paddingBottom: 40 }}>

        {/* Page heading */}
        {embedded && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Agenda</h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>
              {MONTHS_PT[month]} {year}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

          {/* ── LEFT: Calendar ── */}
          <div style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={prevMonth} style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minHeight: 32, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              >
                <ChevronLeft size={18} />
              </button>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {MONTHS_PT[month]} {year}
              </h2>
              <button onClick={nextMonth} style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minHeight: 32, transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', padding: '10px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: 10, gap: 3 }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`e${idx}`} />;
                const dateStr = toDateStr(year, month, day);
                const isToday = dateStr === todayStr;
                const isSel   = day === selectedDay;
                const count   = apptsByDate[dateStr] || 0;

                return (
                  <button key={day} onClick={() => setSelectedDay(day)} style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: 48, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    background: isSel ? '#1C1C1E' : isToday ? 'var(--accent-light)' : 'transparent',
                    color: isSel ? '#fff' : isToday ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: isSel || isToday ? 700 : 500,
                    fontSize: 14, transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isToday ? 'var(--accent-light)' : 'transparent'; }}
                  >
                    {day}
                    {count > 0 && (
                      <span style={{
                        position: 'absolute', bottom: 5,
                        width: 5, height: 5, borderRadius: '50%',
                        background: isSel ? 'rgba(255,255,255,0.7)' : 'var(--teal)',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Day panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Day header */}
            <div style={{
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '16px 18px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {WEEKDAYS[new Date(selectedDate + 'T12:00:00').getDay()]}
                  </p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                    {selectedDay} de {MONTHS_PT[month]}
                  </p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary" style={{ height: 36, minHeight: 36, fontSize: 13, gap: 5 }}>
                  <Plus size={15} /> Agendar
                </button>
              </div>
            </div>

            {/* Appointment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayAppts.length === 0 ? (
                <div style={{
                  background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '32px 16px',
                  textAlign: 'center', boxShadow: 'var(--shadow-sm)',
                }}>
                  <CalendarDays size={28} color="var(--text-muted)" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Sem agendamentos</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Clique em "Agendar" para adicionar</p>
                </div>
              ) : dayAppts.map(appt => (
                <div key={appt.id} style={{
                  background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                  boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'flex-start', gap: 12,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  <div style={{
                    background: '#EFF6FF', color: 'var(--accent)',
                    borderRadius: 'var(--radius-sm)', padding: '5px 10px',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Clock size={11} /> {appt.hora}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {appt.patientName}
                    </p>
                    {appt.observacao && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{appt.observacao}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        const patient = allPatients.find(p => p.id === appt.patientId);
                        if (patient) onStartRecord(patient);
                      }}
                      className="btn-teal"
                      style={{ height: 30, minHeight: 30, fontSize: 11, padding: '0 12px', gap: 5 }}
                    >
                      <User size={12} /> Atender
                    </button>
                    <button onClick={() => handleDelete(appt.id)} className="btn-danger" style={{ width: 30, height: 30, minHeight: 30 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <NewApptModal
          date={selectedDate}
          onClose={() => setShowModal(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
