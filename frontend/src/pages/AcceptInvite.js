import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationService } from '../services/teamService';

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const data = await invitationService.verifyInvitation(token);
        setInvite(data);
      } catch (err) {
        setError(err.response?.data?.error || 'This invitation link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await invitationService.acceptInvitation(token, { firstName, lastName, password });
      localStorage.setItem('intrack_token', res.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen">Verifying invitation...</div>;

  if (error && !invite) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invitation Not Valid</h1>
          <div className="alert alert-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join {invite.companyName}</h1>
        <p className="subtitle">
          You've been invited by {invite.invitedBy} as <strong>{invite.roleName}</strong>
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={invite.email} disabled />
          </label>

          <label>
            First Name
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>

          <label>
            Last Name
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>

          <label>
            Confirm Password
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Join Company'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvite;
