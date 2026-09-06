const jwt = require('jsonwebtoken');

// Signs a JWT embedding the user id. Tenant/role are deliberately NOT put in
// the token payload as the source of truth — we always re-fetch the user's
// current tenant + role from the DB on each request (see auth.js middleware).
// This means revoking a user's access or changing their tenant takes effect
// immediately, without waiting for token expiry.
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const generateSuperAdminToken = (adminId) => {
  return jwt.sign(
    { id: adminId, isSuperAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

module.exports = { generateToken, generateSuperAdminToken };
