const { registerCompany, authHeader, app, request } = require('./helpers');

describe('Part 4 -- Multi-Warehouse / Location Mapping', () => {
  test('Owner can create a top-level warehouse (building)', async () => {
    const { token } = await registerCompany();

    const res = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Main Warehouse', locationType: 'building', address: { city: 'Dhaka' } });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Main Warehouse');
    expect(res.body.data.locationType).toBe('building');
    expect(res.body.data.parentLocation).toBeNull();
  });

  test('a shelf can be nested inside a building via parentLocation', async () => {
    const { token } = await registerCompany();

    const buildingRes = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Main Warehouse', locationType: 'building' });
    const buildingId = buildingRes.body.data._id;

    const shelfRes = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Shelf A3', locationType: 'shelf', parentLocation: buildingId });

    expect(shelfRes.status).toBe(201);
    expect(shelfRes.body.data.parentLocation).toBe(buildingId);

    const binRes = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Bin 12', locationType: 'bin', parentLocation: shelfRes.body.data._id });
    expect(binRes.status).toBe(201);
    expect(binRes.body.data.locationType).toBe('bin');
  });

  test('rejects a parentLocation that does not exist or belongs to another tenant', async () => {
    const { token } = await registerCompany();
    const { token: otherToken } = await registerCompany();

    const otherBuilding = await request(app)
      .post('/api/warehouses')
      .set(authHeader(otherToken))
      .send({ name: 'Their Warehouse' });

    const res = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'My Shelf', parentLocation: otherBuilding.body.data._id });

    expect(res.status).toBe(400);
  });

  test('rejects duplicate location names within the same tenant, allows across tenants', async () => {
    const { token } = await registerCompany();
    const { token: otherToken } = await registerCompany();

    // Use sub-locations (shelves) here rather than a second top-level
    // warehouse -- the Free tier only allows 1 top-level warehouse, and a
    // second one would correctly get blocked by the subscription limit
    // (403) before ever reaching the duplicate-name check (400). Nesting
    // under a parent isolates what this test is actually verifying.
    const building = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Main Warehouse' });
    expect(building.status).toBe(201);

    const first = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Shelf A', locationType: 'shelf', parentLocation: building.body.data._id });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Shelf A', locationType: 'shelf', parentLocation: building.body.data._id });
    expect(duplicate.status).toBe(400);

    const otherBuilding = await request(app)
      .post('/api/warehouses')
      .set(authHeader(otherToken))
      .send({ name: 'Main Warehouse' });
    const otherTenantSameName = await request(app)
      .post('/api/warehouses')
      .set(authHeader(otherToken))
      .send({ name: 'Shelf A', locationType: 'shelf', parentLocation: otherBuilding.body.data._id });
    expect(otherTenantSameName.status).toBe(201);
  });

  test('a location cannot be re-parented into its own descendant (cycle prevention)', async () => {
    const { token } = await registerCompany();

    const building = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Building', locationType: 'building' });
    const shelf = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Shelf', locationType: 'shelf', parentLocation: building.body.data._id });

    // Try to make the building a child of its own shelf -- should be rejected.
    const res = await request(app)
      .put(`/api/warehouses/${building.body.data._id}`)
      .set(authHeader(token))
      .send({ parentLocation: shelf.body.data._id });

    expect(res.status).toBe(400);
  });

  test('cross-tenant isolation: Company B cannot see or fetch Company A\'s warehouse', async () => {
    const { token: tokenA } = await registerCompany();
    const { token: tokenB } = await registerCompany();

    const createRes = await request(app)
      .post('/api/warehouses')
      .set(authHeader(tokenA))
      .send({ name: 'Acme Main Site' });
    const warehouseId = createRes.body.data._id;

    const listB = await request(app).get('/api/warehouses').set(authHeader(tokenB));
    expect(listB.body.count).toBe(0);

    const getB = await request(app).get(`/api/warehouses/${warehouseId}`).set(authHeader(tokenB));
    expect(getB.status).toBe(404);
  });

  test('update, then soft delete a warehouse', async () => {
    const { token } = await registerCompany();

    const createRes = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Old Name' });
    const id = createRes.body.data._id;

    const updateRes = await request(app)
      .put(`/api/warehouses/${id}`)
      .set(authHeader(token))
      .send({ name: 'New Name', notes: 'Renamed after audit' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('New Name');

    const deleteRes = await request(app).delete(`/api/warehouses/${id}`).set(authHeader(token));
    expect(deleteRes.status).toBe(200);

    const listRes = await request(app).get('/api/warehouses').set(authHeader(token));
    expect(listRes.body.data.find((w) => w._id === id)).toBeUndefined();
  });

  test('cannot delete a location that still has active children', async () => {
    const { token } = await registerCompany();

    const building = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Building' });
    await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Shelf', parentLocation: building.body.data._id });

    const deleteRes = await request(app)
      .delete(`/api/warehouses/${building.body.data._id}`)
      .set(authHeader(token));

    expect(deleteRes.status).toBe(400);
  });

  test('creating a second TOP-LEVEL warehouse enforces the Free tier\'s maxWarehouses limit (default 1)', async () => {
    const { token } = await registerCompany();

    const first = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Site One' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Site Two' });
    expect(second.status).toBe(403);
  });

  test('sub-locations (shelves/bins) do NOT count against the warehouse limit', async () => {
    const { token } = await registerCompany();

    const building = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Only Site' });
    expect(building.status).toBe(201);

    // Free tier allows only 1 top-level site, but shelves inside it are free.
    for (const shelfName of ['Shelf A', 'Shelf B', 'Shelf C']) {
      const res = await request(app)
        .post('/api/warehouses')
        .set(authHeader(token))
        .send({ name: shelfName, locationType: 'shelf', parentLocation: building.body.data._id });
      expect(res.status).toBe(201);
    }
  });

  test('a role without warehouse:create cannot create locations, but can still read them', async () => {
    const { token } = await registerCompany();

    const roleRes = await request(app)
      .post('/api/roles')
      .set(authHeader(token))
      .send({ name: 'Viewer Only', permissions: ['warehouse:view'] });
    const roleId = roleRes.body.data._id;

    const inviteRes = await request(app)
      .post('/api/invitations')
      .set(authHeader(token))
      .send({ email: 'viewer@acme.test', roleId });
    const inviteToken = inviteRes.body.data.inviteToken;

    const acceptRes = await request(app)
      .post(`/api/invitations/accept/${inviteToken}`)
      .send({ firstName: 'Vic', lastName: 'Viewer', password: 'viewerpass123' });
    const viewerToken = acceptRes.body.token;

    await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Main Site' });

    const readRes = await request(app).get('/api/warehouses').set(authHeader(viewerToken));
    expect(readRes.status).toBe(200);
    expect(readRes.body.count).toBe(1);

    const createRes = await request(app)
      .post('/api/warehouses')
      .set(authHeader(viewerToken))
      .send({ name: 'Sneaky Site' });
    expect(createRes.status).toBe(403);
  });

  test('unauthenticated requests are rejected', async () => {
    const res = await request(app).get('/api/warehouses');
    expect(res.status).toBe(401);
  });
});

