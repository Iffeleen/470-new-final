import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { assetCategoryService } from '../services/assetCategoryService';
import CategoryFormModal from '../components/inventory/CategoryFormModal';
import StockBreakdownModal from '../components/inventory/StockBreakdownModal';

const AssetCategories = () => {
  const { companyName } = useTenant();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [stockCategory, setStockCategory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await assetCategoryService.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load asset categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete the "${category.name}" category?`)) return;
    try {
      await assetCategoryService.deleteCategory(category._id);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete category');
    }
  };

  if (loading) return <div className="loading-screen">Loading asset categories...</div>;

  return (
    <div className="team-page">
      <header className="dashboard-header">
        <div>
          <h1>Asset Categories</h1>
          <p className="tenant-id">{companyName}</p>
        </div>
        <Link to="/dashboard" className="link-back">← Back to Dashboard</Link>
      </header>

      <main>
        {error && <div className="alert alert-error">{error}</div>}

        <section className="team-section">
          <div className="section-header">
            <div>
              <h2>Custom Inventory Categories</h2>
              <p className="section-subtitle">Define material types with the units and metrics your industry actually uses.</p>
            </div>
            <button onClick={() => { setEditingCategory(null); setShowFormModal(true); }}>+ New Category</button>
          </div>

          {categories.length === 0 ? (
            <p className="hint">No categories yet. Create your first custom inventory type.</p>
          ) : (
            <div className="category-grid">
              {categories.map((cat) => (
                <div key={cat._id} className="category-card">
                  <div className="category-card-header">
                    <h3>{cat.name}</h3>
                    <span className="unit-pill">{cat.unitOfMeasure}</span>
                  </div>
                  {cat.description && <p className="role-desc">{cat.description}</p>}

                  {cat.customFields?.length > 0 && (
                    <div className="field-tags">
                      {cat.customFields.map((f) => (
                        <span key={f.fieldName} className="field-tag">
                          {f.fieldName}{f.required ? '*' : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  {cat.lowStockThreshold !== null && cat.lowStockThreshold !== undefined && (
                    <p className="perm-count">Low-stock alert below: {cat.lowStockThreshold} {cat.unitOfMeasure}</p>
                  )}

                  <div className="role-actions">
                    <button className="btn-secondary" onClick={() => setStockCategory(cat)}>View Stock</button>
                    <button className="btn-secondary" onClick={() => { setEditingCategory(cat); setShowFormModal(true); }}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDelete(cat)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showFormModal && (
        <CategoryFormModal
          existingCategory={editingCategory}
          onClose={() => setShowFormModal(false)}
          onSaved={() => { setShowFormModal(false); load(); }}
        />
      )}

      {stockCategory && (
        <StockBreakdownModal category={stockCategory} onClose={() => setStockCategory(null)} />
      )}
    </div>
  );
};

export default AssetCategories;
