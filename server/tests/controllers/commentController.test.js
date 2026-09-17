const { getCommentsForArg, postComment } = require('../../src/controllers/commentController');
const { Comment, User } = require('../../src/models');

jest.mock('../../src/models', () => ({
  Comment: { findAll: jest.fn(), create: jest.fn() },
  User: {}
}));

describe('commentController', () => {
  let req, res;
  beforeEach(() => {
    jest.clearAllMocks();
    req = { 
      params: {}, 
      body: {}, 
      user: { user_id: 1 },
      isAuthenticated: jest.fn().mockReturnValue(true)
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getCommentsForArg', () => {
    it('should get comments for arg', async () => {
      req.params.argId = 1;
      Comment.findAll.mockResolvedValue([{ body: 'Test comment' }]);
      await getCommentsForArg(req, res);
      expect(Comment.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { arg_id: 1 } }));
      expect(res.json).toHaveBeenCalledWith([{ body: 'Test comment' }]);
    });

    it('should handle errors', async () => {
      req.params.argId = 1;
      Comment.findAll.mockRejectedValue(new Error('DB Error'));
      await getCommentsForArg(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('postComment', () => {
    it('should post a comment successfully', async () => {
      req.params.argId = 1;
      req.body = { body: 'New comment' };
      Comment.create.mockResolvedValue({ body: 'New comment', arg_id: 1 });

      await postComment(req, res);
      expect(Comment.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ body: 'New comment', arg_id: 1 });
    });

    it('should return 401 if not authenticated', async () => {
      req.isAuthenticated.mockReturnValue(false);
      await postComment(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 if body is empty', async () => {
      req.body = { body: '   ' };
      await postComment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors', async () => {
      req.params.argId = 1;
      req.body = { body: 'New comment' };
      Comment.create.mockRejectedValue(new Error('DB Error'));

      await postComment(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
