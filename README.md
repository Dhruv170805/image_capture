# Image Capture System (Production Ready)

A lightweight, high-performance image capture and logging system built with Node.js, Express, and MongoDB Atlas.

## ✨ Features
- **Scalable Database:** Uses MongoDB Atlas for employee data and image logs.
- **Image Processing:** Server-side resizing (150x150) and aggressive compression using Sharp.
- **Security:** Rate limiting, Helmet security headers, and CORS protection.
- **Production Grade:** Compression (Gzip), environment variable support, and robust error handling.
- **Data Migration:** Built-in script to migrate data from CSV to MongoDB.

## 🛠️ Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account and Connection URI

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
Create a `.env` file in the root directory (template provided below):
```env
PORT=3001
MONGODB_URI=your_mongodb_atlas_connection_string
NODE_ENV=production
```

### 3. Data Migration (Seed)
You can migrate existing data via the Admin Dashboard or by using the CLI seed utility:
```bash
npm run seed path/to/your/employees.csv
```

### 4. Run Application
**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 5. Features
- **Flexible CSV Upload:** Upload any CSV in the Admin panel to update your employee master list.
- **Biometric History:** All uploaded CSV files are logged in MongoDB for audit purposes.
- **IST Timezone:** All registrations and logs are automatically handled in Indian Standard Time.
- **Auto-Capture:** Both face and palm registration support stable auto-capture.

## 📂 Project Structure
- `server/app.js` - Main entry point
- `server/models/` - Mongoose schemas (Employee, ImageLog)
- `server/services/` - Business logic and database interactions
- `server/uploads/` - Local storage for processed images
- `scripts/seed.js` - CSV to MongoDB migration utility
- `data/` - Backup of original CSV data

## 🧪 API Endpoints
- `GET /api/health` - Health check and system status
- `GET /api/employee/:code` - Validate employee code
- `POST /api/upload` - Upload and process image (JSON body with `empCode` and `image` as base64)
- `GET /api/upload/logs` - Fetch paginated image capture logs

## 🔒 Security Measures
- **Rate Limiting:** Global (100 req/min) and Upload specific (20 req/min).
- **Security Headers:** Powered by Helmet.js.
- **Input Validation:** Strict employee code checks and image size limits.
- **Environment Isolation:** Different logging and error levels for Dev/Prod.

## 📦 Deployment on Linux Server
1. Clone the repository.
2. Install PM2: `npm install -g pm2`.
3. Configure `.env`.
4. Run `npm run seed`.
5. Start with PM2: `pm2 start server/app.js --name "image-capture"`.
