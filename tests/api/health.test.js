const request = require('supertest');
const createApp = require('../../src/app');

describe('API Health Check', () => {
  let app;

  beforeAll(() => {
    // Instantiate the Express app
    app = createApp();
  });

  it('should return 200 OK and correct JSON structure on GET /api/health', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('status', 'OK');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('environment');
  });

  it('should return 404 for an unknown endpoint', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
  });
});
