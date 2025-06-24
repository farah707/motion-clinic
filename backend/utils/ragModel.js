// RAG Model Integration Utility
// Bridge between Node.js backend and Python RAG model

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class RAGMedicalAssistant {
  constructor() {
    this.isInitialized = false;
    this.isLoading = false;
    this.pythonScriptPath = path.join(process.cwd(), 'scripts', 'lightweight_rag_processor.py');
    this.modelPath = path.join(process.cwd(), 'data', 'models');
    this.responseCache = new Map();
    this.cacheMaxSize = 500; // Much larger cache
    this.modelLoaded = false;
  }

  // Get cached response if available
  getCachedResponse(query, context) {
    const cacheKey = this.generateCacheKey(query, context);
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1800000) { // 30 minutes cache
      console.log('[RAG] Using cached response');
      return cached.response;
    }
    return null;
  }

  // Store response in cache
  cacheResponse(query, context, response) {
    const cacheKey = this.generateCacheKey(query, context);
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.responseCache.size > this.cacheMaxSize) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
  }

  // Generate cache key from query and context
  generateCacheKey(query, context) {
    const normalizedQuery = query.toLowerCase().trim().substring(0, 100);
    return `${normalizedQuery}_${context.age || 'noage'}_${context.gender || 'nogender'}`;
  }

  // Initialize the RAG model
  async initialize() {
    try {
      console.log('[RAG] Checking model artifacts in:', this.modelPath);
      const modelExists = await this.checkModelExists();
      
      if (!modelExists) {
        console.log('[RAG] Model artifacts not found. Please run the lightweight Python script first.');
        return false;
      }

      console.log('[RAG] Model artifacts found, marking as initialized');
      this.isInitialized = true;
      console.log('[RAG] Lightweight RAG Model initialized successfully');
      return true;
      
    } catch (error) {
      console.error('[RAG] Error initializing RAG model:', error);
      return false;
    }
  }

  // Check if model artifacts exist
  async checkModelExists() {
    const requiredFiles = [
      'faiss_index.bin',
      'corpus_embeddings.npy',
      'cleaned_patients.csv',
      'model_config.json'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.modelPath, file);
      if (!fs.existsSync(filePath)) {
        return false;
      }
    }
    return true;
  }

  // Query the RAG model using optimized Python subprocess
  async query(userQuery, context = {}) {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      console.log('RAG model not initialized, attempting to initialize...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('RAG model could not be initialized');
      }
    }

    try {
      // Check cache first
      const cachedResponse = this.getCachedResponse(userQuery, context);
      if (cachedResponse) {
        const responseTime = Date.now() - startTime;
        console.log(`[RAG] Cached response in ${responseTime}ms`);
        return cachedResponse;
      }

      const response = await this.callPythonRAG(userQuery, context);
      this.cacheResponse(userQuery, context, response);
      
      const responseTime = Date.now() - startTime;
      console.log(`[RAG] Query processed in ${responseTime}ms`);
      
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[RAG] Error querying RAG model (${responseTime}ms):`, error);
      throw error;
    }
  }

  // Call Python RAG processor with optimization
  async callPythonRAG(query, context) {
    return new Promise((resolve, reject) => {
      // Build the command as a single string to properly handle spaces
      let command = `python "${this.pythonScriptPath}" --query "${query}" --mode query`;
      
      if (context.age !== undefined && context.age !== null && context.age !== '') {
        command += ` --age ${context.age}`;
      }
      if (context.gender !== undefined && context.gender !== null && context.gender !== '') {
        command += ` --gender "${context.gender}"`;
      }
      
      console.log(`[RAG] Spawning Python process: ${command}`);
      
      const pythonProcess = spawn(command, [], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        shell: true
      });
      
      let result = '';
      let error = '';
      let hasOutput = false;
      
      console.log('[RAG] Starting Python process monitoring...');
      
      pythonProcess.stdout.on('data', (data) => {
        hasOutput = true;
        const output = data.toString();
        console.log('[RAG] Python stdout chunk:', output);
        result += output;
      });
      
      pythonProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.log('[RAG] Python stderr chunk:', errorOutput);
        error += errorOutput;
      });
      
      pythonProcess.on('close', (code) => {
        console.log(`[RAG] Python process exited with code ${code}`);
        console.log('[RAG] Python stdout:', result);
        console.log('[RAG] Python stderr:', error);
        if (code !== 0) {
          reject(new Error(`[RAG] Python process exited with code ${code}: ${error}`));
        } else if (!hasOutput) {
          reject(new Error('[RAG] No output from Python process'));
        } else {
          try {
            // Extract the last JSON object from the output
            const jsonMatch = result.match(/({[\s\S]*})\s*$/);
            if (!jsonMatch) throw new Error('No JSON object found in Python output');
            const response = JSON.parse(jsonMatch[1]);
            resolve(response);
          } catch (parseError) {
            console.error('[RAG] Failed to parse Python response:', result);
            reject(new Error(`[RAG] Failed to parse Python response: ${parseError.message}`));
          }
        }
      });
      
      pythonProcess.on('error', (err) => {
        console.error('[RAG] Failed to start Python process:', err.message);
        reject(new Error(`[RAG] Failed to start Python process: ${err.message}`));
      });
      
      // Kill process if it takes too long
      setTimeout(() => {
        if (pythonProcess && !pythonProcess.killed) {
          console.log('[RAG] Killing slow Python process');
          pythonProcess.kill('SIGKILL');
          reject(new Error('Python process timeout'));
        }
      }, 40000); // 40 second timeout
    });
  }

  // Health check
  async healthCheck() {
    return {
      status: this.isInitialized ? 'healthy' : 'not_initialized',
      model: 'RAG Medical Assistant',
      modelPath: this.modelPath,
      timestamp: new Date()
    };
  }

  // Initialize model (run Python script)
  async initializeModel() {
    return new Promise((resolve, reject) => {
      console.log('Initializing RAG model...');
      
      const pythonProcess = spawn('python', [
        this.pythonScriptPath,
        '--mode', 'initialize'
      ], {
        cwd: process.cwd()
      });

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('Python output:', data.toString());
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error('Python error:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Model initialization failed with code ${code}: ${error}`));
        } else {
          console.log('Model initialization completed successfully');
          this.isInitialized = true;
          resolve({ success: true, message: 'Model initialized successfully' });
        }
      });

      pythonProcess.on('error', (err) => {
        reject(new Error(`Failed to start model initialization: ${err.message}`));
      });
    });
  }

  // Preload model for faster responses
  async preloadModel() {
    if (this.modelLoaded) return; // Already preloaded
    
    console.log('[RAG] Preloading model for faster responses...');
    try {
      // Start a background process to preload the model
      const preloadProcess = spawn('python', [
        this.pythonScriptPath,
        '--mode', 'preload'
      ], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      return new Promise((resolve, reject) => {
        let result = '';
        let error = '';

        preloadProcess.stdout.on('data', (data) => {
          result += data.toString();
        });

        preloadProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        preloadProcess.on('close', (code) => {
          if (code === 0) {
            console.log('[RAG] Model preloaded successfully');
            this.modelLoaded = true;
            resolve();
          } else {
            console.log('[RAG] Preload failed, will load on demand');
            resolve(); // Don't fail initialization, just load on demand
          }
        });

        preloadProcess.on('error', (err) => {
          console.log('[RAG] Preload error, will load on demand:', err.message);
          resolve(); // Don't fail initialization
        });
      });
    } catch (error) {
      console.log('[RAG] Preload failed, will load on demand');
      return; // Don't fail initialization
    }
  }
}

// Export singleton instance
const ragAssistant = new RAGMedicalAssistant();

export default ragAssistant;

// Helper functions

// Check if Python is available
export const checkPythonAvailability = () => {
  return new Promise((resolve) => {
    const pythonProcess = spawn('python', ['--version']);
    
    pythonProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    pythonProcess.on('error', () => {
      resolve(false);
    });
  });
};

// Install Python dependencies
export const installPythonDependencies = () => {
  return new Promise((resolve, reject) => {
    console.log('Installing Python dependencies...');
    
    const pipProcess = spawn('pip', ['install', '-r', 'requirements.txt']);
    
    let output = '';
    let error = '';

    pipProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pipProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pipProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to install dependencies: ${error}`));
      } else {
        console.log('Python dependencies installed successfully');
        resolve({ success: true });
      }
    });

    pipProcess.on('error', (err) => {
      reject(new Error(`Failed to start pip: ${err.message}`));
    });
  });
};