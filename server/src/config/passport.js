const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user ID into the session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize user from the session by ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['session_token'] }
    });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth 2.0 Strategy
// Only registered when credentials are present — the server can still start
// and serve all API endpoints without them (Google login will simply be unavailable).
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Look for an existing user by their Google ID
        let user = await User.findOne({ where: { google_uid: profile.id } });

        if (user) {
          // Existing user — return them
          return done(null, user);
        }

        // New user — create an account from their Google profile
        user = await User.create({
          google_uid: profile.id,
          username: profile.displayName || `user_${profile.id.slice(-6)}`,
          email: profile.emails[0].value,
          // avatar is optional; could store the Google profile photo URL later
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
  console.log('✅ Google OAuth strategy registered.');
} else {
  console.warn('⚠️  GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Google login is disabled.');
}

module.exports = passport;

