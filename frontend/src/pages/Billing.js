import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { subscriptionService } from '../services/subscriptionService';
import UsageBar from '../components/billing/UsageBar';

const Billing = () => {
  const { companyName, user } = useTenant();

  const [usage, setUsage] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState('');

  const isOwner = user?.role === 'Owner';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usageData, tiersData] = await Promise.all([
        subscriptionService.getUsage(),
        subscriptionService.getTiers()
      ]);
      setUsage(usageData);
      setTiers(tiersData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (tierName) => {
    if (!window.confirm(`Switch your company to the ${tierName} plan?`)) return;
    setUpgrading(tierName);
    try {
      await subscriptionService.changeTier(tierName);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change plan');
    } finally {
      setUpgrading('');
    }
  };

  if (loading) return <div className="loading-screen">Loading billing information...</div>;

  return (
    <div className="team-page">
      <header className="dashboard-header">
        <div>
          <h1>Billing &amp; Plan</h1>
          <p className="tenant-id">{companyName}</p>
        </div>
        <Link to="/dashboard" className="link-back">← Back to Dashboard</Link>
      </header>

      <main>
        {error && <div className="alert alert-error">{error}</div>}

        {usage && (
          <section className="team-section">
            <div className="section-header">
              <div>
                <h2>Current Plan: {usage.tier.name}</h2>
                <p className="section-subtitle">
                  {usage.tier.monthlyPrice === 0 ? 'Free' : `$${usage.tier.monthlyPrice}/month`}
                </p>
              </div>
            </div>

            <div className="usage-grid">
              <UsageBar label="Team Members" {...usage.usage.users} />
              <UsageBar label="Material Types" {...usage.usage.materialTypes} />
              <UsageBar label="Warehouse Sites" {...usage.usage.warehouses} />
            </div>
          </section>
        )}

        <section className="team-section">
          <div className="section-header">
            <h2>Available Plans</h2>
          </div>

          <div className="plan-grid">
            {tiers.map((tier) => {
              const isCurrent = usage?.tier.name === tier.name;
              return (
                <div key={tier._id} className={`plan-card ${isCurrent ? 'plan-card-current' : ''}`}>
                  {isCurrent && <span className="badge badge-owner">Current Plan</span>}
                  <h3>{tier.name}</h3>
                  <p className="plan-price">
                    {tier.monthlyPrice === 0 ? 'Free' : `$${tier.monthlyPrice}`}
                    {tier.monthlyPrice > 0 && <span className="plan-price-period">/month</span>}
                  </p>
                  <ul className="plan-limits">
                    <li>{tier.maxUsers === -1 ? 'Unlimited' : tier.maxUsers} users</li>
                    <li>{tier.maxMaterialTypes === -1 ? 'Unlimited' : tier.maxMaterialTypes} material types</li>
                    <li>{tier.maxWarehouses === -1 ? 'Unlimited' : tier.maxWarehouses} warehouse site(s)</li>
                  </ul>
                  {!isCurrent && isOwner && (
                    <button onClick={() => handleUpgrade(tier.name)} disabled={upgrading === tier.name}>
                      {upgrading === tier.name ? 'Switching...' : `Switch to ${tier.name}`}
                    </button>
                  )}
                  {!isOwner && !isCurrent && (
                    <p className="hint">Only the company owner can change plans.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Billing;
