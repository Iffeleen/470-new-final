const { registerCompany, authHeader, app, request } = require('./helpers');
const { seedSubscriptionTiers } = require('../utils/seedSubscriptionTiers');
const SubscriptionTier = require('../models/SubscriptionTier');

describe('Part 5 -- Subscription Tier Gatekeeping', () => {
  beforeEach(async () => {
    // tests/setup.js wipes every collection after each test, so the full
    // plan catalog needs re-seeding before any test that lists/uses plans
    // beyond the auto-created Free tier.
    await seedSubscriptionTiers();
  });

  test('GET /api/subscription/tiers returns the full plan catalog, ordered', async () => {
    const { token } = await registerCompany();

    const res = await request(app).get('/api/subscription/tiers').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);
    const names = res.body.data.map((t) => t.name);
    expect(names).toEqual(['Free', 'Starter', 'Professional', 'Enterprise']);
  });

  test('a brand-new company starts on the Free tier', async () => {
    const { token } = await registerCompany();

    const res = await request(app).get('/api/subscription/usage').set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.data.tier.name).toBe('Free');
    expect(res.body.data.usage.materialTypes.limit).toBe(50);
    expect(res.body.data.usage.warehouses.limit).toBe(1);
  });

  test('usage summary reflects real record counts as they are created', async () => {
    const { token } = await registerCompany();

    await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Cotton Yarn', unitOfMeasure: 'kg' });
    await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Steel Rod', unitOfMeasure: 'pieces' });
    await request(app).post('/api/warehouses').set(authHeader(token)).send({ name: 'Main Site' });

    const res = await request(app).get('/api/subscription/usage').set(authHeader(token));

    expect(res.body.data.usage.materialTypes.used).toBe(2);
    expect(res.body.data.usage.materialTypes.remaining).toBe(48);
    expect(res.body.data.usage.warehouses.used).toBe(1);
    expect(res.body.data.usage.warehouses.remaining).toBe(0);
    expect(res.body.data.usage.users.used).toBe(1); // the owner counts as a seat
  });

  test('Owner can upgrade the tenant to a higher plan, immediately raising limits', async () => {
    const { token } = await registerCompany();

    // Fill the Free tier's single warehouse slot first.
    const first = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Site One' });
    expect(first.status).toBe(201);

    const blocked = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Site Two' });
    expect(blocked.status).toBe(403);

    const upgradeRes = await request(app)
      .put('/api/subscription/upgrade')
      .set(authHeader(token))
      .send({ tierName: 'Professional' });
    expect(upgradeRes.status).toBe(200);
    expect(upgradeRes.body.data.tier.name).toBe('Professional');

    // The same request that was blocked a moment ago now succeeds, with
    // zero code changes to the warehouse route itself -- the SAME gate
    // just reads a different limit now.
    const afterUpgrade = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Site Two' });
    expect(afterUpgrade.status).toBe(201);
  });

  test('a non-Owner team member cannot change the plan', async () => {
    const { token } = await registerCompany();

    const roleRes = await request(app)
      .post('/api/roles')
      .set(authHeader(token))
      .send({ name: 'Manager', permissions: ['inventory:view'] });

    const inviteRes = await request(app)
      .post('/api/invitations')
      .set(authHeader(token))
      .send({ email: 'manager@acme.test', roleId: roleRes.body.data._id });

    const acceptRes = await request(app)
      .post(`/api/invitations/accept/${inviteRes.body.data.inviteToken}`)
      .send({ firstName: 'Mo', lastName: 'Manager', password: 'managerpass123' });
    const managerToken = acceptRes.body.token;

    const res = await request(app)
      .put('/api/subscription/upgrade')
      .set(authHeader(managerToken))
      .send({ tierName: 'Professional' });

    expect(res.status).toBe(403);
  });

  test('rejects an unknown plan name', async () => {
    const { token } = await registerCompany();

    const res = await request(app)
      .put('/api/subscription/upgrade')
      .set(authHeader(token))
      .send({ tierName: 'Ultra Mega Plan' });

    expect(res.status).toBe(400);
  });

  test('Enterprise plan (-1 limits) never blocks record creation', async () => {
    const { token } = await registerCompany();

    await request(app)
      .put('/api/subscription/upgrade')
      .set(authHeader(token))
      .send({ tierName: 'Enterprise' });

    // Create well beyond the Free tier's old limit of 1 top-level warehouse.
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/warehouses')
        .set(authHeader(token))
        .send({ name: `Site ${i}` });
      expect(res.status).toBe(201);
    }

    const usageRes = await request(app).get('/api/subscription/usage').set(authHeader(token));
    expect(usageRes.body.data.usage.warehouses.unlimited).toBe(true);
    expect(usageRes.body.data.usage.warehouses.remaining).toBeNull();
  });

  test('cross-tenant isolation: usage and tier are always the requester\'s OWN tenant', async () => {
    const { token: tokenA } = await registerCompany();
    const { token: tokenB } = await registerCompany();

    await request(app)
      .put('/api/subscription/upgrade')
      .set(authHeader(tokenA))
      .send({ tierName: 'Enterprise' });

    const usageB = await request(app).get('/api/subscription/usage').set(authHeader(tokenB));
    expect(usageB.body.data.tier.name).toBe('Free'); // unaffected by Company A's upgrade
  });

  test('unauthenticated requests to subscription routes are rejected', async () => {
    const res = await request(app).get('/api/subscription/usage');
    expect(res.status).toBe(401);
  });

  test('seeding is idempotent -- running it twice does not duplicate tiers', async () => {
    await seedSubscriptionTiers();
    await seedSubscriptionTiers();

    const count = await SubscriptionTier.countDocuments({});
    expect(count).toBe(4);
  });
});
