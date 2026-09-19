const { sequelize, Arg, User, Waypoint, WaypointEdge, Minigame, ArgVote, Flag } = require('../models');

exports.getAllArgs = async (req, res) => {
  try {
    const user_id = req.user ? req.user.user_id : 1;
    const args = await Arg.findAll({
      where: { status: 'published' },
      include: [
        { model: User, as: 'Creator', attributes: ['username', 'avatar'] },
        { model: ArgVote, attributes: ['vote'], where: { user_id }, required: false }
      ]
    });

    const mappedArgs = args.map(arg => {
      const argJSON = arg.toJSON();
      argJSON.user_vote = argJSON.ArgVotes && argJSON.ArgVotes.length > 0 ? argJSON.ArgVotes[0].vote : null;
      delete argJSON.ArgVotes;
      return argJSON;
    });

    res.json(mappedArgs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ARGs' });
  }
};

exports.getArgById = async (req, res) => {
  try {
    const user_id = req.user ? req.user.user_id : 1;
    const arg = await Arg.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['username', 'avatar'] },
        {
          model: Waypoint,
          attributes: ['waypoint_id', 'title', 'location', 'description'],
          include: [{ model: Minigame }]
        },
        { model: WaypointEdge },
        { model: ArgVote, attributes: ['vote'], where: { user_id }, required: false }
      ]
    });
    if (!arg) return res.status(404).json({ error: 'ARG not found' });

    const argJSON = arg.toJSON();
    argJSON.user_vote = argJSON.ArgVotes && argJSON.ArgVotes.length > 0 ? argJSON.ArgVotes[0].vote : null;
    delete argJSON.ArgVotes;

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
    'text_answer': 'text_answer' // Map QnA
  };
  return map[type] || 'gps_proximity';
};

const sanitizeStatus = (status) => {
  const valid = ['unpublished', 'published', 'retired'];
  return valid.includes(status) ? status : 'unpublished';
};

exports.createArg = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const creator_id = req.user ? req.user.user_id : (req.body.creator_id || 1);
    const { title, description, status, waypoints = [], edges = [] } = req.body;

    const newArg = await Arg.create({
      creator_id,
      title: title || 'Untitled WARG',
      description: description || '',
      status: sanitizeStatus(status)
    }, { transaction });

    const idMap = {};
    const minigameMap = {};
    const wpObjMap = {};
    for (const wp of waypoints) {
      const dbWp = await Waypoint.create({
        arg_id: newArg.arg_id,
        title: wp.title || 'Waypoint',
        description: wp.description || '',
        location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lat} ${wp.lng})`, 4326)
      }, { transaction });

      idMap[wp.id] = dbWp.waypoint_id;
      wpObjMap[wp.id] = { gameIds: [] };
      if (wp.games && Array.isArray(wp.games) && wp.games.length > 0) {
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
      } else {
        // Legacy fallback
        const mg = await Minigame.create({
          waypoint_id: dbWp.waypoint_id,
          game_type: mapFrontendTypeToGameType(wp.type)
        }, { transaction });
        minigameMap[wp.id] = mg.game_id;
      }
    }

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
        await WaypointEdge.create({
          arg_id: newArg.arg_id,
          from_waypoint_id: fromId,
          to_waypoint_id: toId,
          conditions_json
        }, { transaction });
      }
    }

    await transaction.commit();
    res.status(201).json({ ...newArg.toJSON(), idMap, minigameMap });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create ARG', detail: error.message });
  }
};

exports.updateArg = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const arg_id = req.params.id;
    const { title, description, status, waypoints = [], edges = [] } = req.body;

    const arg = await Arg.findByPk(arg_id);
    if (!arg) {
      await transaction.rollback();
      return res.status(404).json({ error: 'ARG not found' });
    }

    const creator_id = req.user ? req.user.user_id : (req.body.creator_id || 1);
    if (arg.creator_id !== creator_id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized' });
    }

    await arg.update({
      title: title || arg.title,
      description: description || arg.description,
      status: sanitizeStatus(status || arg.status)
    }, { transaction });

    // Delete missing waypoints
    const existingWps = await Waypoint.findAll({ where: { arg_id }, transaction });
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
          location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lat} ${wp.lng})`, 4326)
        }, { where: { waypoint_id: wp.waypoint_id }, transaction });

        idMap[wp.id] = wp.waypoint_id;
        wpObjMap[wp.id] = { gameIds: [] };

        // Update existing minigames instead of destroying all
        const existingMinigames = await Minigame.findAll({ where: { waypoint_id: wp.waypoint_id }, transaction });
        const existingMgIds = existingMinigames.map(m => m.game_id);
        const incomingMgIds = (wp.games || []).map(g => g.minigame_id).filter(id => id);
        const toDeleteMgIds = existingMgIds.filter(id => !incomingMgIds.includes(id));
        
        if (toDeleteMgIds.length > 0) {
          await Minigame.destroy({ where: { game_id: toDeleteMgIds }, transaction });
        }

        if (wp.games && Array.isArray(wp.games) && wp.games.length > 0) {
          for (let i = 0; i < wp.games.length; i++) {
            const game = wp.games[i];
            if (game.minigame_id) {
               const existing = await Minigame.findByPk(game.minigame_id, { transaction });
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
        } else {
          // Legacy fallback for older clients that don't send wp.games
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
          location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lat} ${wp.lng})`, 4326)
        }, { transaction });

        idMap[wp.id] = dbWp.waypoint_id;
        wpObjMap[wp.id] = { gameIds: [] };

        if (wp.games && Array.isArray(wp.games) && wp.games.length > 0) {
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
        } else {
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
        await WaypointEdge.create({
          arg_id: arg.arg_id,
          from_waypoint_id: fromId,
          to_waypoint_id: toId,
          conditions_json
        }, { transaction });
      }
    }

    await transaction.commit();
    res.json({ ...arg.toJSON(), idMap, minigameMap, wpObjMap });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to update ARG' });
  }
};

exports.voteArg = async (req, res) => {
  try {
    const { vote, user_id } = req.body;
    const arg_id = req.params.id;

    if (!user_id || !vote) {
      return res.status(400).json({ error: 'Missing user_id or vote' });
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

    const like_count = await ArgVote.count({ where: { arg_id, vote: 'like' } });
    const dislike_count = await ArgVote.count({ where: { arg_id, vote: 'dislike' } });

    await Arg.update({ like_count, dislike_count }, { where: { arg_id } });

    res.json({ success: true, action, like_count, dislike_count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to vote' });
  }
};

exports.flagArg = async (req, res) => {
  try {
    const { reporter_id, reason, description } = req.body;
    const arg_id = req.params.id;

    if (!reporter_id || !reason) {
      return res.status(400).json({ error: 'Missing reporter_id or reason' });
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
