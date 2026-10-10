const request = require('supertest');
const express = require('express');
const passport = require('passport');
const authRoutes = require('./src/routes/authRoutes');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.session = { destroy: (cb) => cb() };
  next();
});

jest = { mock: () => {}, spyOn: () => ({ mockImplementation: (fn) => { passport.authenticate = fn; } }) };

passport.authenticate = (strategy, callback) => {
  return (req, res, next) => {
    if (typeof callback !== 'function') {
      return res.redirect('/auth/google/callback');
    }
    callback(null, { user_id: 1, username: 'test' });
  };
};

app.use('/auth', authRoutes);

request(app).get('/auth/google').set('referer', 'http://localhost:3000/some/path').then(res => {
  console.log('Status:', res.status);
  console.log('Body:', res.body);
  console.log('Text:', res.text);
}).catch(console.error);