describe('Part 4 -- Per-Location Stock Balances', () => {
  const setupWarehousesAndCategory = async (token) => {
    const wA = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Warehouse A' });

    const wAShelf = await request(app)
      .post('/api/warehouses')
      .set(authHeader(token))
      .send({ name: 'Warehouse A Shelf 1', parentLocation: wA.body.data._id });

    const category = await request(app)
      .post('/api/asset-categories')
      .set(authHeader(token))
      .send({ name: 'Cotton Yarn', unitOfMeasure: 'kg' });

    return {
      warehouseAId: wA.body.data._id,
      warehouseBId: wAShelf.body.data._id,
      categoryId: category.body.data._id
    };
  };

  test('the SAME material can carry different balances at different locations', async () => {
    const { token } = await registerCompany();
    const { warehouseAId, warehouseBId, categoryId } = await setupWarehousesAndCategory(token);

    const setA = await request(app)
      .put(`/api/warehouses/${warehouseAId}/stock/${categoryId}`)
      .set(authHeader(token))
      .send({ quantity: 120 });
    expect(setA.status).toBe(200);
    expect(setA.body.data.quantity).toBe(120);

    const setB = await request(app)
      .put(`/api/warehouses/${warehouseBId}/stock/${categoryId}`)
      .set(authHeader(token))
      .send({ quantity: 35 });
    expect(setB.status).toBe(200);
    expect(setB.body.data.quantity).toBe(35);

    const stockAtA = await request(app)
      .get(`/api/warehouses/${warehouseAId}/stock`)
      .set(authHeader(token));
    expect(stockAtA.body.data[0].quantity).toBe(120);

    const breakdown = await request(app)
      .get(`/api/asset-categories/${categoryId}/stock`)
      .set(authHeader(token));
    expect(breakdown.status).toBe(200);
    expect(breakdown.body.count).toBe(2);
    expect(breakdown.body.totalQuantity).toBe(155);
  });

  test('setting stock again at the same location updates it (upsert), not duplicates it', async () => {
    const { token } = await registerCompany();
    const { warehouseAId, categoryId } = await setupWarehousesAndCategory(token);

    await request(app)
      .put(`/api/warehouses/${warehouseAId}/stock/${categoryId}`)
      .set(authHeader(token))
      .send({ quantity: 50 });

    const updateRes = await request(app)
      .put(`/api/warehouses/${warehouseAId}/stock/${categoryId}`)
      .set(authHeader(token))
      .send({ quantity: 75 });
    expect(updateRes.body.data.quantity).toBe(75);

    const listRes = await request(app)
      .get(`/api/warehouses/${warehouseAId}/stock`)
      .set(authHeader(token));
    expect(listRes.body.count).toBe(1);
    expect(listRes.body.data[0].quantity).toBe(75);
  });

  test('rejects a negative quantity', async () => {
    const { token } = await registerCompany();
    const { warehouseAId, categoryId } = await setupWarehousesAndCategory(token);

    const res = await request(app)
      .put(`/api/warehouses/${warehouseAId}/stock/${categoryId}`)
      .set(authHeader(token))
      .send({ quantity: -5 });

    expect(res.status).toBe(400);
  });

  test('cross-tenant isolation applies to stock balances too', async () => {
    const { token: tokenA } = await registerCompany();
    const { token: tokenB } = await registerCompany();
    const { warehouseAId, categoryId } = await setupWarehousesAndCategory(tokenA);

    await request(app)
      .put(`/api/warehouses/${warehouseAId}/stock/${categoryId}`)
      .set(authHeader(tokenA))
      .send({ quantity: 999 });

    // Company B has no such warehouse/category ids at all -- both lookups 404.
    const res = await request(app)
      .get(`/api/warehouses/${warehouseAId}/stock`)
      .set(authHeader(tokenB));
    expect(res.status).toBe(404);
  });
});
