# Railway Deployment Guide for Motion Clinic Backend

## 🚂 Railway Configuration

This backend is configured for Railway deployment with both Node.js and Python support.

### Files Added/Updated:
- `railway.json` - Railway deployment configuration
- `nixpacks.toml` - Multi-language build configuration
- `Procfile` - Alternative deployment configuration
- `start.sh` - Custom startup script
- `utils/railwayCheck.js` - Environment validation

## 🔧 Environment Variables Required

Set these in Railway dashboard:

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET_KEY=your_secure_jwt_secret_key
JWT_EXPIRES=7d

# Frontend URLs (CORS)
FRONTEND_URL_ONE=https://your-frontend.vercel.app
FRONTEND_URL_TWO=https://your-doctor-dashboard.vercel.app
FRONTEND_URL_THREE=https://your-admin-dashboard.vercel.app

# Google OAuth
CLIENT_ID=your_google_oauth_client_id
CLIENT_SECRET=your_google_oauth_client_secret
CALLBACK_URL=https://your-backend.railway.app/api/v1/user/auth/google/callback

# Email Configuration
SMTP_MAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Environment
NODE_ENV=production
PYTHONUNBUFFERED=1
```

## 📦 Dependencies

### Node.js Dependencies:
- Express.js server
- MongoDB with Mongoose
- JWT authentication
- Passport.js for OAuth
- CORS configuration
- File upload handling

### Python Dependencies:
- PyTorch for AI models
- Transformers for NLP
- FAISS for vector search
- Sentence transformers
- Medical AI processing

## 🚀 Deployment Steps

1. **Connect to GitHub:**
   - Link your Railway account to GitHub
   - Select the repository

2. **Configure Environment:**
   - Set all required environment variables
   - Ensure MongoDB connection string is accessible

3. **Deploy:**
   - Railway will automatically detect the configuration
   - Build process installs both Node.js and Python dependencies
   - Health check endpoint: `/api/v1/user/health`

## 🔍 Health Check

The application includes a health check endpoint:
```
GET /api/v1/user/health
```

Response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🐍 Python Integration

The backend uses Python for:
- RAG (Retrieval-Augmented Generation) medical assistant
- AI model processing
- Medical text analysis

Python scripts are located in:
- `scripts/lightweight_rag_processor.py`
- `scripts/image_analyzer.py`

## 📁 File Structure

```
backend/
├── railway.json          # Railway configuration
├── nixpacks.toml        # Multi-language build config
├── Procfile             # Alternative deployment
├── start.sh             # Custom startup script
├── requirements.txt     # Python dependencies
├── package.json         # Node.js dependencies
├── server.js           # Main server file
├── app.js              # Express app configuration
├── utils/
│   ├── railwayCheck.js # Environment validation
│   └── ragModel.js     # AI model integration
└── scripts/            # Python AI scripts
```

## 🚨 Troubleshooting

### Common Issues:

1. **Python not found:**
   - Check nixpacks.toml configuration
   - Ensure build-essential is included

2. **Model files missing:**
   - Upload model files to `data/models/`
   - Check railwayCheck.js for required files

3. **MongoDB connection failed:**
   - Verify MONGO_URI environment variable
   - Check network connectivity

4. **Build timeout:**
   - Python dependencies can take time to install
   - Consider using lighter model versions

## 📊 Monitoring

Railway provides:
- Real-time logs
- Resource usage monitoring
- Automatic restarts on failure
- Health check monitoring

## 🔄 Updates

To update the deployment:
1. Push changes to GitHub
2. Railway automatically redeploys
3. Check logs for any issues
4. Verify health check endpoint

## 📞 Support

For Railway-specific issues:
- Check Railway documentation
- Review build logs
- Verify environment variables
- Test health check endpoint 