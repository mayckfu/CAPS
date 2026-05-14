import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Shield, User, Trash2, Pencil, Mail, CreditCard, Users, Activity } from 'lucide-react';
import { getProfessionals, deleteProfessional } from '../../services/db';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="professional-stat-card">
    <div className="professional-stat-icon" style={{ background: `${color}15`, color }}>
      <Icon size={22} />
    </div>
    <div className="professional-stat-copy">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  </div>
);

export default function ProfessionalList({ onNew, onEdit }) {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getProfessionals();
      setProfessionals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(professional) {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;
    try {
      await deleteProfessional(professional);
      load();
    } catch (err) {
      alert('Falha ao excluir.');
    }
  }

  const filtered = professionals.filter(p =>
    p.displayName?.toLowerCase().includes(query.toLowerCase()) ||
    p.email?.toLowerCase().includes(query.toLowerCase()) ||
    p.cbo?.includes(query)
  );

  const stats = {
    total: professionals.length,
    admins: professionals.filter(p => p.role === 'admin').length,
    active: professionals.length
  };

  return (
    <div className="professionals-view">
      <div className="professionals-container">
        <header className="professionals-header">
          <div className="professionals-title">
            <h1>Gestão de Profissionais</h1>
            <p>Administre a equipe e níveis de acesso da unidade.</p>
          </div>
          <button className="btn btn-primary professionals-header-action" onClick={onNew}>
            <UserPlus size={18} /> Novo Profissional
          </button>
        </header>

        <div className="professionals-toolbar">
          <div className="professionals-stats-grid">
            <StatCard icon={Users} label="Profissionais" value={stats.total} color="#1565C0" />
            <StatCard icon={Shield} label="Admins" value={stats.admins} color="#7C3AED" />
            <StatCard icon={Activity} label="Ativos" value={stats.active} color="#0097A7" />
          </div>

          <label className="professionals-search" aria-label="Buscar profissional">
            <Search size={18} />
            <input
              className="input"
              placeholder="Buscar profissional por nome, e-mail ou cargo..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="professionals-loading">Carregando equipe...</div>
        ) : filtered.length === 0 ? (
          <section className="professionals-empty">
            <div className="professionals-empty-icon">
              <Users size={62} />
            </div>

            <h2>Comece a montar sua equipe</h2>
            <p>
              Ainda não há profissionais cadastrados. Adicione seus colegas para que possam acessar o sistema e colaborar nos prontuários.
            </p>

            <div className="professionals-empty-actions">
              <button className="btn btn-primary" onClick={onNew}>
                <UserPlus size={18} /> Cadastrar agora
              </button>
              <button className="btn btn-secondary">
                Saiba mais
              </button>
            </div>
          </section>
        ) : (
          <section className="professionals-grid">
            {filtered.map(prof => (
              <article key={prof.id} className="professional-card">
                <div className="professional-card-main">
                  <div className="professional-identity">
                    <div className={`professional-avatar ${prof.role === 'admin' ? 'is-admin' : ''}`}>
                      {prof.role === 'admin' ? <Shield size={25} /> : <User size={25} />}
                    </div>
                    <div className="professional-name-wrap">
                      <h4>{prof.displayName || 'Sem Nome'}</h4>
                      <div className="professional-badges">
                        <span className={`professional-role-badge ${prof.role === 'admin' ? 'is-admin' : ''}`}>
                          {prof.role === 'admin' ? 'Administrador' : 'Profissional'}
                        </span>
                        {prof.mustChangePassword && (
                          <span className="professional-temp-badge">Senha temp.</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="professional-card-actions">
                    <button className="icon-btn" onClick={() => onEdit(prof)} title="Editar"><Pencil size={14} /></button>
                    <button className="icon-btn danger" onClick={() => handleDelete(prof)} title="Excluir"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="professional-meta">
                  <p>
                    <Mail size={14} /> {prof.email}
                  </p>
                  <p>
                    <CreditCard size={14} /> CBO: {prof.cbo || '-'} | CNS: {prof.cns || '-'}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}

        <footer className="professionals-footer">
          <div>© {currentYear} CAPS AD - Gestão Hospitalar</div>
          <nav>
            <a href="#">Termos de Uso</a>
            <a href="#">Suporte Técnico</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
