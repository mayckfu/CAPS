// All procedures data from the CAPS PDF

export const RAAS_LEFT = [
  { code: '0301080046', name: 'ACOMPANHAMENTO (RESIDENCIA TERAPEUTICA)' },
  { code: '0301080208', name: 'ATENDIMENTO INDIVIDUAL' },
  { code: '0301080216', name: 'ATENDIMENTO EM GRUPO' },
  { code: '0301080224', name: 'ATENÇÃO FAMILIAR' },
  { code: '0301080240', name: 'ATENDIMENTO DOMICILIO P/ PACIENTES E/OU FAMILIARES' },
];

export const RAAS_RIGHT = [
  { code: '0301080275', name: 'PRATICAS CORPORAIS' },
  { code: '0301080283', name: 'PRATICAS EXPRESSIVAS E COMUNICATIVAS' },
  { code: '0301080291', name: 'ATENÇÃO AS SITUAÇÕES DE CRISE' },
  { code: '0301080372', name: 'ACOMPANHAMENTOS SOFRIMENTO OU TRANSTORNOS' },
  { code: '0301080348', name: 'Ações de reabilitação psicossocial' },
  { code: '0301080364', name: 'Acompanhamento com necessidades decorrentes de uso' },
];

export const BPA_IND_LEFT = [
  { code: '0301100209', name: 'MEDICAMENTOS INTRAMUSCULAR' },
  { code: '0101050127', name: 'Constelação familiar' },
  { code: '0301050023', name: 'Assistência domiciliar equipe multi' },
  { code: '0301080445', name: 'AVALIAÇÃO E ACOMPANHAMENTO DE MEDIDAS TERAPÊUTICAS P/ PESSOAS C/ PROBLEMAS DE SM EM CONFLITO COM A LEI' },
];

export const BPA_IND_RIGHT = [
  { code: '0301080437', name: 'ACOLHIMENTO DE PESSOAS C/ PROBLEMAS DE SM EM CONFLITO COM A LEI' },
  { code: '0301100217', name: 'Medicamentos por via oral' },
  { code: '0301100284', name: 'Curativo simples' },
  { code: '0301080232', name: 'ACOLHIMENTO INICIAL' },
];

export const BPA_CONSOLIDADO = [
  [
    { code: '0301100039', name: 'AFERIÇÃO DE PA' },
    { code: '0101010028', name: 'Atividade em grupo' },
    { code: '0101010036', name: 'Atividade física em grupo' },
    { code: '0101030029', name: 'Visita domiciliar/institucional' },
    { code: '0214010015', name: 'GLICEMIA CAPILAR' },
    { code: '0301100012', name: 'Administração de medicamentos' },
  ],
  [
    { code: '0201020033', name: 'Coleta de material p/ exame citopatológico' },
    { code: '0201020041', name: 'Coleta de material p/ exame Laboratorial' },
    { code: '0301010099', name: 'Consulta p/ avaliação do fumante' },
    { code: '0301010137', name: 'Atendimento domiciliar' },
    { code: '0301010161', name: 'Consulta domiciliar' },
  ],
  [
    { code: '0301050104', name: 'Visita Domiciliar Pós Óbito' },
    { code: '0301060118', name: 'Acolhimento c/ classificação de risco' },
    { code: '0301070270', name: 'Matriciamento OUTROS PONTOS PNE' },
    { code: '0301080011', name: 'Abordagem cognitiva do fumante' },
    { code: '0301080143', name: 'Oficina terapêutica SM 1' },
    { code: '0301080151', name: 'Oficina terapêutica e SM 2' },
  ],
  [
    { code: '0301080259', name: 'Ações de articulação de rede' },
    { code: '0301080267', name: 'Fortalecimento do protagonismo' },
    { code: '0301080305', name: 'Matriciamento EAT' },
    { code: '0301080313', name: 'Ações de redução de danos' },
    { code: '0301080399', name: 'Matriciamento urgência e emergência' },
    { code: '0301080453', name: 'MATRICIAMENTO PESSOA C/ TRANSTORNO EM CONFLITO COM A LEI' },
    { code: '0309050049', name: 'Sessão de auriculoterapia' },
    { code: '0309050057', name: 'Sessão de massoterapia' },
    { code: '0301080321', name: 'ACOMPANHAMENTO RESIDENCIAL TERAPÊUTICO' },
  ],
];

// Row/col keys helpers
export function dayKey(code, day) { return `${code}_d${day}`; }
export function bpaKey(code, col) { return `${code}_b${col}`; }

export function buildEmptyData() {
  const data = {};
  [...RAAS_LEFT, ...RAAS_RIGHT, ...BPA_IND_LEFT, ...BPA_IND_RIGHT, ...BPA_CONSOLIDADO.flat()].forEach(p => {
    for (let d = 1; d <= 31; d++) data[dayKey(p.code, d)] = '';
  });
  BPA_CONSOLIDADO.flat().forEach(p => {
    for (let c = 1; c <= 4; c++) data[bpaKey(p.code, c)] = '';
  });
  return data;
}

// For RAAS/BPA-Ind: count how many days are marked (X = 1 mark)
export function calcTotal(code, data, days = 31) {
  let count = 0;
  for (let d = 1; d <= days; d++) {
    if (data[dayKey(code, d)] === 'X') count++;
  }
  return count;
}

export function calcBpaTotal(code, data) {
  let sum = 0;
  for (let c = 1; c <= 4; c++) {
    const v = parseInt(data[bpaKey(code, c)] || '0');
    if (!isNaN(v)) sum += v;
  }
  return sum;
}
