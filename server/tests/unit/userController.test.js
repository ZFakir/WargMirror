jest.mock('../../src/models', () => ({
  User: { findAll: jest.fn(), findByPk: jest.fn() },
  Arg: { findAll: jest.fn() },
  FriendRequest: { findAll: jest.fn() },
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
