import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { roleService } from '../services/roleService';
import { teamService, invitationService } from '../services/teamService';
import RoleFormModal from '../components/team/RoleFormModal';
import InviteModal from '../components/team/InviteModal';

const TeamManagement = () => {
  const { companyName } = useTenant();

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [catalog, setCatalog] = useState({ permissions: [], templates: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersData, rolesData, invitesData, catalogData] = await Promise.all([
        teamService.getTeamMembers(),
        roleService.getRoles(),
        invitationService.getInvitations().catch(() => []), // may 403 for non-privileged users
        roleService.getPermissionCatalog()
      ]);
      setMembers(membersData);
      setRoles(rolesData);
      setInvitations(invitesData);
      setCatalog(catalogData);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete the "${role.name}" role? This cannot be undone.`)) return;
    try {
      await roleService.deleteRole(role._id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.firstName} ${member.lastName} from the team?`)) return;
    try {
      await teamService.removeMember(member._id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleRevokeInvite = async (invite) => {
    try {
      await invitationService.revokeInvitation(invite._id);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  if (loading) return <div className="loading-screen">Loading team...</div>;

  return (
    <div className="team-page">
      <header className="dashboard-header">
        <div>
          <h1>Team &amp; Roles</h1>
          <p className="tenant-id">{companyName}</p>
        </div>
        <Link to="/dashboard" className="link-back">← Back to Dashboard</Link>
      </header>

      <main>
        {error && <div className="alert alert-error">{error}</div>}

        <section className="team-section">
          <div className="section-header">
            <h2>Custom Roles</h2>
            <button onClick={() => { setEditingRole(null); setShowRoleModal(true); }}>
              + New Role
            </button>
          </div>

          <div className="role-grid">
            {roles.map((role) => (
              <div key={role._id} className="role-card">
                <div className="role-card-header">
                  <h3>{role.name}</h3>
                  {role.isOwnerRole && <span className="badge badge-owner">Owner</span>}
                </div>
                <p className="role-desc">{role.description || 'No description'}</p>
                <p className="perm-count">
                  {role.isOwnerRole ? 'Full access' : `${role.permissions.length} permission(s)`}
                </p>
                {!role.isOwnerRole && (
                  <div className="role-actions">
                    <button className="btn-secondary" onClick={() => { setEditingRole(role); setShowRoleModal(true); }}>
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => handleDeleteRole(role)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="team-section">
          <div className="section-header">
            <h2>Team Members</h2>
            <button onClick={() => setShowInviteModal(true)}>+ Invite Member</button>
          </div>

          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m._id}>
                  <td>{m.firstName} {m.lastName}</td>
                  <td>{m.email}</td>
                  <td>{m.role?.name}</td>
                  <td>{m.isActive ? 'Active' : 'Inactive'}</td>
                  <td>
                    {!m.role?.isOwnerRole && (
                      <button className="btn-danger btn-sm" onClick={() => handleRemoveMember(m)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {invitations.length > 0 && (
          <section className="team-section">
            <h2>Pending Invitations</h2>
            <table className="team-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Expires</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv._id}>
                    <td>{inv.email}</td>
                    <td>{inv.role?.name}</td>
                    <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-danger btn-sm" onClick={() => handleRevokeInvite(inv)}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>

      {showRoleModal && (
        <RoleFormModal
          catalog={catalog}
          existingRole={editingRole}
          onClose={() => setShowRoleModal(false)}
          onSaved={() => { setShowRoleModal(false); loadAll(); }}
        />
      )}

      {showInviteModal && (
        <InviteModal
          roles={roles.filter((r) => !r.isOwnerRole)}
          onClose={() => setShowInviteModal(false)}
          onSent={() => { setShowInviteModal(false); loadAll(); }}
        />
      )}
    </div>
  );
};

export default TeamManagement;
