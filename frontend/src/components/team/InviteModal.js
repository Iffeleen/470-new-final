import React, { useState } from 'react';
import { invitationService } from '../../services/teamService';

const InviteModal = ({ roles, onClose, onSent }) => {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?._id || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !roleId) {
      setError('Email and role are required');
      return;
    }

    setSubmitting(true);
    try {
      const result = await invitationService.createInvitation(email, roleId);
      // In production this token is emailed rather than shown here.
      setInviteLink(`${window.location.origin}/accept-invite/${result.inviteToken}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Invite Team Member</h2>

        {error && <div className="alert alert-error">{error}</div>}

        {inviteLink ? (
          <div>
            <p>Invitation created! Share this link with your teammate:</p>
            <div className="invite-link-box">{inviteLink}</div>
            <p className="hint">This link expires in 7 days.</p>
            <div className="modal-actions">
              <button onClick={() => { onSent(); }}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Email Address
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label>
              Assign Role
              <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
                {roles.length === 0 && <option value="">No custom roles yet — create one first</option>}
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </label>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" disabled={submitting || roles.length === 0}>
                {submitting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InviteModal;
