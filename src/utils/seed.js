import { savePatient, saveClinicalEntry, saveRecord } from '../services/db';
import { localDateInputValue } from './recordConsolidation';

export async function seedDemoData() {
  try {
    console.log('Iniciando simulação criativa de dados...');

    // ── 1. RICK GRIMES ──
    const rick = await savePatient({
      nome: 'RICK GRIMES',
      nomeMae: 'LORI GRIMES',
      dataNasc: '1973-09-14',
      sexo: 'Masculino',
      cns: '123456789012345',
      cpf: '123.456.789-01',
      telefone: '(79) 99999-1234',
      cidadeNasc: 'Lagarto',
      ufNasc: 'SE',
      corRaca: '1',
      escolaridade: '5',
      ocupacao: 'Ex-Vice-Xerife / Líder de Grupo',
      logradouro: 'Rua dos Sobreviventes',
      numero: '100',
      bairro: 'Centro',
      cidade: 'Lagarto',
      uf: 'SE',
      cep: '49400-000',
      religiao: 'Católica',
      estadoCivil: 'Viúvo',
      nomePai: 'Não informado',
      orientacaoSexual: 'Heterossexual',
      identidadeGenero: 'Cisgênero'
    });

    // Evolução 1: Admissão
    await saveClinicalEntry({
      patientId: rick.id,
      dataAtendimento: '2026-05-10',
      subjetivo: 'Paciente admitido apresentando sinais claros de exaustão emocional e hipervigilância. Relata histórico de perdas familiares traumáticas e responsabilidade excessiva sobre terceiros.',
      objetivo: 'Paciente alerta, orientado, porém com discurso focado em segurança e proteção. Sinais vitais estáveis. Ausência de ideação suicida no momento.',
      avaliacao: 'F43.1 - Estado de estresse pós-traumático.',
      plano: 'Início de acompanhamento psicossocial. Agendada consulta com psiquiatria para avaliação de suporte farmacológico para insônia.'
    });

    // Evolução 2: Retorno
    await saveClinicalEntry({
      patientId: rick.id,
      dataAtendimento: localDateInputValue(),
      subjetivo: 'Relata melhora discreta no padrão de sono, mas mantém pensamentos intrusivos sobre eventos passados.',
      objetivo: 'Apresenta-se mais calmo, mantendo contato visual. Disposto a participar de grupos terapêuticos.',
      avaliacao: 'F43.1 - Estado de estresse pós-traumático (em acompanhamento).',
      plano: 'Encaminhado para Grupo de Apoio a Enlutados. Retorno em 15 dias.'
    });

    // ── 2. ALANE DIAS ──
    const alane = await savePatient({
      nome: 'ALANE DIAS',
      nomeMae: 'MARIA DIAS',
      dataNasc: '1999-03-09',
      sexo: 'Feminino',
      cns: '987654321098765',
      cpf: '987.654.321-09',
      telefone: '(79) 98888-4321',
      cidadeNasc: 'Belém',
      ufNasc: 'PA',
      corRaca: '4',
      escolaridade: '5',
      ocupacao: 'Bailarina / Atriz Profissional',
      logradouro: 'Avenida das Artes',
      numero: '2024',
      bairro: 'Jardins',
      cidade: 'Aracaju',
      uf: 'SE',
      cep: '49000-000',
      religiao: 'Espírita',
      estadoCivil: 'Solteira',
      nomePai: 'Não informado',
      orientacaoSexual: 'Heterossexual',
      identidadeGenero: 'Cisgênero'
    });

    // Evolução 1: Admissão
    await saveClinicalEntry({
      patientId: alane.id,
      dataAtendimento: '2026-05-12',
      subjetivo: 'Paciente queixa-se de crises de ansiedade recorrentes relacionadas à exposição pública e pressão estética. Relata episódios de taquicardia e sudorese antes de apresentações.',
      objetivo: 'Paciente comunicativa, com discurso acelerado. Demonstra preocupação excessiva com a opinião alheia. Exame físico normal.',
      avaliacao: 'F41.1 - Ansiedade generalizada.',
      plano: 'Psicoterapia focalizada em TCC (Terapia Cognitivo-Comportamental). Técnicas de manejo de estresse e relaxamento diafragmático.'
    });

    console.log('Seed completo com Rick e Alane!');
    return true;
  } catch (err) {
    console.error('Erro no Seed:', err);
    throw err;
  }
}
