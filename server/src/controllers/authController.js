const { User } = require('../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { username }] 
      } 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already taken.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      username,
      email,
      password_hash,
      auth_provider: 'local'
    });

    // Log them in immediately after signup
    req.logIn(newUser, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to log in after signup.' });
      }
      return res.status(201).json({ 
        message: 'Signup successful',
        user: {
          user_id: newUser.user_id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      });
    });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'An error occurred during signup.' });
  }
};

exports.checkUserExists = async (req, res) => {
  try {
    const { email, username } = req.query;
    
    if (email) {
      const user = await User.findOne({ where: { email } });
      if (user) return res.json({ exists: true, field: 'email' });
    }
    
    if (username) {
      const user = await User.findOne({ where: { username } });
      if (user) return res.json({ exists: true, field: 'username' });
    }
    
    res.json({ exists: false });
  } catch (error) {
    console.error('CheckUserExists Error:', error);
    res.status(500).json({ error: 'An error occurred while checking.' });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { email, password, current_password } = req.body;
    
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.auth_provider === 'google') {
      return res.status(400).json({ error: 'Cannot update email or password for Google accounts.' });
    }

    const updates = {};
    if (email && email !== req.user.email) {
      // Check if new email is in use
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
      updates.email = email;
    }

    if (password) {
      // Changing the password requires proving knowledge of the current one.
      const isMatch = await bcrypt.compare(current_password || '', req.user.password_hash || '');
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    if (Object.keys(updates).length > 0) {
      await User.update(updates, { where: { user_id: req.user.user_id } });
    }

    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('UpdateAccount Error:', error);
    res.status(500).json({ error: 'An error occurred while updating the account.' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    await User.destroy({ where: { user_id: req.user.user_id } });
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error during deletion:', err);
      }
      // Regardless of logout error, the user is deleted
      res.json({ message: 'Account deleted successfully' });
    });
  } catch (error) {
    console.error('DeleteAccount Error:', error);
    res.status(500).json({ error: 'An error occurred while deleting the account.' });
  }
};

// Request a password reset token. The response is always the same generic
// message so the endpoint cannot be used to enumerate registered emails.
// No email service is wired up yet — the reset link is printed to the server
// log instead (acceptable for coursework / local deployments).
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ where: { email } });

    // Only local accounts have a password to reset.
    if (user && user.auth_provider === 'local') {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      await User.update(
        {
          password_reset_token: tokenHash,
          password_reset_expires: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        },
        { where: { user_id: user.user_id } }
      );

      const baseUrl = process.env.CLIENT_PAGES_URL || process.env.CLIENT_URL || '';
      console.log(`🔑 Password reset link for ${email}: ${baseUrl}/reset-password.html?token=${token}`);
    }

    res.json({ message: 'If that email is registered, a reset link has been created.' });
  } catch (error) {
    console.error('ForgotPassword Error:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
};

// Complete a reset using the token issued by forgotPassword.
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Only the hash is stored, so hash the presented token before lookup.
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      where: {
        password_reset_token: tokenHash,
        password_reset_expires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await User.update(
      {
        password_hash,
        password_reset_token: null,
        password_reset_expires: null
      },
      { where: { user_id: user.user_id } }
    );

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    console.error('ResetPassword Error:', error);
    res.status(500).json({ error: 'An error occurred while resetting the password.' });
  }
};
