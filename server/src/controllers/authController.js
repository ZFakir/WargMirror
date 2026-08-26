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
