import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { warehouseService } from '../services/warehouseService';
import LocationFormModal from '../components/warehouse/LocationFormModal';
import LocationStockModal from '../components/warehouse/LocationStockModal';
import LocationTreeNode from '../components/warehouse/LocationTreeNode';

const Warehouses = () => {
  const { companyName } = useTenant();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [defaultParentId, setDefaultParentId] = useState(null);
  const [stockLocation, setStockLocation] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await warehouseService.getWarehouses();
      setLocations(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (location) => {
    if (!window.confirm(`Delete "${location.name}"?`)) return;
    try {
      await warehouseService.deleteWarehouse(location._id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete location');
    }
  };

  const handleAddChild = (parentNode) => {
    setEditingLocation(null);
    setDefaultParentId(parentNode._id);
    setShowFormModal(true);
  };

  const handleAddRoot = () => {
    setEditingLocation(null);
    setDefaultParentId(null);
    setShowFormModal(true);
  };

  const handleEdit = (node) => {
    setEditingLocation(node);
    setDefaultParentId(null);
    setShowFormModal(true);
  };

  // Build a parentId -> children[] lookup, and the top-level roots, from the flat list
  const childrenMap = {};
  const roots = [];
  locations.forEach((loc) => {
    const parentId = loc.parentLocation?._id || loc.parentLocation || null;
    if (parentId) {
      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      childrenMap[parentId].push(loc);
    } else {
      roots.push(loc);
    }
  });

  if (loading) return <div className="loading-screen">Loading locations...</div>;

  return (
    <div className="team-page">
      <header className="dashboard-header">
        <div>
          <h1>Warehouses &amp; Locations</h1>
          <p className="tenant-id">{companyName}</p>
        </div>
        <Link to="/dashboard" className="link-back">← Back to Dashboard</Link>
      </header>

      <main>
        {error && <div className="alert alert-error">{error}</div>}

        <section className="team-section">
          <div className="section-header">
            <div>
              <h2>Physical Locations</h2>
              <p className="section-subtitle">Buildings, shelves, and bins — nest them however deep your operation needs.</p>
            </div>
            <button onClick={handleAddRoot}>+ New Building / Site</button>
          </div>

          {roots.length === 0 ? (
            <p className="hint">No locations yet. Add your first warehouse or site.</p>
          ) : (
            <div className="location-tree">
              {roots.map((root) => (
                <LocationTreeNode
                  key={root._id}
                  node={root}
                  childrenMap={childrenMap}
                  depth={0}
                  onAddChild={handleAddChild}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewStock={setStockLocation}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {showFormModal && (
        <LocationFormModal
          existingLocation={editingLocation}
          allLocations={locations}
          defaultParentId={defaultParentId}
          onClose={() => setShowFormModal(false)}
          onSaved={() => { setShowFormModal(false); load(); }}
        />
      )}

      {stockLocation && (
        <LocationStockModal location={stockLocation} onClose={() => setStockLocation(null)} />
      )}
    </div>
  );
};

export default Warehouses;
