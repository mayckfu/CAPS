import { 
  BookOpen, 
  MousePointer2, 
  FileText, 
  ShieldCheck, 
  Printer, 
  ChevronRight,
  HelpCircle
} from 'lucide-react';

function HelpCard({ icon: Icon, title, description, steps = [] }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      transition: 'all 0.2s',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--blue-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--blue)'
        }}>
          <Icon size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {description}
      </p>

      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--blue)', fontWeight: 800 }}>{i + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpView() {
  return (
    <div style={{ padding: '32px 24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Manual de Operação
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-muted)' }}>
          Guia rápido para uso do Prontuário Eletrônico CAPS AD
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 20 
      }}>
        
        <HelpCard 
          icon={MousePointer2}
          title="Lançamento de Produção"
          description="O sistema permite o lançamento diário de procedimentos para facilitar a consolidação mensal (BPA)."
          steps={[
            "Abra a 'Ficha de Atendimento' do paciente.",
            "Clique em 'Lançamento Diário'.",
            "Marque os procedimentos realizados no dia.",
            "O sistema salvará automaticamente e somará nas colunas do mês."
          ]}
        />

        <HelpCard 
          icon={Printer}
          title="Impressão de Documentos"
          description="Para gerar o PDF oficial de produção mensal (RAAS/BPA)."
          steps={[
            "Na busca de cidadãos, selecione 'Ver Histórico'.",
            "Escolha o mês desejado e abra a Ficha Espelho.",
            "Clique no botão 'Imprimir' (ou Ctrl+P).",
            "O layout já está configurado para Horizontal (A4 Landscape)."
          ]}
        />

        <HelpCard 
          icon={ShieldCheck}
          title="Segurança e LGPD"
          description="Lembre-se das suas responsabilidades legais ao manusear dados sensíveis de saúde."
          steps={[
            "Seu acesso é pessoal e intransferível.",
            "Toda visualização de prontuário é registrada em log.",
            "Não exponha dados de pacientes em telas públicas.",
            "O sistema faz backup automático do código e estrutura."
          ]}
        />

        <HelpCard 
          icon={FileText}
          title="Gestão de Cidadãos"
          description="Como manter o cadastro da unidade sempre atualizado."
          steps={[
            "Use o CNS ou CPF como chave principal de busca.",
            "Mantenha o 'Plano de Acompanhamento' atualizado conforme a evolução.",
            "Arquive fichas antigas apenas via exportação de segurança."
          ]}
        />

      </div>

      <div style={{ 
        marginTop: 40, padding: '24px', 
        background: 'var(--navy)', borderRadius: 'var(--radius-lg)',
        color: '#fff', display: 'flex', alignItems: 'center', gap: 20
      }}>
        <div style={{ 
          width: 48, height: 48, borderRadius: '50%', 
          background: 'rgba(255,255,255,0.1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <HelpCircle size={24} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Precisa de suporte técnico?</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            Contate o administrador do sistema para problemas de acesso ou dúvidas sobre as regras do SUS.
          </p>
        </div>
      </div>
    </div>
  );
}
