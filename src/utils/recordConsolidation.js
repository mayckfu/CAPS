import {
  BPA_CONSOLIDADO,
  BPA_IND_LEFT,
  BPA_IND_RIGHT,
  RAAS_LEFT,
  RAAS_RIGHT,
  bpaKey,
  dayKey,
} from '../data/procedures';

const DAY_PROCEDURE_GROUPS = [
  { title: 'RAAS', procedures: [...RAAS_LEFT, ...RAAS_RIGHT] },
  { title: 'BPA Individualizado', procedures: [...BPA_IND_LEFT, ...BPA_IND_RIGHT] },
];

const BPA_CONSOLIDADO_PROCEDURES = BPA_CONSOLIDADO.flat();
const MONTHS_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentMesRef() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

export function currentYearMonthGroups(year = new Date().getFullYear()) {
  return MONTHS_PT.map((monthName, index) => {
    const mesRef = `${String(index + 1).padStart(2, '0')}/${year}`;
    return {
      key: `${monthName} de ${year}`,
      mesRef,
      records: [],
      latestDate: `${year}-${String(index + 1).padStart(2, '0')}-01`,
      isCalendarOption: true,
    };
  });
}

export function normalizeMesRef(value) {
  const cleaned = String(value || '').replace(/\D/g, '');
  if (cleaned.length === 6) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return value || '';
}

export function formatMesRef(value) {
  if (!value) return '-';
  const cleaned = String(value).replace(/\D/g, '');
  if (cleaned.length === 6) {
    const month = Number.parseInt(cleaned.slice(0, 2), 10);
    const year = cleaned.slice(2);
    if (month >= 1 && month <= 12) return `${MONTHS_PT[month - 1]} de ${year}`;
  }
  return value;
}

function asRecordList(recordOrRecords) {
  return Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords].filter(Boolean);
}

function summarizeDays(dayCounts) {
  const days = Object.entries(dayCounts)
    .map(([day, quantity]) => ({ day: Number(day), quantity }))
    .sort((a, b) => a.day - b.day);
  if (days.length === 0) return '';
  return `Dias: ${days.map(item => item.quantity > 1 ? `${item.day} (${item.quantity}x)` : String(item.day)).join(', ')}`;
}

export function buildRecordConsolidation(recordOrRecords) {
  const records = asRecordList(recordOrRecords);
  const dayGroups = DAY_PROCEDURE_GROUPS.map(group => {
    const items = group.procedures
      .map(proc => {
        const dayCounts = {};
        records.forEach(record => {
          for (let day = 1; day <= 31; day++) {
            if (record[dayKey(proc.code, day)] === 'X') {
              dayCounts[day] = (dayCounts[day] || 0) + 1;
            }
          }
        });
        const quantity = Object.values(dayCounts).reduce((sum, value) => sum + value, 0);
        return {
          code: proc.code,
          name: proc.name,
          quantity,
          detail: summarizeDays(dayCounts),
          days: Object.keys(dayCounts).map(Number).sort((a, b) => a - b),
          dayCounts,
          type: group.title,
        };
      })
      .filter(item => item.quantity > 0);

    return { title: group.title, items };
  }).filter(group => group.items.length > 0);

  const bpaItems = BPA_CONSOLIDADO_PROCEDURES
    .map(proc => {
      const columns = [1, 2, 3, 4]
        .map(col => ({
          col,
          value: records.reduce((sum, record) => (
            sum + (Number.parseInt(record[bpaKey(proc.code, col)] || '0', 10) || 0)
          ), 0),
        }))
        .filter(item => item.value > 0);
      const quantity = columns.reduce((sum, item) => sum + item.value, 0);

      return {
        code: proc.code,
        name: proc.name,
        quantity,
        detail: columns.length ? `Semanas: ${columns.map(item => `${item.col}ª (${item.value}x)`).join(', ')}` : '',
        columns,
        type: 'BPA Consolidado',
      };
    })
    .filter(item => item.quantity > 0);

  const groups = [...dayGroups];
  if (bpaItems.length > 0) groups.push({ title: 'BPA Consolidado', items: bpaItems });

  const totalProcedures = groups.reduce((sum, group) => sum + group.items.length, 0);
  const totalQuantity = groups.reduce(
    (sum, group) => sum + group.items.reduce((groupSum, item) => groupSum + item.quantity, 0),
    0
  );

  return { groups, totalProcedures, totalQuantity };
}

export function buildRecordDailyBreakdown(recordOrRecords) {
  const records = asRecordList(recordOrRecords);
  const days = Array.from({ length: 31 }, (_, index) => ({
    day: index + 1,
    items: [],
  }));

  DAY_PROCEDURE_GROUPS.forEach(group => {
    group.procedures.forEach(proc => {
      for (let day = 1; day <= 31; day++) {
        const quantity = records.reduce((sum, record) => (
          sum + (record[dayKey(proc.code, day)] === 'X' ? 1 : 0)
        ), 0);
        if (quantity > 0) {
          days[day - 1].items.push({
            code: proc.code,
            name: proc.name,
            group: group.title,
            quantity,
          });
        }
      }
    });
  });

  BPA_CONSOLIDADO_PROCEDURES.forEach(proc => {
    for (let day = 1; day <= 31; day++) {
      const quantity = records.reduce((sum, record) => (
        sum + (record[dayKey(proc.code, day)] === 'X' ? 1 : 0)
      ), 0);
      if (quantity > 0) {
        days[day - 1].items.push({
          code: proc.code,
          name: proc.name,
          group: 'BPA Consolidado',
          quantity,
        });
      }
    }
  });

  return days.filter(day => day.items.length > 0);
}
