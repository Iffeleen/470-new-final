const request = require('supertest');
const app = require('../app');

/**
 * Registers a brand-new company and returns { token, tenantId, companyName }.
 * Used at the top of most test files so each test starts from a clean,
 * real tenant rather than hand-inserting documents.
 */
async function registerCompany(overrides = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const payload = {
    companyName: `Acme Textiles ${suffix}`,
    companyEmail: `company-${suffix}@acme.test`,
    industry: 'Manufacturing',
    phoneNumber: '+1-555-0100',
    firstName: 'Alice',
    lastName: 'Owner',
    ownerEmail: `alice-${suffix}@acme.test`,
    password: 'supersecret123',
    ...overrides
  };

  const res = await request(app).post('/api/auth/register-company').send(payload);
  if (res.status !== 201) {
    throw new Error(`registerCompany failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.token,
    tenantId: res.body.data.tenantId,
    companyName: res.body.data.companyName,
    ownerEmail: payload.ownerEmail,
    password: payload.password
  };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { registerCompany, authHeader, app, request };
