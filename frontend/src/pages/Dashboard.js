import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import api from '../services/api';

const Dashboard = () => {
  const { user, tenantId, companyName, logout } = useTenant();
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data } = await api.get('/items');
        setItems(data.data);
      } catch (err) {
        console.error('Failed to load items', err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{companyName}</h1>
          <p className="tenant-id">Tenant ID: <code>{tenantId}</code></p>
        </div>
        <div className="user-info">
          <Link to="/categories" className="link-nav">Categories</Link>
          <Link to="/warehouses" className="link-nav">Warehouses</Link>
          <Link to="/team" className="link-nav">Team &amp; Roles</Link>
          <Link to="/billing" className="link-nav">Billing</Link>
          <span>{user?.firstName} {user?.lastName} · {user?.role}</span>
          <button onClick={logout}>Log Out</button>
        </div>
      </header>

      <main>
        <h2>Your Items (Isolated to {companyName})</h2>
        <p className="isolation-note">
          Every item below belongs exclusively to <strong>{tenantId}</strong>.
          No other company registered on IN-Track can see, query, or modify this data.
        </p>

        {loadingItems ? (
          <p>Loading items...</p>
        ) : items.length === 0 ? (
          <p>No items yet. Your workspace is empty and ready to go.</p>
        ) : (
          <ul className="item-list">
            {items.map((item) => (
              <li key={item._id}>
                {item.name} — Qty: {item.quantity}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
