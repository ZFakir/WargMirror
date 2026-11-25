const crypto = require('crypto');
const { literal } = require('sequelize');
const { sequelize, Arg, User, Waypoint, WaypointEdge, Minigame, MinigameAttempt, GameSession, ArgVote, Flag } = require('../models');
const badgeService = require('../services/badgeService');
const {
  publicArgsCache,
  argDetailCache,
  coverImageCache,
  invalidateArgs,
  invalidateArg,
  invalidateCoverImage,
  invalidateBadgeCooldown
} = require('../utils/cache');
const { stripHeavyMinigameFields } = require('../utils/sanitize');

const COVER_EXISTS_ATTR = [literal('`Arg`.`cover_image` IS NOT NULL'), 'cover_image'];

function detectImageMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

exports.getAllArgs = async (req, res) => {
  try {
    // Guests see no vote state — never fall back to another user's votes.
    const user_id = req.user ? req.user.user_id : null;

    let mappedArgs;
    if (process.env.NODE_ENV === 'test') {
      const args = await Arg.findAll({
        where: { status: 'published' },
        attributes: { exclude: ['cover_image'], include: [COVER_EXISTS_ATTR] },
        include: [
          { model: User, as: 'Creator', attributes: ['username'] },
          { model: ArgVote, attributes: ['vote'], where: { user_id }, required: false }
        ]
      });

      mappedArgs = args.map(arg => {
        const argJSON = arg.toJSON();
        argJSON.user_vote = argJSON.ArgVotes && argJSON.ArgVotes.length > 0 ? argJSON.ArgVotes[0].vote : null;
        delete argJSON.ArgVotes;
        return argJSON;
      });
    } else {
      const [baseArgs, userVotes] = await Promise.all([
        publicArgsCache.getOrSet('published', 30 * 1000, async () => {
          const args = await Arg.findAll({
            where: { status: 'published' },
            attributes: { exclude: ['cover_image'], include: [COVER_EXISTS_ATTR] },
            include: [{ model: User, as: 'Creator', attributes: ['username'] }]
          });
          return args.map(arg => arg.toJSON());
        }),
        user_id
          ? ArgVote.findAll({ where: { user_id }, attributes: ['arg_id', 'vote'], raw: true })
          : Promise.resolve([])
      ]);

      const voteMap = new Map(userVotes.map(v => [v.arg_id, v.vote]));
      mappedArgs = baseArgs.map(arg => ({
        ...arg,
        user_vote: user_id ? (voteMap.get(arg.arg_id) || null) : null
      }));
    }

    if (typeof res.set === 'function') {
      res.set('Cache-Control', user_id
        ? 'private, max-age=15, stale-while-revalidate=60'
        : 'public, max-age=30, stale-while-revalidate=120');
    }

    res.json(mappedArgs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ARGs' });
  }
};

exports.getArgById = async (req, res) => {
  try {
    // Guests see no vote state — never fall back to another user's votes.
    const user_id = req.user ? req.user.user_id : null;
    const argId = req.params.id;

    let argJSON;
    if (process.env.NODE_ENV === 'test') {
      const arg = await Arg.findByPk(argId, {
        attributes: { exclude: ['cover_image'], include: [COVER_EXISTS_ATTR] },
        include: [
          { model: User, as: 'Creator', attributes: ['username'] },
          {
            model: Waypoint,
            attributes: ['waypoint_id', 'title', 'location', 'description', 'validation_radius_m'],
            include: [{ model: Minigame }]
          },
          { model: WaypointEdge },
          { model: ArgVote, attributes: ['vote'], where: { user_id }, required: false }
        ]
      });
      if (!arg) return res.status(404).json({ error: 'ARG not found' });

      argJSON = stripHeavyMinigameFields(arg.toJSON());
      argJSON.user_vote = argJSON.ArgVotes && argJSON.ArgVotes.length > 0 ? argJSON.ArgVotes[0].vote : null;
      delete argJSON.ArgVotes;
    } else {
      const [baseArg, userVoteRow] = await Promise.all([
        argDetailCache.getOrSet(String(argId), 30 * 1000, async () => {
          const arg = await Arg.findByPk(argId, {
            attributes: { exclude: ['cover_image'], include: [COVER_EXISTS_ATTR] },
            include: [
              { model: User, as: 'Creator', attributes: ['username'] },
              {
                model: Waypoint,
                attributes: ['waypoint_id', 'title', 'location', 'description', 'validation_radius_m'],
                include: [{ model: Minigame }]
              },
              { model: WaypointEdge }
            ]
          });
          if (!arg) return null;
          return stripHeavyMinigameFields(arg.toJSON());
        }),
        user_id
          ? ArgVote.findOne({ where: { arg_id: argId, user_id }, attributes: ['vote'], raw: true })
          : Promise.resolve(null)
      ]);

      if (!baseArg) return res.status(404).json({ error: 'ARG not found' });
      argJSON = {
        ...baseArg,
        user_vote: userVoteRow ? userVoteRow.vote : null
      };
    }

    if (typeof res.set === 'function') {
      res.set('Cache-Control', user_id
        ? 'private, max-age=15, stale-while-revalidate=60'
        : 'public, max-age=30, stale-while-revalidate=120');
    }

    res.json(argJSON);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ARG' });
  }
};

const mapFrontendTypeToGameType = (type) => {
  const map = {
    'gps': 'gps_proximity',
    'ar': 'ar_object_scan',
    'barcode': 'qr_barcode',
    'shape_match': 'shape_match',
    'colour_match': 'colour_match',
    'texture_match': 'texture_match',
    'sift_match': 'sift_match',
    'symmetry_finder': 'symmetry_finder',
    'photo_submit': 'photo_submit',
    'text_answer': 'text_answer', // Map QnA
    'plaque_scan': 'plaque_scan',
    'point_domination': 'point_domination'
  };
  return map[type] || 'gps_proximity';
};

const sanitizeStatus = (status) => {
  const valid = ['unpublished', 'published', 'retired'];
  return valid.includes(status) ? status : 'unpublished';
};

const sanitizeMode = (mode) => {
  const valid = ['solo', 'coop', 'pvp', 'live'];
  return valid.includes(mode) ? mode : 'solo';
};

exports.createArg = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // req.user is guaranteed by requireAuth on this route — never trust a
    // client-supplied creator_id.
    const creator_id = req.user.user_id;
    const { title, description, status, mode, waypoints = [], edges = [] } = req.body;

    const newArg = await Arg.create({
      creator_id,
      title: title || 'Untitled WARG',
      description: description || '',
      status: sanitizeStatus(status),
      mode: sanitizeMode(mode)
    }, { transaction });

    const idMap = {};
    const minigameMap = {};
    const wpObjMap = {};
    for (const wp of waypoints) {
      const dbWp = await Waypoint.create({
        arg_id: newArg.arg_id,
        title: wp.title || 'Waypoint',
        description: wp.description || '',
        validation_radius_m: wp.validation_radius_m || 30,
        location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lat} ${wp.lng})`, 4326)
      }, { transaction });

      idMap[wp.id] = dbWp.waypoint_id;
      wpObjMap[wp.id] = { gameIds: [] };
      if (wp.games !== undefined) {
        if (Array.isArray(wp.games)) {
          for (let i = 0; i < wp.games.length; i++) {
            const game = wp.games[i];
            const minigame = await Minigame.create({
              waypoint_id: dbWp.waypoint_id,
              game_type: mapFrontendTypeToGameType(game.type),
              config_json: game.minigame_config || null
            }, { transaction });
            wpObjMap[wp.id].gameIds[i] = minigame.game_id;
            if (i === 0) minigameMap[wp.id] = minigame.game_id;
          }
        }
      } else if (wp.type) {
        // Legacy fallback
        const mg = await Minigame.create({
          waypoint_id: dbWp.waypoint_id,
          game_type: mapFrontendTypeToGameType(wp.type)
        }, { transaction });
        minigameMap[wp.id] = mg.game_id;
      }
    }

    const edgePromises = [];
    for (const edge of edges) {
      const fromId = idMap[edge.from];
      const toId = idMap[edge.to];
      if (fromId && toId) {
        let conditions_json = null;
        if (edge.triggers && edge.triggers.length > 0) {
          const fromWp = wpObjMap[edge.from];
          if (fromWp) {
            conditions_json = edge.triggers.map(t => ({
              game_id: fromWp.gameIds[t.game_index],
              outcome: t.outcome
            })).filter(c => c.game_id);
          }
        }
        edgePromises.push(WaypointEdge.create({
          arg_id: newArg.arg_id,
          from_waypoint_id: fromId,
          to_waypoint_id: toId,
          conditions_json
        }, { transaction }));
      }
    }
    if (edgePromises.length > 0) {
      await Promise.all(edgePromises);
    }

    await transaction.commit();
    invalidateArgs();
    invalidateBadgeCooldown(creator_id);
    badgeService.evaluateAndAwardBadges(creator_id).catch(() => {});
    res.status(201).json({ ...newArg.toJSON(), idMap, minigameMap, wpObjMap });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create ARG' });
  }
};

exports.updateArg = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const arg_id = req.params.id;
    const { title, description, status, mode, waypoints = [], edges = [] } = req.body;

    const arg = await Arg.findByPk(arg_id, { attributes: { exclude: ['cover_image'] } });
    if (!arg) {
      await transaction.rollback();
      return res.status(404).json({ error: 'ARG not found' });
    }

    const creator_id = req.user.user_id;
    if (arg.creator_id !== creator_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized' });
    }

    await arg.update({
      title: title || arg.title,
      description: description || arg.description,
      status: sanitizeStatus(status || arg.status),
      mode: mode !== undefined ? sanitizeMode(mode) : arg.mode
    }, { transaction });

    // Delete missing waypoints
    const existingWps = await Waypoint.findAll({ where: { arg_id }, attributes: ['waypoint_id'], transaction });
    const existingIds = existingWps.map(w => w.waypoint_id);
    const incomingDbIds = waypoints.map(w => w.waypoint_id).filter(id => id);
    const toDeleteIds = existingIds.filter(id => !incomingDbIds.includes(id));

    if (toDeleteIds.length > 0) {
      await Waypoint.destroy({ where: { waypoint_id: toDeleteIds }, transaction });
    }

    const idMap = {};
    const minigameMap = {};
    const wpObjMap = {};
    for (const wp of waypoints) {
      if (wp.waypoint_id) {
        // Update existing
        await Waypoint.update({
          title: wp.title || 'Waypoint',
          description: wp.description || '',
          validation_radius_m: wp.validation_radius_m || 30,
          location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lat} ${wp.lng})`, 4326)
        }, { where: { waypoint_id: wp.waypoint_id }, transaction });

        idMap[wp.id] = wp.waypoint_id;
        wpObjMap[wp.id] = { gameIds: [] };

        // Update existing minigames instead of destroying all
        const existingMinigames = await Minigame.findAll({ where: { waypoint_id: wp.waypoint_id }, transaction });
        const existingMgById = new Map(existingMinigames.map(m => [m.game_id, m]));
        const existingMgIds = existingMinigames.map(m => m.game_id);
        const incomingMgIds = (wp.games || []).map(g => g.minigame_id).filter(id => id);
        const toDeleteMgIds = existingMgIds.filter(id => !incomingMgIds.includes(id));

        if (toDeleteMgIds.length > 0) {
          await Minigame.destroy({ where: { game_id: toDeleteMgIds }, transaction });
        }

        if (wp.games !== undefined) {
          if (Array.isArray(wp.games)) {
            for (let i = 0; i < wp.games.length; i++) {
              const game = wp.games[i];
              if (game.minigame_id) {
                const existing = existingMgById.get(game.minigame_id) || await Minigame.findByPk(game.minigame_id, { transaction });
                if (existing) {
                  let updatedConfig = existing.config_json || {};
                  if (game.minigame_config) {
                    updatedConfig = { ...updatedConfig, ...game.minigame_config };
                  }
                  await existing.update({
                    game_type: mapFrontendTypeToGameType(game.type),
                    config_json: updatedConfig
                  }, { transaction });
                  wpObjMap[wp.id].gameIds[i] = existing.game_id;
                  if (i === 0) minigameMap[wp.id] = existing.game_id;
                  continue;
                }
              }

              const minigame = await Minigame.create({
                waypoint_id: wp.waypoint_id,
                game_type: mapFrontendTypeToGameType(game.type),
                config_json: game.minigame_config || null
              }, { transaction });
              wpObjMap[wp.id].gameIds[i] = minigame.game_id;
              if (i === 0) minigameMap[wp.id] = minigame.game_id;
            }
          }
        } else if (wp.type) {
          // Legacy fallback for older clients that don't send wp.games but send wp.type
          const mg = await Minigame.create({
            waypoint_id: wp.waypoint_id,
            game_type: mapFrontendTypeToGameType(wp.type)
          }, { transaction });
          minigameMap[wp.id] = mg.game_id;
        }
      } else {
        // Create new
        const dbWp = await Waypoint.create({
          arg_id: arg.arg_id,
          title: wp.title || 'Waypoint',
          description: wp.description || '',
          validation_radius_m: wp.validation_radius_m || 30,
          location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lat} ${wp.lng})`, 4326)
        }, { transaction });

        idMap[wp.id] = dbWp.waypoint_id;
        wpObjMap[wp.id] = { gameIds: [] };

        if (wp.games !== undefined) {
          if (Array.isArray(wp.games)) {
            for (let i = 0; i < wp.games.length; i++) {
              const game = wp.games[i];
              const minigame = await Minigame.create({
                waypoint_id: dbWp.waypoint_id,
                game_type: mapFrontendTypeToGameType(game.type),
                config_json: game.minigame_config || null
              }, { transaction });
              wpObjMap[wp.id].gameIds[i] = minigame.game_id;
              if (i === 0) minigameMap[wp.id] = minigame.game_id;
            }
          }
        } else if (wp.type) {
          // Legacy fallback
          const mg = await Minigame.create({
            waypoint_id: dbWp.waypoint_id,
            game_type: mapFrontendTypeToGameType(wp.type)
          }, { transaction });
          minigameMap[wp.id] = mg.game_id;
        }
      }
    }

    // Replace edges
    await WaypointEdge.destroy({ where: { arg_id }, transaction });

    const edgePromises = [];
    for (const edge of edges) {
      const fromId = idMap[edge.from] || edge.from_waypoint_id;
      const toId = idMap[edge.to] || edge.to_waypoint_id;

      if (fromId && toId) {
        let conditions_json = null;
        if (edge.triggers && edge.triggers.length > 0) {
          const fromWp = wpObjMap[edge.from] || wpObjMap[edge.from_waypoint_id];
          if (fromWp) {
            conditions_json = edge.triggers.map(t => ({
              game_id: fromWp.gameIds[t.game_index],
              outcome: t.outcome
            })).filter(c => c.game_id);
          }
        }
        edgePromises.push(WaypointEdge.create({
          arg_id: arg.arg_id,
          from_waypoint_id: fromId,
          to_waypoint_id: toId,
          conditions_json
        }, { transaction }));
      }
    }
    if (edgePromises.length > 0) {
      await Promise.all(edgePromises);
    }

    await transaction.commit();
    invalidateArgs();
    invalidateArg(arg_id);
    res.json({ ...arg.toJSON(), idMap, minigameMap, wpObjMap });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to update ARG' });
  }
};

exports.voteArg = async (req, res) => {
  try {
    const { vote } = req.body;
    const arg_id = req.params.id;
    // The route is behind requireAuth — the vote always belongs to the
    // session user, never a client-supplied user_id.
    const user_id = req.user.user_id;

    if (!vote) {
      return res.status(400).json({ error: 'Missing vote' });
    }
    if (vote !== 'like' && vote !== 'dislike') {
      return res.status(400).json({ error: 'Invalid vote — must be "like" or "dislike"' });
    }

    const existingVote = await ArgVote.findOne({ where: { arg_id, user_id } });

    let action = 'voted';
    if (existingVote) {
      if (existingVote.vote === vote) {
        await existingVote.destroy();
        action = 'unvoted';
      } else {
        existingVote.vote = vote;
        await existingVote.save();
      }
    } else {
      await ArgVote.create({ arg_id, user_id, vote });
    }

    const [like_count, dislike_count] = await Promise.all([
      ArgVote.count({ where: { arg_id, vote: 'like' } }),
      ArgVote.count({ where: { arg_id, vote: 'dislike' } })
    ]);

    await Arg.update({ like_count, dislike_count }, { where: { arg_id } });
    invalidateArgs();
    invalidateArg(arg_id);

    res.json({ success: true, action, like_count, dislike_count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote' });
  }
};

exports.flagArg = async (req, res) => {
  try {
    // The reporter is always the authenticated session user — never the body.
    const reporter_id = req.user.user_id;
    const { reason, description } = req.body;
    const arg_id = req.params.id;

    if (!reason) {
      return res.status(400).json({ error: 'Missing reason' });
    }

    const flag = await Flag.create({
      arg_id,
      reporter_id,
      reason,
      description
    });

    res.status(201).json(flag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to flag ARG' });
  }
};

exports.updateArgStatus = async (req, res) => {
  try {
    const arg_id = req.params.id;
    const { status } = req.body;

    const arg = await Arg.findByPk(arg_id, { attributes: { exclude: ['cover_image'] } });
    if (!arg) {
      return res.status(404).json({ error: 'ARG not found' });
    }

    const creator_id = req.user.user_id;
    if (arg.creator_id !== creator_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await arg.update({
      status: sanitizeStatus(status)
    });

    invalidateArgs();
    invalidateArg(arg_id);

    res.json(arg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update ARG status' });
  }
};

exports.uploadCoverImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const arg = await Arg.findByPk(id, { attributes: { exclude: ['cover_image'] } });
    if (!arg) return res.status(404).json({ error: 'Arg not found' });

    const creator_id = req.user.user_id;
    if (arg.creator_id !== creator_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    arg.cover_image = req.file.buffer;
    await arg.save();

    invalidateArgs();
    invalidateArg(id);
    invalidateCoverImage(id);

    res.json({ message: 'Cover image uploaded successfully' });
  } catch (err) {
    console.error('Error in uploadCoverImage:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCoverImage = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await coverImageCache.getOrSet(String(id), 10 * 60 * 1000, async () => {
      const arg = await Arg.findByPk(id, { attributes: ['arg_id', 'cover_image'] });
      if (!arg || !arg.cover_image) return null;
      const buffer = Buffer.isBuffer(arg.cover_image) ? arg.cover_image : Buffer.from(arg.cover_image);
      const etag = `"${crypto.createHash('sha1').update(buffer).digest('hex')}"`;
      return { buffer, contentType: detectImageMime(buffer), etag };
    });

    if (!entry) {
      return res.status(404).json({ error: 'Cover image not found' });
    }

    if (typeof res.set === 'function') {
      res.set('Content-Type', entry.contentType);
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.set('ETag', entry.etag);
    }

    if (req.headers && req.headers['if-none-match'] === entry.etag && typeof res.end === 'function') {
      return res.status(304).end();
    }

    res.send(entry.buffer);
  } catch (err) {
    console.error('Error in getCoverImage:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Analytics for the creator's own WARGs: play counts, completion, votes,
// per-waypoint attempt stats and recent flags. Powers the Analytics page.
exports.getCreatorAnalytics = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const args = await Arg.findAll({
      where: { creator_id: user_id },
      attributes: ['arg_id', 'title', 'description', 'status', 'mode', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    if (args.length === 0) {
      return res.json({ args: [] });
    }

    const argIds = args.map(a => a.arg_id);

    const [sessions, votes, flags, waypoints] = await Promise.all([
      GameSession.findAll({ where: { arg_id: argIds }, attributes: ['arg_id', 'status'] }),
      ArgVote.findAll({ where: { arg_id: argIds }, attributes: ['arg_id', 'vote'] }),
      Flag.findAll({
        where: { arg_id: argIds },
        include: [{ model: User, as: 'Reporter', attributes: ['username'] }],
        order: [['created_at', 'DESC']],
        limit: 20
      }),
      Waypoint.findAll({
        where: { arg_id: argIds },
        attributes: ['waypoint_id', 'arg_id', 'title'],
        include: [{ model: Minigame, attributes: ['game_id'] }]
      })
    ]);

    const gameIds = [];
    waypoints.forEach(wp => (wp.Minigames || []).forEach(mg => gameIds.push(mg.game_id)));
    const attempts = gameIds.length > 0
      ? await MinigameAttempt.findAll({ where: { game_id: gameIds }, attributes: ['game_id', 'outcome'] })
      : [];

    const attemptStatsByGame = {};
    attempts.forEach(a => {
      const s = attemptStatsByGame[a.game_id] || (attemptStatsByGame[a.game_id] = { passes: 0, fails: 0 });
      if (a.outcome === 'pass') s.passes++; else s.fails++;
    });

    const sessionsByArg = new Map();
    for (const s of sessions) {
      const counts = sessionsByArg.get(s.arg_id) || { active: 0, completed: 0, abandoned: 0 };
      if (s.status === 'active') counts.active++;
      else if (s.status === 'completed') counts.completed++;
      else if (s.status === 'abandoned') counts.abandoned++;
      sessionsByArg.set(s.arg_id, counts);
    }

    const votesByArg = new Map();
    for (const v of votes) {
      const counts = votesByArg.get(v.arg_id) || { likes: 0, dislikes: 0 };
      if (v.vote === 'like') counts.likes++;
      else if (v.vote === 'dislike') counts.dislikes++;
      votesByArg.set(v.arg_id, counts);
    }

    const waypointsByArg = new Map();
    for (const wp of waypoints) {
      const list = waypointsByArg.get(wp.arg_id) || [];
      list.push(wp);
      waypointsByArg.set(wp.arg_id, list);
    }

    const flagsByArg = new Map();
    for (const f of flags) {
      const list = flagsByArg.get(f.arg_id) || [];
      list.push(f);
      flagsByArg.set(f.arg_id, list);
    }

    if (typeof res.set === 'function') {
      res.set('Cache-Control', 'private, max-age=15');
    }

    res.json({
      args: args.map(arg => {
        const sCounts = sessionsByArg.get(arg.arg_id) || { active: 0, completed: 0, abandoned: 0 };
        const vCounts = votesByArg.get(arg.arg_id) || { likes: 0, dislikes: 0 };
        const argWaypoints = waypointsByArg.get(arg.arg_id) || [];
        const argFlags = flagsByArg.get(arg.arg_id) || [];
        return {
          arg_id: arg.arg_id,
          title: arg.title,
          description: arg.description,
          status: arg.status,
          mode: arg.mode,
          created_at: arg.created_at,
          active_sessions: sCounts.active,
          completed_sessions: sCounts.completed,
          abandoned_sessions: sCounts.abandoned,
          likes: vCounts.likes,
          dislikes: vCounts.dislikes,
          waypoints: argWaypoints.map(wp => {
            const stats = { passes: 0, fails: 0 };
            (wp.Minigames || []).forEach(mg => {
              const s = attemptStatsByGame[mg.game_id];
              if (s) { stats.passes += s.passes; stats.fails += s.fails; }
            });
            return { waypoint_id: wp.waypoint_id, title: wp.title, ...stats };
          }),
          flags: argFlags.map(f => ({
            flag_id: f.flag_id,
            reason: f.reason,
            description: f.description,
            status: f.status,
            created_at: f.created_at,
            reporter: f.Reporter ? f.Reporter.username : null
          }))
        };
      })
    });
  } catch (error) {
    console.error('Error fetching creator analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Creators can resolve flags raised against their own WARGs.
exports.resolveOwnFlag = async (req, res) => {
  try {
    const { id, flagId } = req.params;
    const arg = await Arg.findByPk(id, { attributes: ['arg_id', 'creator_id'] });
    if (!arg) return res.status(404).json({ error: 'ARG not found' });
    if (arg.creator_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const flag = await Flag.findByPk(flagId);
    if (!flag || flag.arg_id !== arg.arg_id) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    flag.status = 'resolved';
    flag.resolved_by = req.user.user_id;
    flag.resolved_at = new Date();
    await flag.save();

    res.json({ message: 'Flag resolved successfully', flag });
  } catch (error) {
    console.error('Error resolving flag:', error);
    res.status(500).json({ error: 'Failed to resolve flag' });
  }
};

// Creators can permanently delete their own WARGs.
// The database's ON DELETE CASCADE constraints remove dependent rows.
exports.deleteArg = async (req, res) => {
  try {
    const arg = await Arg.findByPk(req.params.id, { attributes: ['arg_id', 'creator_id'] });
    if (!arg) return res.status(404).json({ error: 'ARG not found' });
    if (arg.creator_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await arg.destroy();
    invalidateArgs();
    invalidateArg(req.params.id);
    invalidateCoverImage(req.params.id);
    res.json({ message: 'ARG deleted successfully' });
  } catch (error) {
    console.error('Error deleting ARG:', error);
    res.status(500).json({ error: 'Failed to delete ARG' });
  }
};
