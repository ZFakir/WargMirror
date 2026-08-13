// =============================================================
//  WARG Platform — Database Seed Script
//  Run from: /server directory
//  Command:  node seed.js
//  ⚠️  This script is IDEMPOTENT — safe to rerun.
//      It clears existing seed data before reinserting.
// =============================================================

require('dotenv').config({ path: './src/.env' });
const sequelize = require('./src/config/database');

const q = (sql, replacements = []) =>
  sequelize.query(sql, { replacements, type: sequelize.QueryTypes.RAW });

// ------------------------------------------------------------------
// Wits campus coordinates [longitude, latitude] (SRID 4326)
// ------------------------------------------------------------------
const LOCS = {
  greatHall:      [-26.1929,  28.0305],
  cullenLibrary:  [-26.1936,  28.0309],
  senate:         [-26.1924,  28.0318],
  chemistry:      [-26.1945,  28.0311],
  physics:        [-26.1941,  28.0319],
  matrix:         [-26.1938,  28.0302],
  eastCampus:     [-26.1950,  28.0330],
  westGate:       [-26.1920,  28.0290],
  yMitre:         [-26.1933,  28.0298],
  solomon:        [-26.1955,  28.0316],
};

const point = ([lat, lon]) =>
  `ST_GeomFromText('POINT(${lat} ${lon})', 4326)`;

