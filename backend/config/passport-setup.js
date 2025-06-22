// config/passport-setup.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../lib/db'); // Path to your db.js
require('dotenv').config();

passport.use(
  new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Callback URL สำหรับ Backend ของคุณ
    // ต้องตรงกับ Authorized redirect URIs ที่คุณตั้งค่าใน Google API Console
    callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);
      let user = rows[0];

      if (user) {
        // User exists, update their name and picture in case they've changed.
        const pictureUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : user.picture;
        await db.execute(
          'UPDATE users SET name = ?, picture = ? WHERE id = ?',
          [profile.displayName, pictureUrl, user.id]
        );
        // Re-fetch the user to get the updated info
        const [updatedRows] = await db.execute('SELECT * FROM users WHERE id = ?', [user.id]);
        user = updatedRows[0];
        console.log('User found and updated:', user.email);
        done(null, user);
      } else {
        // User does not exist, create new user (default role 'user')
        const pictureUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
        const [result] = await db.execute(
          'INSERT INTO users (username, email, name, role, password_hash, is_active, picture) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [profile.emails[0].value, profile.emails[0].value, profile.displayName, 'user', '', 1, pictureUrl] // password_hash can be empty for OAuth users
        );
        user = {
          id: result.insertId,
          username: profile.emails[0].value,
          email: profile.emails[0].value,
          name: profile.displayName,
          role: 'user',
          is_active: 1,
          picture: pictureUrl
        };
        console.log('New user created:', user.email);
        done(null, user);
      }
    } catch (err) {
      console.error('Error during Google OAuth callback:', err);
      done(err, null);
    }
  })
);

// Serialize user (for session management, Passport requires it)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user (for session management)
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    const user = rows[0];
    if (user) {
      done(null, user);
    } else {
      done(null, false); // Tell passport the user does not exist
    }
  } catch (err) {
    done(err, null);
  }
});