-- ============================================================
--  WARG Platform -- MySQL Database Schema
--  Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
--  Spatial SRID: 4326 (WGS 84)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- §1  USERS & AUTHENTICATION
-- ============================================================

-- Core user table. OAuth provider linkage is in user_auth_providers.
CREATE TABLE users (
    user_id           INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    google_uid        VARCHAR(256)     NOT NULL,
    username          VARCHAR(64)      NOT NULL,
    email             VARCHAR(256)     NOT NULL,
    avatar            MEDIUMBLOB           NULL DEFAULT NULL,
    role              ENUM('player','creator','admin')
                                       NOT NULL DEFAULT 'player',
    session_token     CHAR(64)             NULL, -- Single device session
    -- Meta-progression
    total_points      INT UNSIGNED     NOT NULL DEFAULT 0,
    distance_walked_m INT UNSIGNED     NOT NULL DEFAULT 0,  -- metres
    -- Timestamps
    created_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,
    -- Anti-spoofing trust profile (Advanced Tier)
    trust_score       DECIMAL(5,2)     NOT NULL DEFAULT 100.00,
    is_flagged        TINYINT(1)       NOT NULL DEFAULT 0,
    -- Soft-delete / suspension
    is_suspended      TINYINT(1)       NOT NULL DEFAULT 0,
    suspended_until   DATETIME             NULL DEFAULT NULL,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_google   (google_uid),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email    (email),
    INDEX idx_users_role         (role),
    INDEX idx_users_trust        (trust_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





-- ============================================================
-- §2  SOCIAL -- FOLLOWS & FRIENDS
-- ============================================================

-- User-to-user follows (asymmetric, like Twitter / creator subscriptions)
CREATE TABLE user_follows (
    follower_id INT UNSIGNED NOT NULL,   -- who is following
    followed_id INT UNSIGNED NOT NULL,   -- who is being followed

    PRIMARY KEY (follower_id, followed_id),
    INDEX idx_follows_followed (followed_id),
    CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_followed FOREIGN KEY (followed_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Explicit bi-directional friend requests
CREATE TABLE friend_requests (
    request_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_id   INT UNSIGNED NOT NULL,
    receiver_id INT UNSIGNED NOT NULL,
    status      ENUM('pending','accepted','declined','cancelled')
                             NOT NULL DEFAULT 'pending',
    sent_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (request_id),
    UNIQUE KEY uq_friend_pair (sender_id, receiver_id),
    INDEX idx_fr_receiver (receiver_id),
    CONSTRAINT fk_fr_sender   FOREIGN KEY (sender_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_fr_receiver FOREIGN KEY (receiver_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §3  NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    notification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED NOT NULL,   -- recipient
    type            VARCHAR(64)  NOT NULL,
    -- Examples: 'new_arg_from_creator', 'friend_request',
    --           'badge_earned', 'arg_flagged', 'arg_published'
    title           VARCHAR(256) NOT NULL,
    body            TEXT             NULL,
    payload_json    JSON             NULL,   -- contextual IDs / URLs
    is_read         TINYINT(1)   NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (notification_id),
    INDEX idx_notif_user_unread (user_id, is_read, created_at),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §4  ARGS (the WARG Games)
-- ============================================================

CREATE TABLE args (
    arg_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    creator_id       INT UNSIGNED NOT NULL,
    title            VARCHAR(256) NOT NULL,
    caption          TEXT             NULL,   -- short description (card)
    description      TEXT             NULL,   -- long form description
    cover_image      MEDIUMBLOB       NULL,
    mode             ENUM('solo','coop','pvp','live')
                                  NOT NULL DEFAULT 'solo',
    genre            VARCHAR(64)      NULL,
    -- Curation lifecycle
    status           ENUM('unpublished','published','retired')
                                  NOT NULL DEFAULT 'unpublished',
    scheduled_at     DATETIME         NULL,
    published_at     DATETIME         NULL,
    retired_at       DATETIME         NULL,
    -- Denormalised aggregate stats (updated via triggers / application)
    play_count       INT UNSIGNED NOT NULL DEFAULT 0,
    completion_count INT UNSIGNED NOT NULL DEFAULT 0,
    like_count       INT UNSIGNED NOT NULL DEFAULT 0,
    dislike_count    INT UNSIGNED NOT NULL DEFAULT 0,
    rating_sum       INT UNSIGNED NOT NULL DEFAULT 0,
    rating_count     INT UNSIGNED NOT NULL DEFAULT 0,
    -- Timestamps
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (arg_id),
    INDEX idx_arg_creator  (creator_id),
    INDEX idx_arg_status   (status),
    INDEX idx_arg_mode     (mode),
    INDEX idx_arg_genre    (genre),
    INDEX idx_arg_likes    (like_count),
    INDEX idx_arg_pub_date (published_at),
    CONSTRAINT fk_arg_creator FOREIGN KEY (creator_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §5  WAYPOINTS
--     A waypoint is a geospatial node inside an ARG.
--     Waypoints form a directed graph supporting branching narrative.
-- ============================================================

CREATE TABLE waypoints (
    waypoint_id         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
    arg_id              INT UNSIGNED      NOT NULL,
    title               VARCHAR(256)      NOT NULL,
    description         TEXT                  NULL,
    -- Geospatial location (MySQL POINT, SRID 4326 / WGS 84)
    location            POINT                 NULL SRID 4326,
    -- Validation radius in metres for proximity check (Basic Tier)
    validation_radius_m SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    sort_order          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at          DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (waypoint_id),
    INDEX idx_wp_arg        (arg_id),
    SPATIAL INDEX spx_wp_loc (location),
    CONSTRAINT fk_wp_arg FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Directed edges in the waypoint DAG (predecessor -> successor)
CREATE TABLE waypoint_edges (
    edge_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    arg_id           INT UNSIGNED NOT NULL,
    from_waypoint_id INT UNSIGNED NOT NULL,   -- predecessor node
    to_waypoint_id   INT UNSIGNED NOT NULL,   -- successor node
    
    -- Branching condition evaluated against minigame results at the predecessor.
    -- e.g., [{"game_id": 12, "outcome": "pass"}, {"game_id": 13, "outcome": "fail"}]
    conditions_json  JSON             NULL,

    PRIMARY KEY (edge_id),
    UNIQUE KEY uq_edge (from_waypoint_id, to_waypoint_id),
    INDEX idx_edge_arg (arg_id),
    INDEX idx_edge_to  (to_waypoint_id),
    CONSTRAINT fk_edge_arg  FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE,
    CONSTRAINT fk_edge_from FOREIGN KEY (from_waypoint_id)
        REFERENCES waypoints (waypoint_id) ON DELETE CASCADE,
    CONSTRAINT fk_edge_to   FOREIGN KEY (to_waypoint_id)
        REFERENCES waypoints (waypoint_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §6  MINIGAMES
--     Each minigame is attached to a waypoint and defines
--     how a player "completes" that node.
-- ============================================================

CREATE TABLE minigames (
    game_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    waypoint_id INT UNSIGNED NOT NULL,
    game_type   ENUM(
                    'gps_proximity',   -- Basic: arrive within radius
                    'text_answer',     -- Basic: type the correct answer
                    'qr_barcode',      -- Intermediate: scan a QR/barcode
                    'ar_object_scan',  -- Advanced: AR object recognition
                    'colour_match',    -- Advanced: HSV colour matching
                    'shape_match',     -- Advanced: Jaccard shape index
                    'photo_submit'     -- Intermediate: photo upload
                ) NOT NULL,
    -- Flexible per-type config stored as JSON.
    -- Examples:
    --   text_answer:  { "answer": "Wits", "hint": "...", "case_sensitive": false }
    --   colour_match: { "target_hsv": [210, 0.8, 0.9], "tolerance": 0.12 }
    --   qr_barcode:   { "barcode_value": "WARG-2026-A3" }
    --   shape_match:  { "shape_svg": "...", "jaccard_threshold": 0.75 }
    config_json  JSON             NULL,
    points_value SMALLINT UNSIGNED NOT NULL DEFAULT 10,
    created_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (game_id),
    INDEX idx_mg_waypoint (waypoint_id),
    CONSTRAINT fk_mg_waypoint FOREIGN KEY (waypoint_id)
        REFERENCES waypoints (waypoint_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;





-- ============================================================
-- §7  MULTIMEDIA ASSETS
--     Clue images, audio clips, AR markers, 3-D models, etc.
-- ============================================================

CREATE TABLE assets (
    asset_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    uploader_id INT UNSIGNED NOT NULL,
    waypoint_id INT UNSIGNED     NULL DEFAULT NULL,
    arg_id      INT UNSIGNED     NULL DEFAULT NULL,
    asset_type  ENUM('image','audio','video','model_3d','ar_marker')
                             NOT NULL DEFAULT 'image',
    filename    VARCHAR(256) NOT NULL,
    asset_data  LONGBLOB     NOT NULL,
    mime_type   VARCHAR(128) NOT NULL,
    size_bytes  INT UNSIGNED NOT NULL DEFAULT 0,
    uploaded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (asset_id),
    INDEX idx_asset_waypoint (waypoint_id),
    INDEX idx_asset_arg      (arg_id),
    CONSTRAINT fk_asset_uploader FOREIGN KEY (uploader_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_asset_waypoint FOREIGN KEY (waypoint_id)
        REFERENCES waypoints (waypoint_id) ON DELETE SET NULL,
    CONSTRAINT fk_asset_arg      FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §8  GAME SESSIONS & PLAYER PROGRESS
-- ============================================================

-- One row per player per ARG attempt. Re-attempts overwrite the old row.
CREATE TABLE game_sessions (
    user_id             INT UNSIGNED NOT NULL,
    arg_id              INT UNSIGNED NOT NULL,
    status              ENUM('active','completed','abandoned')
                                     NOT NULL DEFAULT 'active',
    started_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        DATETIME         NULL DEFAULT NULL,
    last_active_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_points_earned INT UNSIGNED NOT NULL DEFAULT 0,
    distance_m          INT UNSIGNED NOT NULL DEFAULT 0,   -- metres walked

    PRIMARY KEY (user_id, arg_id),
    INDEX idx_gs_status (status),
    CONSTRAINT fk_gs_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_gs_arg  FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Per-waypoint progress
CREATE TABLE waypoint_progress (
    user_id      INT UNSIGNED      NOT NULL,
    waypoint_id  INT UNSIGNED      NOT NULL,
    status       ENUM('locked','unlocked','completed','skipped')
                                   NOT NULL DEFAULT 'locked',
    unlocked_at  DATETIME              NULL DEFAULT NULL,
    completed_at DATETIME              NULL DEFAULT NULL,
    attempts     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    points_earned SMALLINT UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (user_id, waypoint_id),
    INDEX idx_wp_prog_waypoint (waypoint_id),
    CONSTRAINT fk_wpp_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_wpp_waypoint FOREIGN KEY (waypoint_id)
        REFERENCES waypoints (waypoint_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Per-minigame attempt log (tracks only the latest attempt)
CREATE TABLE minigame_attempts (
    user_id         INT UNSIGNED      NOT NULL,
    game_id         INT UNSIGNED      NOT NULL,
    outcome         ENUM('pass','fail','timeout') NOT NULL,
    -- Raw player submission (answer text, scan result, colour sample, etc.)
    submission_json JSON                  NULL,
    -- Normalised server score 0.0-1.0 for graded challenges
    score           DECIMAL(5,4)          NULL,
    points_awarded  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    attempted_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, game_id),
    INDEX idx_ma_game (game_id),
    CONSTRAINT fk_ma_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ma_game FOREIGN KEY (game_id)
        REFERENCES minigames (game_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §9  LOCATION TRACKING & ANTI-SPOOFING
-- ============================================================

-- Raw GPS breadcrumbs.  High-volume in production;
-- consider PARTITION BY RANGE on recorded_at.
CREATE TABLE location_events (
    event_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT UNSIGNED    NOT NULL,
    location     POINT           NOT NULL SRID 4326,
    accuracy_m   FLOAT               NULL,   -- device-reported accuracy (m)
    speed_ms     FLOAT               NULL,   -- metres per second
    heading      FLOAT               NULL,   -- degrees 0-360
    recorded_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    is_suspicious TINYINT(1)     NOT NULL DEFAULT 0,
    -- { "reason": "impossible_speed", "computed_speed_ms": 42 }
    flags_json   JSON                NULL,

    PRIMARY KEY (event_id),
    INDEX idx_le_user    (user_id),
    INDEX idx_le_time    (recorded_at),
    SPATIAL INDEX spx_le_loc (location),
    CONSTRAINT fk_le_user    FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Behavioural trust score event log (Advanced Tier)
CREATE TABLE trust_events (
    event_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED NOT NULL,
    -- e.g. 'speed_violation', 'impossible_jump', 'drift_anomaly', 'manual_flag'
    event_type  VARCHAR(64)  NOT NULL,
    delta_score DECIMAL(5,2) NOT NULL,   -- negative = penalty applied
    context_json JSON            NULL,
    recorded_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (event_id),
    INDEX idx_te_user (user_id),
    INDEX idx_te_time (recorded_at),
    CONSTRAINT fk_te_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §10  RATINGS & FEEDBACK
-- ============================================================

-- Like / Dislike on an ARG (one vote per user per ARG)
CREATE TABLE arg_votes (
    vote_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
    arg_id   INT UNSIGNED NOT NULL,
    user_id  INT UNSIGNED NOT NULL,
    vote     ENUM('like','dislike') NOT NULL,
    voted_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (vote_id),
    UNIQUE KEY uq_arg_vote (arg_id, user_id),
    INDEX idx_av_user (user_id),
    CONSTRAINT fk_av_arg  FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE,
    CONSTRAINT fk_av_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Star rating submitted after completing an ARG
CREATE TABLE arg_ratings (
    rating_id INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    arg_id    INT UNSIGNED     NOT NULL,
    user_id   INT UNSIGNED     NOT NULL,
    stars     TINYINT UNSIGNED NOT NULL,   -- 1 to 5
    rated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (rating_id),
    UNIQUE KEY uq_arg_rating (arg_id, user_id),
    INDEX idx_ar_user (user_id),
    CONSTRAINT fk_ar_arg  FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_stars CHECK (stars BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Threaded comments / hint system (Intermediate Tier)
CREATE TABLE comments (
    comment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    arg_id     INT UNSIGNED NOT NULL,
    user_id    INT UNSIGNED NOT NULL,
    parent_id  INT UNSIGNED     NULL DEFAULT NULL,   -- threaded reply
    body       TEXT         NOT NULL,
    is_spoiler TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at  DATETIME         NULL DEFAULT NULL,
    deleted_at DATETIME         NULL DEFAULT NULL,   -- soft delete

    PRIMARY KEY (comment_id),
    INDEX idx_comment_arg    (arg_id),
    INDEX idx_comment_user   (user_id),
    INDEX idx_comment_parent (parent_id),
    CONSTRAINT fk_comment_arg    FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user   FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id)
        REFERENCES comments (comment_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §11  FLAGS & CONTENT MODERATION
-- ============================================================

CREATE TABLE flags (
    flag_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    arg_id          INT UNSIGNED NOT NULL,
    reporter_id     INT UNSIGNED NOT NULL,
    reason          ENUM(
                        'inappropriate_content',
                        'inaccurate_location',
                        'safety_concern',
                        'spam',
                        'copyright',
                        'other'
                    ) NOT NULL,
    description     TEXT             NULL,
    status          ENUM('open','reviewing','resolved','dismissed')
                                 NOT NULL DEFAULT 'open',
    resolved_by     INT UNSIGNED     NULL DEFAULT NULL,   -- admin user_id
    resolved_at     DATETIME         NULL DEFAULT NULL,
    resolution_note TEXT             NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (flag_id),
    INDEX idx_flag_arg      (arg_id),
    INDEX idx_flag_reporter (reporter_id),
    INDEX idx_flag_status   (status),
    CONSTRAINT fk_flag_arg      FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE,
    CONSTRAINT fk_flag_reporter FOREIGN KEY (reporter_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_flag_resolver FOREIGN KEY (resolved_by)
        REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §12  BADGES & META-PROGRESSION
-- ============================================================

CREATE TABLE badges (
    badge_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(128) NOT NULL,
    description   TEXT             NULL,
    icon_svg      TEXT             NULL,
    -- JSON rule evaluated by the badge-awarding engine.
    -- Example: { "type": "games_completed", "threshold": 10 }
    award_criteria JSON        NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (badge_id),
    UNIQUE KEY uq_badge_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_badges (
    user_badge_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED NOT NULL,
    badge_id      INT UNSIGNED NOT NULL,
    awarded_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_badge_id),
    UNIQUE KEY uq_user_badge (user_id, badge_id),
    INDEX idx_ub_badge (badge_id),
    CONSTRAINT fk_ub_user  FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ub_badge FOREIGN KEY (badge_id)
        REFERENCES badges (badge_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §13  LEADERBOARDS
-- ============================================================

-- Per-ARG leaderboard
CREATE TABLE leaderboard_arg (
    leaderboard_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    arg_id            INT UNSIGNED NOT NULL,
    user_id           INT UNSIGNED NOT NULL,
    points            INT UNSIGNED NOT NULL DEFAULT 0,
    completion_time_s INT UNSIGNED     NULL,   -- seconds; NULL if not completed
    rank              INT UNSIGNED     NULL,
    last_updated      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (leaderboard_id),
    UNIQUE KEY uq_lb_arg_user (arg_id, user_id),
    INDEX idx_lb_arg_rank (arg_id, points DESC),
    CONSTRAINT fk_lb_arg  FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE,
    CONSTRAINT fk_lb_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Global all-time leaderboard
CREATE TABLE leaderboard_global (
    user_id         INT UNSIGNED NOT NULL,
    total_points    INT UNSIGNED NOT NULL DEFAULT 0,
    games_completed INT UNSIGNED NOT NULL DEFAULT 0,
    global_rank     INT UNSIGNED     NULL,
    last_updated    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id),
    INDEX idx_lb_global_rank (total_points DESC),
    CONSTRAINT fk_lbg_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §14  CREATOR ANALYTICS (Advanced Tier)
-- ============================================================

-- Daily rolled-up stats per ARG, consumed by the analytics dashboard.
CREATE TABLE arg_analytics_daily (
    analytics_id       INT UNSIGNED   NOT NULL AUTO_INCREMENT,
    arg_id             INT UNSIGNED   NOT NULL,
    stat_date          DATE           NOT NULL,
    sessions_started   INT UNSIGNED   NOT NULL DEFAULT 0,
    sessions_completed INT UNSIGNED   NOT NULL DEFAULT 0,
    unique_players     INT UNSIGNED   NOT NULL DEFAULT 0,
    avg_waypoints_day  DECIMAL(8,2)   NOT NULL DEFAULT 0.00,
    new_likes          INT UNSIGNED   NOT NULL DEFAULT 0,
    new_dislikes       INT UNSIGNED   NOT NULL DEFAULT 0,
    new_flags          INT UNSIGNED   NOT NULL DEFAULT 0,

    PRIMARY KEY (analytics_id),
    UNIQUE KEY uq_analytics_day (arg_id, stat_date),
    INDEX idx_analytics_date    (stat_date),
    CONSTRAINT fk_analytics_arg FOREIGN KEY (arg_id)
        REFERENCES args (arg_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §15  PUSH NOTIFICATION SUBSCRIPTIONS (Advanced Tier)
-- ============================================================

CREATE TABLE push_subscriptions (
    subscription_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED NOT NULL,
    platform        ENUM('web','android','ios') NOT NULL DEFAULT 'web',
    endpoint        TEXT         NOT NULL,   -- FCM / Web Push endpoint URL
    keys_json       JSON             NULL,   -- { "p256dh": "...", "auth": "..." }
    is_active       TINYINT(1)   NOT NULL DEFAULT 1,
    subscribed_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (subscription_id),
    INDEX idx_push_user (user_id),
    CONSTRAINT fk_push_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §16  ADMIN AUDIT LOG
-- ============================================================

CREATE TABLE admin_audit_log (
    log_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_id     INT UNSIGNED NOT NULL,
    action       VARCHAR(128) NOT NULL,
    -- e.g. 'suspend_user', 'retire_arg', 'resolve_flag', 'promote_user'
    target_type  VARCHAR(64)      NULL,   -- 'user', 'arg', 'flag', ...
    target_id    INT UNSIGNED     NULL,
    details_json JSON             NULL,
    performed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (log_id),
    INDEX idx_audit_admin  (admin_id),
    INDEX idx_audit_target (target_type, target_id),
    INDEX idx_audit_time   (performed_at),
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id)
        REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- §17  VIEWS
-- ============================================================

-- Computed average star rating per ARG
CREATE OR REPLACE VIEW v_arg_rating AS
    SELECT  arg_id,
            CASE WHEN rating_count = 0 THEN NULL
                 ELSE ROUND(rating_sum / rating_count, 2)
            END AS avg_rating,
            rating_count
    FROM    args;


-- Aggregated stats for the player profile page
CREATE OR REPLACE VIEW v_player_stats AS
    SELECT  u.user_id,
            u.username,
            u.total_points,
            u.distance_walked_m,
            u.trust_score,
            COUNT(DISTINCT CASE WHEN gs.status = 'completed'
                           THEN gs.arg_id END)      AS games_completed,
            COUNT(DISTINCT gs.arg_id)               AS games_played,
            COUNT(DISTINCT ub.badge_id)             AS badges_earned
    FROM    users           u
    LEFT JOIN game_sessions gs ON gs.user_id = u.user_id
    LEFT JOIN user_badges   ub ON ub.user_id = u.user_id
    GROUP BY u.user_id;


-- Friends / follows activity feed with derived presence status
CREATE OR REPLACE VIEW v_friend_activity AS
    SELECT  uf.follower_id              AS viewer_id,
            u.user_id                   AS friend_id,
            u.username,
            u.avatar                      AS avatar_blob,
            gs.arg_id                   AS current_arg_id,
            a.title                     AS current_arg_title
    FROM    user_follows    uf
    JOIN    users           u   ON u.user_id  = uf.followed_id
    LEFT JOIN game_sessions gs  ON gs.user_id = u.user_id
                                AND gs.status  = 'active'
    LEFT JOIN args          a   ON a.arg_id   = gs.arg_id;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  End of WARG Platform Schema
-- ============================================================
