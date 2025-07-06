// Railway Environment Check Utility
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const checkRailwayEnvironment = async () => {
  console.log('🔍 Checking Railway environment...');
  
  const checks = {
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
    pythonAvailable: false,
    modelFiles: false,
    mongoUri: !!process.env.MONGO_URI,
    jwtSecret: !!process.env.JWT_SECRET_KEY
  };

  // Check Python availability
  try {
    const pythonCheck = spawn('python3', ['--version']);
    await new Promise((resolve, reject) => {
      pythonCheck.on('close', (code) => {
        checks.pythonAvailable = code === 0;
        resolve();
      });
      pythonCheck.on('error', () => {
        checks.pythonAvailable = false;
        resolve();
      });
    });
  } catch (error) {
    checks.pythonAvailable = false;
  }

  // Check model files
  const modelPath = path.join(process.cwd(), 'data', 'models');
  const requiredFiles = ['faiss_index.bin', 'corpus_embeddings.npy', 'cleaned_patients.csv'];
  
  try {
    const filesExist = requiredFiles.every(file => 
      fs.existsSync(path.join(modelPath, file))
    );
    checks.modelFiles = filesExist;
  } catch (error) {
    checks.modelFiles = false;
  }

  console.log('📊 Environment Check Results:');
  console.log('✅ Node.js Version:', checks.nodeVersion);
  console.log('✅ Node Environment:', checks.nodeEnv);
  console.log('✅ Port:', checks.port);
  console.log('✅ Python Available:', checks.pythonAvailable ? 'Yes' : 'No');
  console.log('✅ Model Files:', checks.modelFiles ? 'Yes' : 'No');
  console.log('✅ MongoDB URI:', checks.mongoUri ? 'Set' : 'Not Set');
  console.log('✅ JWT Secret:', checks.jwtSecret ? 'Set' : 'Not Set');

  return checks;
};

export const logRailwayInfo = () => {
  console.log('🚂 Railway Deployment Info:');
  console.log('📍 Platform: Railway');
  console.log('🔧 Builder: Nixpacks');
  console.log('🐍 Python: Enabled');
  console.log('🟢 Node.js: Enabled');
  console.log('🏥 Medical AI: RAG Model');
}; 