// ------------------------------------------------------------------
async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // ==============================================================
    // §1  CLEAR EXISTING SEED DATA (reverse dependency order)
    // ==============================================================
    console.log('🗑  Clearing existing data...');
    const tables = [
      'admin_audit_log', 'push_subscriptions', 'arg_analytics_daily',
      'leaderboard_global', 'leaderboard_arg', 'user_badges', 'badges',
      'flags', 'comments', 'arg_ratings', 'arg_votes',
      'trust_events', 'location_events', 'minigame_attempts',
      'waypoint_progress', 'game_sessions', 'assets', 'minigames',
      'waypoint_edges', 'waypoints', 'args', 'notifications',
      'friend_requests', 'user_follows', 'users',
    ];
    for (const t of tables) await q(`DELETE FROM \`${t}\``);
    console.log('   Done.\n');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // ==============================================================
    // §2  USERS
    // ==============================================================
    console.log('👤 Seeding users...');
    await q(`
      INSERT INTO users
        (user_id, google_uid, username, email, role,
         total_points, distance_walked_m, trust_score)
      VALUES
        (1,  'google_uid_admin_001',   'wits_admin',     'admin@wits.ac.za',         'admin',   0,     0,    100.00),
        (2,  'google_uid_creator_002', 'luc_creates',    'luc@students.wits.ac.za',   'creator', 340,   4200, 97.50),
        (3,  'google_uid_creator_003', 'priya_arga',     'priya@students.wits.ac.za', 'creator', 210,   3100, 99.00),
        (4,  'google_uid_player_004',  'zack_explorer',  'zack@students.wits.ac.za',  'player',  580,   8700, 95.00),
        (5,  'google_uid_player_005',  'nomsa_quests',   'nomsa@students.wits.ac.za', 'player',  420,   6200, 98.00),
        (6,  'google_uid_player_006',  'dante_runner',   'dante@students.wits.ac.za', 'player',  190,   2900, 88.50)
    `);
    console.log('   6 users created.\n');

    // ==============================================================
    // §3  SOCIAL — FOLLOWS & FRIEND REQUESTS
    // ==============================================================
    console.log('👥 Seeding social graph...');
    await q(`
      INSERT INTO user_follows (follower_id, followed_id) VALUES
        (4, 2), (4, 3),
        (5, 2), (5, 4),
        (6, 2), (6, 5)
    `);
    await q(`
      INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES
        (4, 5, 'accepted'),
        (5, 6, 'accepted'),
        (6, 4, 'pending')
    `);
    console.log('   Follows and friend requests created.\n');

    // ==============================================================
    // §4  NOTIFICATIONS
    // ==============================================================
    console.log('🔔 Seeding notifications...');
    await q(`
      INSERT INTO notifications (user_id, type, title, body, is_read) VALUES
        (4, 'new_arg_from_creator', 'New ARG from luc_creates',
           'luc_creates just published "The Wits Heritage Trail"!', 0),
        (5, 'new_arg_from_creator', 'New ARG from luc_creates',
           'luc_creates just published "The Wits Heritage Trail"!', 1),
        (4, 'badge_earned', 'Badge Unlocked: First Steps',
           'You earned your first badge!', 1),
        (6, 'friend_request', 'Friend Request from zack_explorer',
           'zack_explorer wants to connect with you.', 0)
    `);
    console.log('   Notifications created.\n');

    // ==============================================================
    // §5  ARGs
    // ==============================================================
    console.log('🗺  Seeding ARGs...');
    await q(`
      INSERT INTO args
        (arg_id, creator_id, title, caption, description, mode, genre,
         status, play_count, completion_count, like_count, rating_sum, rating_count)
      VALUES
        (1, 2,
         'The Wits Heritage Trail',
         'Uncover the stories behind Wits University''s most iconic landmarks.',
         'A self-guided historical ARG that takes you through the founding buildings and monuments of Wits University. Decode plaques, answer trivia, and piece together 100 years of campus history.',
         'solo', 'History',
         'published', 34, 21, 28, 121, 26),

        (2, 2,
         'Chemistry Cipher',
         'A science-themed puzzle trail through the science campus.',
         'Navigate the science precinct, scan element markers, and solve lab-grade puzzles. Created in collaboration with the Chemistry department.',
         'solo', 'Science',
         'published', 18, 11, 15, 63, 14),

        (3, 3,
         'Quad Domination',
         'Claim campus zones in this live PvP territory game.',
         'Two teams race to physically occupy contested campus zones — courtyards, quads, and plazas. Capture zones by staying within their geofence and earn points for your faction.',
         'pvp', 'Competitive',
         'published', 9, 4, 12, 44, 9),

        (4, 3,
         'Midnight Mystery Draft',
         'An unpublished noir mystery set after dark.',
         'Work in progress — a branching narrative ARG set across the east campus after hours.',
         'solo', 'Mystery',
         'unpublished', 0, 0, 0, 0, 0)
    `);
    console.log('   4 ARGs created.\n');

    // ==============================================================
    // §6  WAYPOINTS
    // ==============================================================
    console.log('📍 Seeding waypoints...');

    // ARG 1 — Heritage Trail (4 waypoints)
    await q(`
      INSERT INTO waypoints
        (waypoint_id, arg_id, title, description, location, validation_radius_m, sort_order)
      VALUES
        (1, 1, 'The Great Hall',
         'Start here. Read the founding inscription above the main entrance and note the year.',
         ${point(LOCS.greatHall)}, 25, 0),

        (2, 1, 'Cullen Library',
         'Find the statue outside the library. Who is it dedicated to?',
         ${point(LOCS.cullenLibrary)}, 30, 1),

        (3, 1, 'Senate House',
         'Locate the ceremonial plaque on the north wall and decode the Latin motto.',
         ${point(LOCS.senate)}, 25, 2),

        (4, 1, 'West Gate Arch',
         'Final checkpoint. Photograph the cornerstone and submit the year inscribed.',
         ${point(LOCS.westGate)}, 35, 3)
    `);

    // ARG 2 — Chemistry Cipher (3 waypoints)
    await q(`
      INSERT INTO waypoints
        (waypoint_id, arg_id, title, description, location, validation_radius_m, sort_order)
      VALUES
        (5, 2, 'Chemistry Building Foyer',
         'Find the periodic table mural. Scan the QR code on element 79.',
         ${point(LOCS.chemistry)}, 20, 0),

        (6, 2, 'Physics Lecture Theatre',
         'Locate the Einstein quote painted outside Theatre P1. Answer the question.',
         ${point(LOCS.physics)}, 25, 1),

        (7, 2, 'The Matrix (Maths Building)',
         'Final cipher. Solve the equation on the display board to get the unlock code.',
         ${point(LOCS.matrix)}, 20, 2)
    `);

    // ARG 3 — Quad Domination (3 capture zones)
    await q(`
      INSERT INTO waypoints
        (waypoint_id, arg_id, title, description, location, validation_radius_m, sort_order)
      VALUES
        (8,  3, 'Solomon Mahlangu Square',
         'Central capture zone — highest point value.',
         ${point(LOCS.solomon)}, 50, 0),

        (9,  3, 'East Campus Quad',
         'East faction starting zone.',
         ${point(LOCS.eastCampus)}, 40, 1),

        (10, 3, 'Y-Mitre Courtyard',
         'West faction starting zone.',
         ${point(LOCS.yMitre)}, 40, 2)
    `);

    console.log('   10 waypoints created.\n');

    // ==============================================================
    // §7  WAYPOINT EDGES (directed graph — ARG 1 is linear)
    // ==============================================================
    console.log('🔗 Seeding waypoint edges...');
    await q(`
      INSERT INTO waypoint_edges (arg_id, from_waypoint_id, to_waypoint_id) VALUES
        (1, 1, 2),
        (1, 2, 3),
        (1, 3, 4),
        (2, 5, 6),
        (2, 6, 7)
    `);
    console.log('   Edges created.\n');

    // ==============================================================
    // §8  MINIGAMES
    // ==============================================================
    console.log('🎮 Seeding minigames...');
    await q(`
      INSERT INTO minigames (game_id, waypoint_id, game_type, config_json, points_value)
      VALUES
        -- Heritage Trail
        (1, 1, 'text_answer',
         '{"answer": "1922", "hint": "Look above the main entrance.", "case_sensitive": false}',
         20),
        (2, 2, 'text_answer',
         '{"answer": "Jan Smuts", "hint": "A South African statesman.", "case_sensitive": false}',
         20),
        (3, 3, 'text_answer',
         '{"answer": "Scientia et Labor", "hint": "Latin — Science and Labour.", "case_sensitive": false}',
         30),
        (4, 4, 'text_answer',
         '{"answer": "1921", "hint": "The year the arch was completed.", "case_sensitive": false}',
         30),

        -- Chemistry Cipher
        (5, 5, 'qr_barcode',
         '{"barcode_value": "AU-79-WARG", "hint": "Scan the element marker."}',
         25),
        (6, 6, 'text_answer',
         '{"answer": "E=mc2", "hint": "The most famous equation in physics.", "case_sensitive": false}',
         25),
        (7, 7, 'text_answer',
         '{"answer": "42", "hint": "The answer to everything, naturally.", "case_sensitive": false}',
         50),

        -- Quad Domination (GPS proximity — arrive and hold)
        (8,  8,  'gps_proximity', '{"hold_seconds": 60, "points_per_tick": 5}', 50),
        (9,  9,  'gps_proximity', '{"hold_seconds": 60, "points_per_tick": 3}', 30),
        (10, 10, 'gps_proximity', '{"hold_seconds": 60, "points_per_tick": 3}', 30)
    `);
    console.log('   10 minigames created.\n');

    // ==============================================================
    // §9  GAME SESSIONS & PROGRESS
    // ==============================================================
    console.log('🎯 Seeding game sessions and progress...');
    await q(`
      INSERT INTO game_sessions
        (user_id, arg_id, status, completed_at, total_points_earned, distance_m)
      VALUES
        (4, 1, 'completed', NOW(), 100, 1800),
        (5, 1, 'completed', NOW(), 100, 1750),
        (6, 1, 'active',    NULL,   40,  900),
        (4, 2, 'completed', NOW(), 100, 1100),
        (5, 2, 'active',    NULL,   25,  400),
        (4, 3, 'completed', NOW(), 80,  600),
        (5, 3, 'completed', NOW(), 60,  500)
    `);

    await q(`
      INSERT INTO waypoint_progress
        (user_id, waypoint_id, status, completed_at, attempts, points_earned)
      VALUES
        -- zack_explorer completed ARG 1 fully
        (4, 1, 'completed', NOW(), 1, 20),
        (4, 2, 'completed', NOW(), 1, 20),
        (4, 3, 'completed', NOW(), 2, 30),
        (4, 4, 'completed', NOW(), 1, 30),
        -- nomsa_quests completed ARG 1 fully
        (5, 1, 'completed', NOW(), 1, 20),
        (5, 2, 'completed', NOW(), 1, 20),
        (5, 3, 'completed', NOW(), 1, 30),
        (5, 4, 'completed', NOW(), 1, 30),
        -- dante_runner is on waypoint 3 of ARG 1
        (6, 1, 'completed', NOW(), 1, 20),
        (6, 2, 'completed', NOW(), 2, 20),
        (6, 3, 'unlocked',  NULL,  0, 0)
    `);

    await q(`
      INSERT INTO minigame_attempts
        (user_id, game_id, outcome, submission_json, score, points_awarded)
      VALUES
        (4, 1, 'pass', '{"answer": "1922"}', 1.0, 20),
        (4, 2, 'pass', '{"answer": "Jan Smuts"}', 1.0, 20),
        (4, 3, 'pass', '{"answer": "Scientia et Labor"}', 1.0, 30),
        (4, 4, 'pass', '{"answer": "1921"}', 1.0, 30),
        (5, 1, 'pass', '{"answer": "1922"}', 1.0, 20),
        (5, 2, 'pass', '{"answer": "Jan Smuts"}', 1.0, 20),
        (5, 3, 'pass', '{"answer": "Scientia et Labor"}', 1.0, 30),
        (5, 4, 'pass', '{"answer": "1921"}', 1.0, 30),
        (6, 1, 'pass', '{"answer": "1922"}', 1.0, 20),
        (6, 2, 'pass', '{"answer": "Jan Smuts"}', 1.0, 20)
    `);
    console.log('   Sessions, progress, and attempts created.\n');

    // ==============================================================
    // §10  LOCATION EVENTS (breadcrumbs for anti-spoofing)
    // ==============================================================
    console.log('📡 Seeding location events...');
    const locEvents = [
      [4, ...LOCS.greatHall,    2.1, 1.2, 15],
      [4, ...LOCS.cullenLibrary, 3.0, 1.0, 22],
      [4, ...LOCS.senate,        2.5, 0.9, 10],
      [5, ...LOCS.greatHall,    4.0, 1.1, 8],
      [5, ...LOCS.cullenLibrary, 3.5, 1.3, 20],
    ];
    for (const [uid, lat, lon, acc, spd, hdg] of locEvents) {
      await q(
        `INSERT INTO location_events
           (user_id, location, accuracy_m, speed_ms, heading)
         VALUES
           (?, ST_GeomFromText('POINT(${lat} ${lon})', 4326), ?, ?, ?)`,
        [uid, acc, spd, hdg]
      );
    }
    console.log('   Location events created.\n');

    // ==============================================================
    // §11  RATINGS, VOTES & COMMENTS
    // ==============================================================
    console.log('⭐ Seeding ratings, votes and comments...');
    await q(`
      INSERT INTO arg_votes (arg_id, user_id, vote) VALUES
        (1, 4, 'like'), (1, 5, 'like'), (1, 6, 'like'),
        (2, 4, 'like'), (2, 5, 'like'),
        (3, 4, 'like'), (3, 5, 'like')
    `);

    await q(`
      INSERT INTO arg_ratings (arg_id, user_id, stars) VALUES
        (1, 4, 5), (1, 5, 5), (1, 6, 4),
        (2, 4, 4), (2, 5, 4),
        (3, 4, 5), (3, 5, 4)
    `);

    await q(`
      INSERT INTO comments (comment_id, arg_id, user_id, parent_id, body, is_spoiler)
      VALUES
        (1, 1, 4, NULL,
         'Absolutely loved this! The Senate House clue had me stumped for ages.', 0),
        (2, 1, 5, 1,
         'Same! Took me two attempts. The Latin hint was so cryptic 😅', 0),
        (3, 1, 6, NULL,
         'Still on waypoint 3 — any non-spoiler hints?', 0),
        (4, 1, 4, 3,
         'Check the north wall, not the front!', 0),
        (5, 2, 4, NULL,
         'The QR code for gold was a genius touch. Great ARG, luc!', 0),
        (6, 3, 5, NULL,
         'This PvP mode is intense — we need more of these!', 0)
    `);
    console.log('   Ratings, votes, and comments created.\n');

    // ==============================================================
    // §12  FLAGS
    // ==============================================================
    console.log('🚩 Seeding flags...');
    await q(`
      INSERT INTO flags (arg_id, reporter_id, reason, description, status)
      VALUES
        (3, 6, 'inaccurate_location',
         'The East Campus Quad capture zone seems shifted about 50m south of the actual quad.',
         'open')
    `);
    console.log('   Flags created.\n');

    // ==============================================================
    // §13  BADGES & USER BADGES
    // ==============================================================
    console.log('🏅 Seeding badges...');
    await q(`
      INSERT INTO badges (badge_id, name, description, award_criteria) VALUES
        (1, 'First Steps',
         'Complete your very first ARG.',
         '{"type": "games_completed", "threshold": 1}'),
        (2, 'Trail Blazer',
         'Complete 5 ARGs.',
         '{"type": "games_completed", "threshold": 5}'),
        (3, 'Campus Scholar',
         'Complete the Wits Heritage Trail.',
         '{"type": "specific_arg", "arg_id": 1}'),
        (4, 'Science Sleuth',
         'Complete the Chemistry Cipher.',
         '{"type": "specific_arg", "arg_id": 2}'),
        (5, 'Road Warrior',
         'Walk more than 5000m across all ARGs.',
         '{"type": "distance_walked_m", "threshold": 5000}')
    `);

    await q(`
      INSERT INTO user_badges (user_id, badge_id) VALUES
        (4, 1), (4, 3), (4, 4), (4, 5),
        (5, 1), (5, 3),
        (6, 1)
    `);
    console.log('   Badges created and awarded.\n');

    // ==============================================================
    // §14  LEADERBOARDS
    // ==============================================================
    console.log('🏆 Seeding leaderboards...');
    await q(`
      INSERT INTO leaderboard_arg
        (arg_id, user_id, points, completion_time_s, \`rank\`)
      VALUES
        (1, 4, 100, 1420, 1),
        (1, 5, 100, 1680, 2),
        (1, 6,  40, NULL, 3),
        (2, 4, 100,  980, 1),
        (3, 4,  80,  540, 1),
        (3, 5,  60,  720, 2)
    `);

    await q(`
      INSERT INTO leaderboard_global (user_id, total_points, games_completed, global_rank)
      VALUES
        (4, 580, 3, 1),
        (5, 420, 2, 2),
        (6, 190, 0, 3),
        (2, 340, 0, 4),
        (3, 210, 0, 5)
    `);
    console.log('   Leaderboards populated.\n');

    // ==============================================================
    // §15  ANALYTICS
    // ==============================================================
    console.log('📊 Seeding analytics...');
    await q(`
      INSERT INTO arg_analytics_daily
        (arg_id, stat_date, sessions_started, sessions_completed,
         unique_players, avg_waypoints_day, new_likes, new_dislikes)
      VALUES
        (1, CURDATE() - INTERVAL 6 DAY, 5, 2, 5, 2.4, 4, 0),
        (1, CURDATE() - INTERVAL 5 DAY, 8, 5, 8, 3.1, 7, 0),
        (1, CURDATE() - INTERVAL 4 DAY, 6, 4, 6, 2.8, 5, 0),
        (1, CURDATE() - INTERVAL 3 DAY, 4, 3, 4, 3.5, 4, 0),
        (1, CURDATE() - INTERVAL 2 DAY, 7, 4, 7, 2.9, 5, 0),
        (1, CURDATE() - INTERVAL 1 DAY, 3, 2, 3, 3.0, 2, 0),
        (1, CURDATE(),                  1, 1, 1, 4.0, 1, 0),
        (2, CURDATE() - INTERVAL 3 DAY, 4, 2, 4, 2.0, 3, 0),
        (2, CURDATE() - INTERVAL 2 DAY, 6, 3, 6, 2.3, 5, 0),
        (2, CURDATE() - INTERVAL 1 DAY, 5, 3, 5, 2.1, 4, 0),
        (3, CURDATE() - INTERVAL 2 DAY, 3, 1, 3, 1.5, 4, 0),
        (3, CURDATE() - INTERVAL 1 DAY, 4, 2, 4, 2.0, 5, 0),
        (3, CURDATE(),                  2, 1, 2, 2.5, 3, 0)
    `);
    console.log('   Analytics created.\n');

    // ==============================================================
    // §16  PUSH SUBSCRIPTIONS
    // ==============================================================
    console.log('📲 Seeding push subscriptions...');
    await q(`
      INSERT INTO push_subscriptions (user_id, platform, endpoint, is_active)
      VALUES
        (4, 'web', 'https://fcm.googleapis.com/fcm/send/FAKE_TOKEN_ZACK', 1),
        (5, 'web', 'https://fcm.googleapis.com/fcm/send/FAKE_TOKEN_NOMSA', 1)
    `);
    console.log('   Push subscriptions created.\n');

    // ==============================================================
    // §17  ADMIN AUDIT LOG
    // ==============================================================
    console.log('📋 Seeding admin audit log...');
    await q(`
      INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details_json)
      VALUES
        (1, 'publish_arg',  'arg',  1, '{"note": "Approved Heritage Trail for publication."}'),
        (1, 'publish_arg',  'arg',  2, '{"note": "Approved Chemistry Cipher."}'),
        (1, 'publish_arg',  'arg',  3, '{"note": "Approved Quad Domination."}'),
        (1, 'suspend_user', 'user', 6, '{"note": "Temporary suspension — reviewed and lifted.", "duration_hours": 0}')
    `);
    console.log('   Audit log created.\n');

    // ==============================================================
    // DONE
    // ==============================================================
    console.log('✅ Seed complete! Summary:');
    console.log('   6  users  (1 admin, 2 creators, 3 players)');
    console.log('   4  ARGs   (3 published, 1 draft)');
    console.log('   10 waypoints across all ARGs');
    console.log('   10 minigames');
    console.log('   5  badges, awarded to all 3 players');
    console.log('   7  days of analytics data for ARG 1\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

seed();
