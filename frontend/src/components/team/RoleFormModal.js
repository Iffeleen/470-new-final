import React, { useState } from 'react';
import { roleService } from '../../services/roleService';

// Groups raw permission strings like "inventory:view" into a readable
// section label ("Inventory") for the checkbox grid.
const groupPermissions = (permissions) => {
  const groups = {};
  permissions.forEach((perm) => {
    const [module] = perm.split(':');
    const label = module.charAt(0).toUpperCase() + module.slice(1);
    if (!groups[label]) groups[label] = [];
    groups[label].push(perm);
  });
  return groups;
};

const RoleFormModal = ({ catalog, existingRole, onClose, onSaved }) => {
  const [name, setName] = useState(existingRole?.name || '');
  const [description, setDescription] = useState(existingRole?.description || '');
  const [selectedPerms, setSelectedPerms] = useState(existingRole?.permissions || []);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const grouped = groupPermissions(catalog.permissions || []);

  const togglePerm = (perm) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const applyTemplate = (templateName) => {
    const templatePerms = catalog.templates[templateName] || [];
    setName(templateName);
    setSelectedPerms(templatePerms);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Role name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { name, description, permissions: selectedPerms };
      if (existingRole) {
        await roleService.updateRole(existingRole._id, payload);
      } else {
        await roleService.createRole(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-large">
        <h2>{existingRole ? 'Edit Role' : 'Create New Role'}</h2>

        {error && <div className="alert alert-error">{error}</div>}

        {!existingRole && catalog.templates && (
          <div className="template-row">
            <span>Quick start:</span>
            {Object.keys(catalog.templates).map((t) => (
              <button type="button" key={t} className="btn-chip" onClick={() => applyTemplate(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            Role Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </label>

          <div className="permission-groups">
            {Object.entries(grouped).map(([groupLabel, perms]) => (
              <div key={groupLabel} className="permission-group">
                <h4>{groupLabel}</h4>
                {perms.map((perm) => (
                  <label key={perm} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(perm)}
                      onChange={() => togglePerm(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : existingRole ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleFormModal;
