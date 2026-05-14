import { useEffect, useState } from 'react';
import {
  LogOut,
  Users,
  ClipboardList,
  Shield,
  Settings,
  HelpCircle,
  FileBarChart,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { logout } from '../../services/auth';

export default function AppShell({ children, user, profile, onOpenProfile, onViewChange, currentView }) {
  const displayName = profile?.displayName || user?.email || 'Usuario';
  const isAdmin = profile?.role === 'admin';
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('caps-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('caps-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const navItems = [
    {
      id: 'citizens',
      label: 'Cidadaos',
      icon: Users,
      active: ['citizens', 'patient-form', 'record-form'].includes(currentView),
    },
    {
      id: 'reports',
      label: 'Relatorios',
      icon: FileBarChart,
      active: currentView === 'reports',
    },
    ...(isAdmin ? [{
      id: 'professionals',
      label: 'Profissionais',
      icon: Shield,
      active: ['professionals', 'prof-form'].includes(currentView),
    }] : []),
    {
      id: 'help',
      label: 'Ajuda & Manual',
      icon: HelpCircle,
      active: currentView === 'help',
    },
  ];

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <ClipboardList size={18} color="#fff" />
          </div>
          <div className="sidebar-logo-text">
            <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>CAPS AD</p>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>Lagarto - SE</p>
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu</div>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${item.active ? 'active' : ''}`}
                onClick={() => onViewChange(item.id)}
                title={item.label}
              >
                <Icon size={16} />
                <span className="sidebar-nav-text">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-row">
            <button className="sidebar-avatar" onClick={onOpenProfile} title="Meu Perfil">
              {displayName.charAt(0).toUpperCase()}
            </button>
            <div className="sidebar-user-text">
              <p>{displayName}</p>
              <span>{isAdmin ? 'Administrador' : 'Profissional'}</span>
            </div>
            <div className="sidebar-footer-actions">
              <button className="sidebar-logout" onClick={onOpenProfile} title="Configuracoes">
                <Settings size={15} />
              </button>
              <button className="sidebar-logout" onClick={logout} title="Sair">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
