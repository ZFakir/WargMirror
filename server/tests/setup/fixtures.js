const bcrypt = require('bcryptjs');
const { User, Arg } = require('../../src/models');

let counter = 0;
function unique(prefix) {
  counter += 1;
  return `${prefix}${Date.now()}_${counter}`;
}

async function createUser(overrides = {}) {
  const username = overrides.username || unique('user_');
  const password = overrides.password || 'Password123!';
  const password_hash = await bcrypt.hash(password, 4); // low cost factor: tests only

  const user = await User.create({
    username,
    email: overrides.email || `${username}@example.com`,
    password_hash,
    auth_provider: 'local',
    role: overrides.role || 'player'
  });

  // Return the plaintext password alongside the created row since tests
  // often need it immediately afterwards to log in.
  return { user, password };
}

async function createArg(creator, overrides = {}) {
  return Arg.create({
    creator_id: creator.user_id,
    title: overrides.title || unique('Arg '),
    description: overrides.description || 'A test ARG',
    status: overrides.status || 'published'
  });
}

module.exports = { createUser, createArg, unique };
