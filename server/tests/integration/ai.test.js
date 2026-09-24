const request = require('supertest');
const createApp = require('../../src/app');
const { resetDatabase, closeDatabase } = require('../setup/dbHelpers');
const { createUser } = require('../setup/fixtures');

const app = createApp();

describe('AI Proxy API (/api/ai)', () => {
  let user, agent;

  beforeEach(async () => {
    await resetDatabase();
    // Create an authenticated user
    const created = await createUser({ email: 'ai-tester@example.com' });
    user = created.user;
    agent = request.agent(app);
    await agent.post('/auth/login').send({ email: user.email, password: created.password });

    // Mock global.fetch
    global.fetch = jest.fn();
  });

  afterAll(async () => {
    await closeDatabase();
    jest.restoreAllMocks();
  });

  describe('POST /api/ai/sam-extract', () => {
    it('should return 400 if required files are missing', async () => {
      const res = await agent.post('/api/ai/sam-extract');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Missing required files/i);
    });

    it('should forward the request to the AI engine and return the result', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mask_coverage: 0.85, mask_centroid: [100, 150] })
      });

      const res = await agent
        .post('/api/ai/sam-extract')
        .attach('image', Buffer.from('fake image data'), 'image.jpg')
        .attach('target_mask', Buffer.from('fake mask data'), 'mask.jpg');

      expect(res.status).toBe(200);
      expect(res.body.mask_coverage).toBe(0.85);
      
      // Verify fetch was called with the correct URL
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchArgs = global.fetch.mock.calls[0];
      expect(fetchArgs[0]).toContain('/api/v1/sam-extract');
    });
  });

  describe('POST /api/ai/hsv-match', () => {
    it('should return 400 if required files are missing', async () => {
      const res = await agent.post('/api/ai/hsv-match');
      expect(res.status).toBe(400);
    });

    it('should forward the request to the AI engine and return the result', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ color_distance: 12.5 })
      });

      const res = await agent
        .post('/api/ai/hsv-match')
        .attach('image', Buffer.from('fake image data'), 'image.jpg')
        .attach('reference_image', Buffer.from('fake ref data'), 'ref.jpg');

      expect(res.status).toBe(200);
      expect(res.body.color_distance).toBe(12.5);
      expect(global.fetch.mock.calls[0][0]).toContain('/api/v1/hsv-match');
    });
  });

  describe('POST /api/ai/texture-match', () => {
    it('should return 400 if required files are missing', async () => {
      const res = await agent.post('/api/ai/texture-match');
      expect(res.status).toBe(400);
    });

    it('should forward the request to the AI engine and return the result', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ texture_similarity: 0.92 })
      });

      const res = await agent
        .post('/api/ai/texture-match')
        .attach('image', Buffer.from('fake image data'), 'image.jpg')
        .attach('reference_image', Buffer.from('fake ref data'), 'ref.jpg');

      expect(res.status).toBe(200);
      expect(res.body.texture_similarity).toBe(0.92);
    });
  });

  describe('POST /api/ai/sift-match', () => {
    it('should return 400 if required files are missing', async () => {
      const res = await agent.post('/api/ai/sift-match');
      expect(res.status).toBe(400);
    });

    it('should forward the request to the AI engine and return the result', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ good_matches: 45 })
      });

      const res = await agent
        .post('/api/ai/sift-match')
        .attach('image', Buffer.from('fake image data'), 'image.jpg')
        .attach('archival_image', Buffer.from('fake archival data'), 'archive.jpg');

      expect(res.status).toBe(200);
      expect(res.body.good_matches).toBe(45);
    });
  });

  describe('POST /api/ai/symmetry', () => {
    it('should return 400 if required files are missing', async () => {
      const res = await agent.post('/api/ai/symmetry');
      expect(res.status).toBe(400);
    });

    it('should forward the request to the AI engine and return the result', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ symmetry_score: 0.88 })
      });

      const res = await agent
        .post('/api/ai/symmetry')
        .attach('image', Buffer.from('fake image data'), 'image.jpg');

      expect(res.status).toBe(200);
      expect(res.body.symmetry_score).toBe(0.88);
    });

    it('should handle AI engine errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const res = await agent
        .post('/api/ai/symmetry')
        .attach('image', Buffer.from('fake image data'), 'image.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to process/i);
    });
  });
});
