import React, { useEffect, useState } from 'react';
import { assetCategoryService } from '../../services/assetCategoryService';

const StockBreakdownModal = ({ category, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [balances, setBalances] = useState([]);
  const [totalQuantity, setTotalQuantity] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await assetCategoryService.getStockForCategory(category._id);
        setBalances(res.data);
        setTotalQuantity(res.totalQuantity);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load stock breakdown');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category._id]);

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>{category.name} — Stock by Location</h2>
        <p className="modal-subtitle">Unit: {category.unitOfMeasure}</p>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <p className="hint">Loading...</p>
        ) : balances.length === 0 ? (
          <p className="hint">No stock recorded at any location yet. Set balances from the Warehouses page.</p>
        ) : (
          <>
            <div className="stock-total">
              Total across all locations: <strong>{totalQuantity} {category.unitOfMeasure}</strong>
            </div>
            <ul className="stock-list">
              {balances.map((b) => (
                <li key={b._id}>
                  <span>{b.warehouse?.name} <em>({b.warehouse?.locationType})</em></span>
                  <strong>{b.quantity} {category.unitOfMeasure}</strong>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default StockBreakdownModal;
