import React from 'react';

const UsageBar = ({ label, used, limit, unlimited, remaining }) => {
  const pct = unlimited ? 0 : Math.min(100, limit > 0 ? (used / limit) * 100 : 100);
  const isNearLimit = !unlimited && limit > 0 && used / limit >= 0.8;

  return (
    <div className="usage-bar-block">
      <div className="usage-bar-label">
        <span>{label}</span>
        <span className={isNearLimit ? 'usage-count-warning' : 'usage-count'}>
          {unlimited ? `${used} used · Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="usage-bar-track">
        {!unlimited && (
          <div
            className={`usage-bar-fill ${isNearLimit ? 'usage-bar-fill-warning' : ''}`}
            style={{ width: `${pct}%` }}
          />
        )}
        {unlimited && <div className="usage-bar-fill usage-bar-unlimited" style={{ width: '100%' }} />}
      </div>
    </div>
  );
};

export default UsageBar;
