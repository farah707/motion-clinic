import { spawn } from "child_process";
import path from "path";

const scriptPath = path.join(process.cwd(), 'scripts', 'image_analyzer.py');

console.log('Testing Python script execution...');
console.log('Script path:', scriptPath);

// Test if the script exists
import fs from 'fs';
if (!fs.existsSync(scriptPath)) {
  console.error('Script does not exist at:', scriptPath);
  process.exit(1);
}

console.log('Script exists. Testing with help...');

const pythonProcess = spawn('python', [scriptPath, '--help']);

pythonProcess.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

pythonProcess.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

pythonProcess.on('close', (code) => {
  console.log('Process exited with code:', code);
});

pythonProcess.on('error', (err) => {
  console.error('Process error:', err);
}); 