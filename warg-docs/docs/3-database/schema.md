---
sidebar_position: 1
---

# Database Schema

The WARG platform relies on a MySQL database, extensively using spatial extensions (SRID 4326 / WGS 84) to manage real-world coordinates and geographical boundaries.

Rather than presenting the raw SQL, the schema is visualized below in logical groupings.

## 1. Users, Social & Notifications

This module handles core identities, authentications, player connections, and alerts.

```mermaid
erDiagram
    users {
        int user_id PK
        string google_uid
        string username
        string role
        int total_points
        int trust_score
    }
    user_follows {
        int follower_id FK
        int followed_id FK
    }
    friend_requests {
        int request_id PK
        int sender_id FK
        int receiver_id FK
        string status
    }
    notifications {
        int notification_id PK
        int user_id FK
        string type
        string title
        boolean is_read
    }
    push_subscriptions {
        int subscription_id PK
        int user_id FK
        string platform
        string endpoint
    }

    users ||--o{ user_follows : "follows (follower_id)"
    users ||--o{ user_follows : "followed by (followed_id)"
    users ||--o{ friend_requests : "sends (sender_id)"
    users ||--o{ friend_requests : "receives (receiver_id)"
    users ||--o{ notifications : "receives"
    users ||--o{ push_subscriptions : "has"
```

## 2. ARGs, Waypoints & Gameplay

This forms the core engine of the platform. ARGs contain Waypoints, which are connected via Edges and host Minigames. Player progression through these is tracked through sessions, waypoint progress, and individual minigame attempts.

```mermaid
erDiagram
    args {
        int arg_id PK
        int creator_id FK
        string title
        string mode
        string status
    }
    waypoints {
        int waypoint_id PK
        int arg_id FK
        point location
        int validation_radius_m
    }
    waypoint_edges {
        int edge_id PK
        int arg_id FK
        int from_waypoint_id FK
        int to_waypoint_id FK
    }
    minigames {
        int game_id PK
        int waypoint_id FK
        string game_type
        json config_json
    }
    assets {
        int asset_id PK
        int waypoint_id FK
        int arg_id FK
        string asset_type
    }
    game_sessions {
        int user_id PK,FK
        int arg_id PK,FK
        string status
        int total_points_earned
    }
    waypoint_progress {
        int user_id PK,FK
        int waypoint_id PK,FK
        string status
    }
    minigame_attempts {
        int user_id PK,FK
        int game_id PK,FK
        string outcome
        decimal score
    }

    users ||--o{ args : "creates"
    args ||--o{ waypoints : "contains"
    args ||--o{ waypoint_edges : "routes"
    args ||--o{ assets : "uses"
    
    waypoints ||--o{ minigames : "hosts"
    waypoints ||--o{ waypoint_edges : "from/to"
    waypoints ||--o{ assets : "uses"
    
    users ||--o{ game_sessions : "plays"
    args ||--o{ game_sessions : "played in"
    
    users ||--o{ waypoint_progress : "progresses at"
    waypoints ||--o{ waypoint_progress : "tracked at"
    
    users ||--o{ minigame_attempts : "attempts"
    minigames ||--o{ minigame_attempts : "attempted by"
```

## 3. Community, Moderation & Meta-Progression

This module covers player feedback (ratings, comments), safety (flags, location trust events), and long-term progression (badges, leaderboards).

```mermaid
erDiagram
    arg_ratings {
        int rating_id PK
        int arg_id FK
        int user_id FK
        int stars
    }
    arg_votes {
        int vote_id PK
        int arg_id FK
        int user_id FK
        string vote
    }
    comments {
        int comment_id PK
        int arg_id FK
        int user_id FK
        string body
    }
    flags {
        int flag_id PK
        int arg_id FK
        int reporter_id FK
        string reason
        string status
    }
    badges {
        int badge_id PK
        string name
        json award_criteria
    }
    user_badges {
        int user_badge_id PK
        int user_id FK
        int badge_id FK
    }
    leaderboard_arg {
        int leaderboard_id PK
        int arg_id FK
        int user_id FK
        int points
    }
    trust_events {
        int event_id PK
        int user_id FK
        string event_type
        decimal delta_score
    }

    users ||--o{ arg_ratings : "rates"
    args ||--o{ arg_ratings : "rated by"
    
    users ||--o{ arg_votes : "votes on"
    args ||--o{ arg_votes : "voted on by"
    
    users ||--o{ comments : "writes"
    args ||--o{ comments : "commented on"
    
    users ||--o{ flags : "reports"
    args ||--o{ flags : "flagged for"
    
    badges ||--o{ user_badges : "awarded to"
    users ||--o{ user_badges : "earns"
    
    users ||--o{ leaderboard_arg : "ranks in"
    args ||--o{ leaderboard_arg : "ranked in"
    
    users ||--o{ trust_events : "generates"
```
