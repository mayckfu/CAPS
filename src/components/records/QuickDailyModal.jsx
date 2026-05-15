import { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, Save } from 'lucide-react';
import Field from '../ui/Field';
import {
  RAAS_LEFT, RAAS_RIGHT, BPA_IND_LEFT, BPA_IND_RIGHT, BPA_CONSOLIDADO,
  dayKey
} from '../../data/procedures';
import { localDateInputValue } from '../../utils/recordConsolidation';

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

export default function QuickDailyModal({ data, onClose, onApply }) {
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
          <button className="btn btn-secondary" onClose={onClose}>Cancelar</button>
          <button className="btn btn-teal" onClick={() => onApply(date, selected)}>
            <Save size={15} /> Aplicar no dia {selectedDay}
          </button>
        </div>
      </div>
    </div>
  );
}
