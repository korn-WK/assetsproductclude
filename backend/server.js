// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser'); // NEW: Import cookie-parser
const path = require('path');

dotenv.config();

require('./config/passport-setup');

const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/asset.js');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const locationRoutes = require('./routes/locationRoutes');
const barcodeRoutes = require('./routes/barcode');
const assetTransferRoutes = require('./routes/assetTransfer');

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true // IMPORTANT: Allow cookies/authorization headers
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // NEW: Use cookie-parser middleware

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true, // IMPORTANT: Makes the cookie inaccessible to client-side JavaScript
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
    sameSite: 'Lax' // Or 'Strict' depending on your requirements, 'None' for cross-site with secure:true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/assets', assetRoutes); // สำหรับ asset
app.use('/api', userRoutes);         // สำหรับ user (จะได้ /api/users ที่ field ครบ)
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/asset-transfers', assetTransferRoutes);

app.get('/', (req, res) => {
  res.send('Asset Audit System Backend is running!');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Backend server running at Port ${port}`);
});