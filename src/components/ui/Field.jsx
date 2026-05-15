import React, { memo } from 'react';

const Field = ({ label, required, children, className = '' }) => {
  return (
    <div className={className}>
      <label className="form-label">
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {children}
    </div>
  );
};

export default memo(Field);
