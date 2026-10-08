const { User } = require('../models');
const bcrypt = require('bcryptjs');
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
    const { email, password } = req.body;
    
    if (!req.user) {
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
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    await User.destroy({ where: { user_id: req.user.user_id } });
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error during deletion:', err);
      }
      res.json({ message: 'Account deleted successfully' });
    });
  } catch (error) {
    console.error('DeleteAccount Error:', error);
    res.status(500).json({ error: 'An error occurred while deleting the account.' });
  }
};
