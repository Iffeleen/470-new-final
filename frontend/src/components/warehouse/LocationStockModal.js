import React, { useEffect, useState } from 'react';
import { warehouseService } from '../../services/warehouseService';
import { assetCategoryService } from '../../services/assetCategoryService';

const LocationStockModal = ({ location, onClose }) => {
  const [balances, setBalances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [stockData, catData] = await Promise.all([
        warehouseService.getStockAtWarehouse(location._id),
        assetCategoryService.getCategories()
      ]);
      setBalances(stockData);
      setCategories(catData);
      if (catData.length > 0 && !selectedCategoryId) setSelectedCategoryId(catData[0]._id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [location._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetStock = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCategoryId || quantity === '') {
      setError('Choose a category and enter a quantity');
      return;
    }

    setSaving(true);
    try {
      await warehouseService.setStockAtLocation(location._id, selectedCategoryId, Number(quantity));
      setQuantity('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>{location.name} — Stock Balances</h2>
        <p className="modal-subtitle">{location.locationType}</p>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="hint">Loading...</p>
        ) : (
          <>
            {balances.length === 0 ? (
              <p className="hint">No stock recorded at this location yet.</p>
            ) : (
              <ul className="stock-list">
                {balances.map((b) => (
                  <li key={b._id}>
                    <span>{b.assetCategory?.name}</span>
                    <strong>{b.quantity} {b.assetCategory?.unitOfMeasure}</strong>
                  </li>
                ))}
              </ul>
            )}

            {categories.length > 0 && (
              <form onSubmit={handleSetStock} className="stock-set-form">
                <label>
                  Category
                  <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name} ({c.unitOfMeasure})</option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity
                  <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
                </label>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Set Balance'}</button>
              </form>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default LocationStockModal;
