import React, { useState } from 'react';
import { warehouseService } from '../../services/warehouseService';

const LOCATION_TYPES = ['building', 'shelf', 'bin', 'other'];

const LocationFormModal = ({ existingLocation, allLocations, defaultParentId, onClose, onSaved }) => {
  const [name, setName] = useState(existingLocation?.name || '');
  const [locationType, setLocationType] = useState(existingLocation?.locationType || 'building');
  const [parentLocation, setParentLocation] = useState(
    existingLocation?.parentLocation?._id || existingLocation?.parentLocation || defaultParentId || ''
  );
  const [notes, setNotes] = useState(existingLocation?.notes || '');
  const [street, setStreet] = useState(existingLocation?.address?.street || '');
  const [city, setCity] = useState(existingLocation?.address?.city || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prevent selecting the location itself as its own parent
  const parentOptions = allLocations.filter((l) => l._id !== existingLocation?._id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Location name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        locationType,
        parentLocation: parentLocation || null,
        notes,
        address: (street || city) ? { street, city } : undefined
      };
      if (existingLocation) {
        await warehouseService.updateWarehouse(existingLocation._id, payload);
      } else {
        await warehouseService.createWarehouse(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>{existingLocation ? 'Edit Location' : 'New Location'}</h2>
        <p className="modal-subtitle">
          A top-level location is a building or site. Nest shelves and bins inside it.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Location Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Warehouse, Shelf A3" required />
          </label>

          <label>
            Location Type
            <select value={locationType} onChange={(e) => setLocationType(e.target.value)}>
              {LOCATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label>
            Parent Location
            <select value={parentLocation} onChange={(e) => setParentLocation(e.target.value)}>
              <option value="">— None (top-level site) —</option>
              {parentOptions.map((l) => (
                <option key={l._id} value={l._id}>{l.name} ({l.locationType})</option>
              ))}
            </select>
          </label>

          {!parentLocation && (
            <>
              <label>
                Street Address
                <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Optional" />
              </label>
              <label>
                City
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" />
              </label>
            </>
          )}

          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : existingLocation ? 'Save Changes' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationFormModal;
