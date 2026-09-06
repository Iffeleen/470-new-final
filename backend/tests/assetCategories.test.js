const { registerCompany, authHeader, app, request } = require('./helpers');

describe('Part 3 -- Custom Asset Definitions', () => {
  test('Owner can create a custom asset category with custom fields', async () => {
    const { token } = await registerCompany();

    const res = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({
        name: 'Cotton Yarn',
        unitOfMeasure: 'kg',
        customFields: [
          { fieldName: 'batch_color', fieldType: 'text', required: false },
          { fieldName: 'thread_count', fieldType: 'number', required: true }
        ],
        lowStockThreshold: 50,
        description: 'Raw cotton yarn used in weaving.'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Cotton Yarn');
    expect(res.body.data.unitOfMeasure).toBe('kg');
    expect(res.body.data.customFields).toHaveLength(2);
    expect(res.body.data.lowStockThreshold).toBe(50);
  });

  test('unit of measure is free text, not a hardcoded enum', async () => {
    const { token } = await registerCompany();

    for (const unit of ['liters', 'meters', 'yards', 'pieces', 'tonnes', 'bolts']) {
      const res = await request(app)
        .post('/api/asset-categories')
        .set(authHeader(token))
        .send({ name: `Item in ${unit}`, unitOfMeasure: unit });

      expect(res.status).toBe(201);
      expect(res.body.data.unitOfMeasure).toBe(unit);
    }
  });

  test('rejects an unknown customFields fieldType', async () => {
    const { token } = await registerCompany();

    const res = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({
        name: 'Bad Category',
        unitOfMeasure: 'kg',
        customFields: [{ fieldName: 'x', fieldType: 'not_a_real_type' }]
      });

    expect(res.status).toBe(400);
  });

  test('rejects duplicate customFields names within one category', async () => {
    const { token } = await registerCompany();

    const res = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({
        name: 'Dupe Fields',
        unitOfMeasure: 'kg',
        customFields: [
          { fieldName: 'color', fieldType: 'text' },
          { fieldName: 'Color', fieldType: 'text' } // same name, different case
        ]
      });

    expect(res.status).toBe(400);
  });

  test('duplicate category name is rejected within the same tenant', async () => {
    const { token } = await registerCompany();

    await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Steel Rod', unitOfMeasure: 'kg' });

    const res = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Steel Rod', unitOfMeasure: 'pieces' });

    expect(res.status).toBe(400);
  });

  test('the same category name is allowed across two different tenants', async () => {
    const companyA = await registerCompany();
    const companyB = await registerCompany();

    const resA = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(companyA.token))
      .send({ name: 'Steel Rod', unitOfMeasure: 'kg' });

    const resB = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(companyB.token))
      .send({ name: 'Steel Rod', unitOfMeasure: 'pieces' });

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201); // not blocked by tenant A's category
  });

  test('tenants cannot see or fetch each other\'s asset categories', async () => {
    const companyA = await registerCompany();
    const companyB = await registerCompany();

    const createRes = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(companyA.token))
      .send({ name: 'Cotton Yarn', unitOfMeasure: 'kg' });
    const categoryId = createRes.body.data._id;

    // Tenant B's list doesn't include tenant A's category
    const listRes = await request(app)
      .get('/api/asset-categories')
      .set(authHeader(companyB.token));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.find((c) => c._id === categoryId)).toBeUndefined();

    // Tenant B fetching tenant A's category directly by id -> 404 (not leaked)
    const getRes = await request(app)
      .get(`/api/asset-categories/${categoryId}`)
      .set(authHeader(companyB.token));
    expect(getRes.status).toBe(404);

    // Tenant A can fetch its own fine
    const getOwnRes = await request(app)
      .get(`/api/asset-categories/${categoryId}`)
      .set(authHeader(companyA.token));
    expect(getOwnRes.status).toBe(200);
  });

  test('update and (soft) delete an asset category', async () => {
    const { token } = await registerCompany();

    const createRes = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Dye Batch', unitOfMeasure: 'liters', lowStockThreshold: 10 });
    const categoryId = createRes.body.data._id;

    const updateRes = await request(app)
      .put(`/api/asset-categories/${categoryId}`)
      .set(authHeader(token))
      .send({ lowStockThreshold: 25 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.lowStockThreshold).toBe(25);
    expect(updateRes.body.data.name).toBe('Dye Batch'); // untouched fields stay the same

    const deleteRes = await request(app)
      .delete(`/api/asset-categories/${categoryId}`)
      .set(authHeader(token));
    expect(deleteRes.status).toBe(200);

    // Soft-deleted categories no longer show up in the default list
    const listRes = await request(app)
      .get('/api/asset-categories')
      .set(authHeader(token));
    expect(listRes.body.data.find((c) => c._id === categoryId)).toBeUndefined();
  });

  test('unauthenticated requests are rejected', async () => {
    const res = await request(app).get('/api/asset-categories');
    expect(res.status).toBe(401);
  });

  test('a role without inventory:create cannot create asset categories, but can still read them', async () => {
    const { token } = await registerCompany();

    // Create a restricted role with only inventory:view
    const roleRes = await request(app)
      .post('/api/roles')
      .set(authHeader(token))
      .send({ name: 'Read-Only Auditor', permissions: ['inventory:view'] });
    expect(roleRes.status).toBe(201);
    const roleId = roleRes.body.data._id;

    // Invite a teammate into that role via the invitation flow
    const inviteRes = await request(app)
      .post('/api/invitations')
      .set(authHeader(token))
      .send({ email: 'auditor@acme.test', roleId });
    expect(inviteRes.status).toBe(201);
    const inviteToken = inviteRes.body.data.inviteToken;

    const acceptRes = await request(app)
      .post(`/api/invitations/accept/${inviteToken}`)
      .send({ firstName: 'Bob', lastName: 'Auditor', password: 'auditorpass123' });
    expect(acceptRes.status).toBe(201);
    const auditorToken = acceptRes.body.token;

    // Owner creates a category first
    await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Cotton Yarn', unitOfMeasure: 'kg' });

    // Auditor CAN read
    const readRes = await request(app)
      .get('/api/asset-categories')
      .set(authHeader(auditorToken));
    expect(readRes.status).toBe(200);
    expect(readRes.body.count).toBe(1);

    // Auditor CANNOT create
    const createRes = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(auditorToken))
      .send({ name: 'Sneaky Item', unitOfMeasure: 'kg' });
    expect(createRes.status).toBe(403);
  });

  test('creating an asset category enforces the subscription tier\'s maxMaterialTypes limit', async () => {
    const { token } = await registerCompany();

    // Free tier defaults to maxMaterialTypes: 50 -- rather than create 50
    // real categories, we directly lower this tenant's tier limit to 2
    // via the DB to make the test fast and deterministic.
    const mongoose = require('mongoose');
    const Tenant = require('../models/Tenant');
    const SubscriptionTier = require('../models/SubscriptionTier');

    const meRes = await request(app).get('/api/auth/me').set(authHeader(token));
    const tenant = await Tenant.findOne({ tenantId: meRes.body.data.tenantId }).populate('subscriptionTier');
    await SubscriptionTier.findByIdAndUpdate(tenant.subscriptionTier._id, { maxMaterialTypes: 2 });

    await request(app).post('/api/asset-categories').set(authHeader(token)).send({ name: 'Item A', unitOfMeasure: 'kg' });
    await request(app).post('/api/asset-categories').set(authHeader(token)).send({ name: 'Item B', unitOfMeasure: 'kg' });

    const overLimitRes = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Item C', unitOfMeasure: 'kg' });

    expect(overLimitRes.status).toBe(403);
    expect(overLimitRes.body.error).toMatch(/maximum of 2 material types/i);
  });
});
