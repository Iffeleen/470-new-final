const { registerCompany, authHeader, app, request } = require('./helpers');

describe('Regression: Part 1 -- Multi-Tenant Data Isolation', () => {
  test('health check responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('two companies can register independently and each gets its own tenantId', async () => {
    const a = await registerCompany();
    const b = await registerCompany();
    expect(a.tenantId).not.toBe(b.tenantId);
  });

  test('/api/auth/me resolves to the right user and tenant from the JWT alone', async () => {
    const { token, tenantId, companyName } = await registerCompany();
    const res = await request(app).get('/api/auth/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.tenantId).toBe(tenantId);
    expect(res.body.data.companyName).toBe(companyName);
    expect(res.body.data.role).toBe('Owner');
  });

  test('sample items created by one tenant are invisible to another', async () => {
    const a = await registerCompany();
    const b = await registerCompany();

    await request(app).post('/api/items').set(authHeader(a.token)).send({ name: 'A-only item', quantity: 5 });

    const listB = await request(app).get('/api/items').set(authHeader(b.token));
    expect(listB.body.count).toBe(0);
  });

  test('no token at all is rejected', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Regression: Part 2 -- Granular RBAC', () => {
  test('Owner role is auto-created with the wildcard permission on registration', async () => {
    const { token } = await registerCompany();
    const res = await request(app).get('/api/roles').set(authHeader(token));
    expect(res.status).toBe(200);
    const owner = res.body.data.find((r) => r.isOwnerRole);
    expect(owner).toBeDefined();
    expect(owner.permissions).toEqual(['*']);
  });

  test('the Owner role cannot be edited or deleted', async () => {
    const { token } = await registerCompany();
    const rolesRes = await request(app).get('/api/roles').set(authHeader(token));
    const ownerRole = rolesRes.body.data.find((r) => r.isOwnerRole);

    const editRes = await request(app)
      .put(`/api/roles/${ownerRole._id}`)
      .set(authHeader(token))
      .send({ name: 'Hacked' });
    expect(editRes.status).toBe(400);

    const deleteRes = await request(app)
      .delete(`/api/roles/${ownerRole._id}`)
      .set(authHeader(token));
    expect(deleteRes.status).toBe(400);
  });

  test('a role holding an unknown permission string is rejected', async () => {
    const { token } = await registerCompany();
    const res = await request(app)
      .post('/api/roles')
      .set(authHeader(token))
      .send({ name: 'Bad Role', permissions: ['not:a_real_permission'] });
    expect(res.status).toBe(400);
  });

  test('invitation + accept flow issues a working, correctly-scoped token', async () => {
    const { token, tenantId } = await registerCompany();

    const roleRes = await request(app)
      .post('/api/roles')
      .set(authHeader(token))
      .send({ name: 'Factory Floor Worker', permissions: ['inventory:view', 'manufacturing:log'] });

    const inviteRes = await request(app)
      .post('/api/invitations')
      .set(authHeader(token))
      .send({ email: 'worker@acme.test', roleId: roleRes.body.data._id });
    expect(inviteRes.status).toBe(201);

    const acceptRes = await request(app)
      .post(`/api/invitations/accept/${inviteRes.body.data.inviteToken}`)
      .send({ firstName: 'Wendy', lastName: 'Worker', password: 'workerpass123' });
    expect(acceptRes.status).toBe(201);

    const meRes = await request(app).get('/api/auth/me').set(authHeader(acceptRes.body.token));
    expect(meRes.body.data.tenantId).toBe(tenantId);
    expect(meRes.body.data.role).toBe('Factory Floor Worker');
  });
});
