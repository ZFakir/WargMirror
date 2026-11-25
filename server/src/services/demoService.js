const { PlatformSetting, Arg, User } = require('../models');

const DEMO_SETTING_KEY = 'demo_arg_id';

/**
 * Retrieve the configured demo ARG ID from platform settings, or null if unset.
 */
async function getDemoArgId() {
  if (!PlatformSetting || typeof PlatformSetting.findByPk !== 'function') {
    return null;
  }
  const row = await PlatformSetting.findByPk(DEMO_SETTING_KEY);
  if (!row || !row.setting_value) return null;
  const parsed = parseInt(row.setting_value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Retrieve the active demo ARG (excluding retired games), or null if none is set.
 */
async function getDemoArg() {
  const argId = await getDemoArgId();
  if (!argId) return null;
  if (!Arg || typeof Arg.findByPk !== 'function') return null;

  const arg = await Arg.findByPk(argId, {
    include: [{ model: User, as: 'Creator', attributes: ['username', 'avatar'] }]
  });
  if (!arg || arg.status === 'retired') {
    return null;
  }
  return arg;
}

/**
 * Check whether the given argId matches the currently active demo ARG.
 */
async function isDemoArg(argId) {
  const numericId = parseInt(argId, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) return false;
  const demo = await getDemoArg();
  return Boolean(demo && Number(demo.arg_id) === numericId);
}

/**
 * Admin action: set (or clear when null/empty) the platform demo ARG.
 */
async function setDemoArgId(argId) {
  if (argId === null || argId === undefined || argId === '') {
    await PlatformSetting.destroy({ where: { setting_key: DEMO_SETTING_KEY } });
    return { demo_arg_id: null, game: null };
  }

  const numericId = parseInt(argId, 10);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    const err = new Error('Invalid game ID');
    err.status = 400;
    throw err;
  }

  const arg = await Arg.findByPk(numericId, {
    include: [{ model: User, as: 'Creator', attributes: ['username', 'avatar'] }]
  });
  if (!arg) {
    const err = new Error('Game not found');
    err.status = 404;
    throw err;
  }
  if (arg.status === 'retired') {
    const err = new Error('Retired games cannot be set as the demo game');
    err.status = 400;
    throw err;
  }

  await PlatformSetting.upsert({
    setting_key: DEMO_SETTING_KEY,
    setting_value: String(arg.arg_id)
  });

  return { demo_arg_id: arg.arg_id, game: arg };
}

/**
 * Read guest demo session state for an ARG from express-session.
 */
function getDemoSession(req, argId) {
  if (!req || !req.session || !req.session.demoSessions) return null;
  return req.session.demoSessions[String(argId)] || null;
}

/**
 * Write guest demo session state for an ARG into express-session.
 */
function setDemoSession(req, argId, data) {
  if (!req) return;
  if (!req.session) req.session = {};
  if (!req.session.demoSessions) req.session.demoSessions = {};
  req.session.demoSessions[String(argId)] = data;
}

/**
 * Persist express-session changes cleanly when a backing store is active.
 */
function saveReqSession(req) {
  return new Promise((resolve, reject) => {
    if (!req || !req.session || typeof req.session.save !== 'function') {
      return resolve();
    }
    req.session.save((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Synchronous condition evaluator for guest demo sessions, mirroring gameController.evaluateConditions.
 */
function evaluateDemoConditions(demoData, rawConditions) {
  let conditions = rawConditions;
  if (typeof conditions === 'string') {
    try { conditions = JSON.parse(conditions); } catch { /* ignore parse error */ }
  }

  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true;
  }

  const groupedConditions = {};
  for (const cond of conditions) {
    if (!groupedConditions[cond.game_id]) {
      groupedConditions[cond.game_id] = [];
    }
    groupedConditions[cond.game_id].push(cond.outcome);
  }

  const attempts = (demoData && demoData.attempts) || {};
  for (const [gameId, allowedOutcomes] of Object.entries(groupedConditions)) {
    const attempt = attempts[gameId] || attempts[String(gameId)] || attempts[Number(gameId)];
    if (!attempt || !allowedOutcomes.includes(attempt.outcome)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  DEMO_SETTING_KEY,
  getDemoArgId,
  getDemoArg,
  isDemoArg,
  setDemoArgId,
  getDemoSession,
  setDemoSession,
  saveReqSession,
  evaluateDemoConditions
};
