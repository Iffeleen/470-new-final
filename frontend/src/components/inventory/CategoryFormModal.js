import React, { useState } from 'react';
import { assetCategoryService } from '../../services/assetCategoryService';

const FIELD_TYPES = ['text', 'number', 'date', 'boolean'];
const COMMON_UNITS = ['kg', 'g', 'liters', 'ml', 'meters', 'yards', 'pieces', 'boxes', 'tonnes', 'spools'];

const emptyField = () => ({ fieldName: '', fieldType: 'text', required: false });

const CategoryFormModal = ({ existingCategory, onClose, onSaved }) => {
  const [name, setName] = useState(existingCategory?.name || '');
  const [unitOfMeasure, setUnitOfMeasure] = useState(existingCategory?.unitOfMeasure || 'pieces');
  const [customUnit, setCustomUnit] = useState('');
  const [description, setDescription] = useState(existingCategory?.description || '');
  const [lowStockThreshold, setLowStockThreshold] = useState(existingCategory?.lowStockThreshold ?? '');
  const [customFields, setCustomFields] = useState(existingCategory?.customFields?.length ? existingCategory.customFields : []);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCustomUnit = !COMMON_UNITS.includes(unitOfMeasure) && unitOfMeasure !== '';
  const effectiveUnit = unitOfMeasure === '__custom__' ? customUnit : unitOfMeasure;

  const addField = () => setCustomFields((prev) => [...prev, emptyField()]);
  const removeField = (idx) => setCustomFields((prev) => prev.filter((_, i) => i !== idx));
  const updateField = (idx, key, value) => {
    setCustomFields((prev) => prev.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }
    if (!effectiveUnit || !effectiveUnit.trim()) {
      setError('Unit of measure is required');
      return;
    }
    for (const f of customFields) {
      if (!f.fieldName.trim()) {
        setError('Every custom field needs a name');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        unitOfMeasure: effectiveUnit,
        description,
        lowStockThreshold: lowStockThreshold === '' ? null : Number(lowStockThreshold),
        customFields
      };
      if (existingCategory) {
        await assetCategoryService.updateCategory(existingCategory._id, payload);
      } else {
        await assetCategoryService.createCategory(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-large">
        <h2>{existingCategory ? 'Edit Asset Category' : 'New Asset Category'}</h2>
        <p className="modal-subtitle">
          Define a custom inventory type with the unit and metrics that fit your industry.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Category Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cotton Yarn" required />
          </label>

          <label>
            Unit of Measure
            <select
              value={COMMON_UNITS.includes(unitOfMeasure) ? unitOfMeasure : '__custom__'}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
            >
              {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              <option value="__custom__">Custom unit…</option>
            </select>
          </label>

          {(unitOfMeasure === '__custom__' || !COMMON_UNITS.includes(unitOfMeasure)) && (
            <label>
              Custom Unit Label
              <input
                value={customUnit || (isCustomUnit ? unitOfMeasure : '')}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g. drums, rolls, pallets"
              />
            </label>
          )}

          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </label>

          <label>
            Low Stock Threshold
            <input
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="Optional — used by future low-stock alerts"
            />
          </label>

          <div className="custom-fields-section">
            <div className="custom-fields-header">
              <span>Custom Metrics</span>
              <button type="button" className="btn-chip" onClick={addField}>+ Add Field</button>
            </div>

            {customFields.length === 0 && (
              <p className="hint">No custom fields yet. Add ones like "Color" or "Thread Count" if this category needs extra tracked details.</p>
            )}

            {customFields.map((field, idx) => (
              <div key={idx} className="custom-field-row">
                <input
                  placeholder="Field name"
                  value={field.fieldName}
                  onChange={(e) => updateField(idx, 'fieldName', e.target.value)}
                />
                <select value={field.fieldType} onChange={(e) => updateField(idx, 'fieldType', e.target.value)}>
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="checkbox-label inline-checkbox">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(idx, 'required', e.target.checked)}
                  />
                  Required
                </label>
                <button type="button" className="btn-danger btn-sm" onClick={() => removeField(idx)}>✕</button>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : existingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryFormModal;
