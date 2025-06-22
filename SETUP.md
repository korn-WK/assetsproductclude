# Asset Management System Setup

## Prerequisites
- Node.js (v14 or higher)
- MySQL/MariaDB
- npm or yarn

## Database Setup

1. Create a MySQL database named `assets`
2. Import the database schema from `assets.sql`:
   ```bash
   mysql -u root -p assets < assets.sql
   ```

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following content:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password_here
   DB_NAME=assets

   # Server Configuration
   PORT=4000
   NODE_ENV=development

   # Client URL for CORS
   CLIENT_URL=http://localhost:3000

   # JWT Secret
   JWT_SECRET=your-secret-key-here
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

The backend will be running on `http://localhost:4000`

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

The frontend will be running on `http://localhost:3000`

## Features

### Backend Features
- RESTful API for asset management
- Image upload with Multer
- Static file serving for uploaded images
- Database integration with MySQL
- CORS configuration for frontend communication

### Frontend Features
- Asset table with real-time data from database
- Image display from backend uploads
- Status filtering (All, Activated, Lost, Damaged)
- Pagination
- Responsive design
- Loading and error states

## API Endpoints

- `GET /api/assets` - Get all assets
- `GET /api/assets/stats` - Get asset statistics
- `GET /api/assets/summary` - Get asset summary
- `POST /api/assets/upload-image` - Upload asset image
- `GET /api/assets/:barcode` - Get asset by barcode
- `PATCH /api/assets/:barcode/status` - Update asset status

## Image Upload

Images are stored in the `backend/uploads/` directory and served statically at `/uploads/` endpoint.

## Database Schema

The system uses the following main tables:
- `assets` - Main asset information
- `departments` - Department information
- `users` - User information
- `asset_locations` - Location information

## Troubleshooting

1. **Database Connection Error**: Check your MySQL credentials in the `.env` file
2. **Image Not Loading**: Ensure the backend server is running and the image path is correct
3. **CORS Error**: Verify the `CLIENT_URL` in the backend `.env` file matches your frontend URL
4. **Port Already in Use**: Change the `PORT` in the `.env` file or stop the process using that port 