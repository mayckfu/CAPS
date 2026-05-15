import React, { memo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SectionCard = ({ title, icon: Icon, opened, onToggle, children }) => {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: '#FAFBFD',
          borderBottom: opened ? '1px solid var(--border)' : 'none',
          borderRadius: opened ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
          cursor: 'pointer', border: 'none', color: 'var(--text-primary)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = '#FAFBFD'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={16} color="var(--blue)" />}
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</span>
        </div>
        {opened ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
      </button>
      {opened && <div className="card-body" style={{ padding: '20px' }}>{children}</div>}
    </div>
  );
};

export default memo(SectionCard);
