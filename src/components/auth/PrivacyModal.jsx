import { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import { saveProfessional } from '../../services/db';

export default function PrivacyModal({ profile, onAccept }) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await saveProfessional({
        ...profile,
        acceptedTermsAt: now
      });
      onAccept();
    } catch (err) {
      console.error('Erro ao aceitar termos:', err);
      alert('Erro ao processar o aceite. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        width: '100%', maxWidth: 540,
        borderRadius: 24,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        animation: 'modalShow 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0F172A, #1E293B)',
          padding: '32px 40px', textAlign: 'center', color: '#fff'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <ShieldCheck size={32} color="#38BDF8" />
          </div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Segurança e Privacidade
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#94A3B8' }}>
            Compromisso com a LGPD e Ética Médica
          </p>
        </div>

        <div style={{ padding: '32px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flexShrink: 0, color: '#2563EB' }}><Lock size={20} /></div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>Sigilo Profissional</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                  Todos os dados acessados neste sistema são confidenciais. O compartilhamento de senhas ou informações de pacientes é estritamente proibido.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flexShrink: 0, color: '#D97706' }}><AlertTriangle size={20} /></div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>Rastreabilidade</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                  Suas ações são registradas em logs de auditoria (quem visualizou, editou ou excluiu dados), conforme exigido pela legislação vigente.
                </p>
              </div>
            </div>
          </div>

          <div style={{ 
            marginTop: 32, padding: 16, background: '#F8FAFC', 
            borderRadius: 12, border: '1px solid #E2E8F0',
            fontSize: 12, color: '#64748B', lineHeight: 1.5
          }}>
            Ao clicar em "Concordar e Acessar", você declara estar ciente das responsabilidades civis e penais sobre o uso das informações contidas neste prontuário eletrônico.
          </div>

          <button 
            onClick={handleAccept}
            disabled={loading}
            style={{
              marginTop: 24, width: '100%', height: 48,
              background: '#2563EB', color: '#fff',
              border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {loading ? 'Processando...' : 'Concordar e Acessar'}
          </button>
        </div>
      </div>
    </div>
  );
}
