jest.mock('../../src/models', () => ({
  User: { findAll: jest.fn(), findByPk: jest.fn() },
  Arg: { findAll: jest.fn() },
  FriendRequest: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn(), destroy: jest.fn() },
  GameSession: {},
  Badge: {}
}));

const { User, FriendRequest } = require('../../src/models');
const userController = require('../../src/controllers/userController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('userController.getFriends (unit, mocked models)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when there are no accepted friend requests', async () => {
    FriendRequest.findAll.mockResolvedValue([]);
    const req = { params: { id: '5' } };
    const res = mockRes();

    await userController.getFriends(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
    expect(User.findAll).not.toHaveBeenCalled();
  });

  it('resolves the "other side" of each friend request regardless of sender/receiver direction', async () => {
    // user 5 sent a request to 9 (accepted), and user 7 sent one to 5 (accepted)
    FriendRequest.findAll.mockResolvedValue([
      { sender_id: 5, receiver_id: 9, status: 'accepted' },
      { sender_id: 7, receiver_id: 5, status: 'accepted' }
    ]);
    User.findAll.mockResolvedValue([{ user_id: 9 }, { user_id: 7 }]);

    const req = { params: { id: '5' } };
    const res = mockRes();

    await userController.getFriends(req, res);

    const whereArg = User.findAll.mock.calls[0][0].where;
    expect(whereArg.user_id.sort()).toEqual([7, 9]);
    expect(res.json).toHaveBeenCalledWith([{ user_id: 9 }, { user_id: 7 }]);
  });

  it('returns 500 when the database throws', async () => {
    FriendRequest.findAll.mockRejectedValue(new Error('boom'));
    const req = { params: { id: '5' } };
    const res = mockRes();

    await userController.getFriends(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('userController friend endpoints (ownership enforcement)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendFriendRequest', () => {
    it('rejects sending on behalf of another user', async () => {
      const req = { user: { user_id: 1 }, params: { id: '2' }, body: { receiverId: 9 } };
      const res = mockRes();

      await userController.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(FriendRequest.create).not.toHaveBeenCalled();
    });

    it('creates the request with the authenticated user as sender', async () => {
      FriendRequest.findOne.mockResolvedValue(null);
      FriendRequest.create.mockResolvedValue({ request_id: 1, sender_id: 1, receiver_id: 9 });
      const req = { user: { user_id: 1 }, params: { id: '1' }, body: { receiverId: 9 } };
      const res = mockRes();

      await userController.sendFriendRequest(req, res);

      expect(FriendRequest.create).toHaveBeenCalledWith({ sender_id: 1, receiver_id: 9, status: 'pending' });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('rejects a friend request to yourself', async () => {
      const req = { user: { user_id: 1 }, params: { id: '1' }, body: { receiverId: 1 } };
      const res = mockRes();

      await userController.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(FriendRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('getFriendRequests', () => {
    it('rejects viewing another user\'s friend requests', async () => {
      const req = { user: { user_id: 1 }, params: { id: '2' } };
      const res = mockRes();

      await userController.getFriendRequests(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(FriendRequest.findAll).not.toHaveBeenCalled();
    });

    it('returns pending requests with sender details', async () => {
      FriendRequest.findAll.mockResolvedValue([
        { request_id: 7, sender_id: 9, receiver_id: 1, status: 'pending', sent_at: 'x' }
      ]);
      User.findAll.mockResolvedValue([{ user_id: 9, username: 'nine' }]);
      const req = { user: { user_id: 1 }, params: { id: '1' } };
      const res = mockRes();

      await userController.getFriendRequests(req, res);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ request_id: 7, sender: { user_id: 9, username: 'nine' } })
      ]);
    });
  });

  describe('respondToFriendRequest', () => {
    it('rejects an invalid status', async () => {
      const req = { user: { user_id: 1 }, params: { requestId: '7' }, body: { status: 'maybe' } };
      const res = mockRes();

      await userController.respondToFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('only allows the recipient to respond', async () => {
      FriendRequest.findByPk.mockResolvedValue({ request_id: 7, receiver_id: 42, save: jest.fn() });
      const req = { user: { user_id: 1 }, params: { requestId: '7' }, body: { status: 'accepted' } };
      const res = mockRes();

      await userController.respondToFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('accepts when the authenticated user is the recipient', async () => {
      const saved = { request_id: 7, receiver_id: 1, save: jest.fn() };
      FriendRequest.findByPk.mockResolvedValue(saved);
      const req = { user: { user_id: 1 }, params: { requestId: '7' }, body: { status: 'accepted' } };
      const res = mockRes();

      await userController.respondToFriendRequest(req, res);

      expect(saved.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(saved);
    });
  });

  describe('removeFriend', () => {
    it('rejects removing friends on behalf of another user', async () => {
      const req = { user: { user_id: 1 }, params: { id: '2', friendId: '9' } };
      const res = mockRes();

      await userController.removeFriend(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(FriendRequest.destroy).not.toHaveBeenCalled();
    });

    it('destroys the accepted connection between the two users', async () => {
      FriendRequest.destroy.mockResolvedValue(1);
      const req = { user: { user_id: 1 }, params: { id: '1', friendId: '9' } };
      const res = mockRes();

      await userController.removeFriend(req, res);

      expect(FriendRequest.destroy).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: 'accepted' })
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
