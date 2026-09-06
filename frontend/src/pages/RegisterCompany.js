import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

const initialForm = {
  companyName: '',
  companyEmail: '',
  industry: 'Manufacturing',
  phoneNumber: '',
  firstName: '',
  lastName: '',
  ownerEmail: '',
  password: '',
  confirmPassword: ''
};

const RegisterCompany = () => {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { registerCompany } = useTenant();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const { confirmPassword, ...payload } = form;
      await registerCompany(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Register Your Company</h1>
        <p className="subtitle">Set up your isolated IN-Track workspace</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>Company Details</legend>

            <label>
              Company Name
              <input type="text" name="companyName" value={form.companyName} onChange={handleChange} required />
            </label>

            <label>
              Company Email
              <input type="email" name="companyEmail" value={form.companyEmail} onChange={handleChange} required />
            </label>

            <label>
              Industry
              <select name="industry" value={form.industry} onChange={handleChange}>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Logistics">Logistics</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Phone Number
              <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required />
            </label>
          </fieldset>

          <fieldset>
            <legend>Owner Account</legend>

            <label>
              First Name
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
            </label>

            <label>
              Last Name
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
            </label>

            <label>
              Owner Email
              <input type="email" name="ownerEmail" value={form.ownerEmail} onChange={handleChange} required />
            </label>

            <label>
              Password
              <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} />
            </label>

            <label>
              Confirm Password
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required minLength={6} />
            </label>
          </fieldset>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating your workspace...' : 'Register Company'}
          </button>
        </form>

        <p className="switch-auth">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterCompany;
