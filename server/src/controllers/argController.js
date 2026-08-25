const { sequelize, Arg, User, Waypoint, WaypointEdge, Minigame, ArgVote, Flag } = require('../models');

exports.getAllArgs = async (req, res) => {
  try {
    const args = await Arg.findAll({
      where: { status: 'published' },
      include: [{ model: User, as: 'Creator', attributes: ['username', 'avatar'] }]
    });
    res.json(args);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ARGs' });
  }
};

exports.getArgById = async (req, res) => {
  try {
    const arg = await Arg.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Creator', attributes: ['username', 'avatar'] },
        { 
          model: Waypoint, 
          attributes: ['waypoint_id', 'title', 'location', 'description'],
          include: [{ model: Minigame }]
        },
        { model: WaypointEdge }
      ]
    });
    if (!arg) return res.status(404).json({ error: 'ARG not found' });
    res.json(arg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ARG' });
  }
};

const mapFrontendTypeToGameType = (type) => {
  const map = {
    'gps': 'gps_proximity',
    'ar': 'ar_object_scan',
    'barcode': 'qr_barcode'
  };
  return map[type] || 'gps_proximity';
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
      status: status || 'unpublished' 
    }, { transaction });

    const idMap = {};
    for (const wp of waypoints) {
      const dbWp = await Waypoint.create({
        arg_id: newArg.arg_id,
        title: wp.title || 'Waypoint',
        description: wp.description || '',
        location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lng} ${wp.lat})`, 4326)
      }, { transaction });
      
      idMap[wp.id] = dbWp.waypoint_id;

      await Minigame.create({
        waypoint_id: dbWp.waypoint_id,
        game_type: mapFrontendTypeToGameType(wp.type)
      }, { transaction });
    }

    for (const edge of edges) {
      const fromId = idMap[edge.from];
      const toId = idMap[edge.to];
      if (fromId && toId) {
        await WaypointEdge.create({
          arg_id: newArg.arg_id,
          from_waypoint_id: fromId,
          to_waypoint_id: toId
        }, { transaction });
      }
    }

    await transaction.commit();
    res.status(201).json(newArg);
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
      status: status || arg.status 
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
    for (const wp of waypoints) {
      if (wp.waypoint_id) {
        // Update existing
        await Waypoint.update({
          title: wp.title || 'Waypoint',
          description: wp.description || '',
          location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lng} ${wp.lat})`, 4326)
        }, { where: { waypoint_id: wp.waypoint_id }, transaction });
        
        idMap[wp.id] = wp.waypoint_id;

        const mg = await Minigame.findOne({ where: { waypoint_id: wp.waypoint_id }, transaction });
        if (mg) {
          await mg.update({ game_type: mapFrontendTypeToGameType(wp.type) }, { transaction });
        } else {
          await Minigame.create({
            waypoint_id: wp.waypoint_id,
            game_type: mapFrontendTypeToGameType(wp.type)
          }, { transaction });
        }
      } else {
        // Create new
        const dbWp = await Waypoint.create({
          arg_id: arg.arg_id,
          title: wp.title || 'Waypoint',
          description: wp.description || '',
          location: sequelize.fn('ST_GeomFromText', `POINT(${wp.lng} ${wp.lat})`, 4326)
        }, { transaction });
        
        idMap[wp.id] = dbWp.waypoint_id;

        await Minigame.create({
          waypoint_id: dbWp.waypoint_id,
          game_type: mapFrontendTypeToGameType(wp.type)
        }, { transaction });
      }
    }

    // Replace edges
    await WaypointEdge.destroy({ where: { arg_id }, transaction });
    
    for (const edge of edges) {
      const fromId = idMap[edge.from] || edge.from_waypoint_id;
      const toId = idMap[edge.to] || edge.to_waypoint_id;
      
      if (fromId && toId) {
        await WaypointEdge.create({
          arg_id: arg.arg_id,
          from_waypoint_id: fromId,
          to_waypoint_id: toId
        }, { transaction });
      }
    }

    await transaction.commit();
    res.json(arg);
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
