import { config } from 'dotenv';
import app from './app.js';

config(); // Load environment variables

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://farahtarek707:Ihf29082003@grad.o1ebv.mongodb.net/?retryWrites=true&w=majority&appName=GRAD';

console.log('MongoDB URI:', MONGO_URI);

// Error handling for the server
const server = app.listen(PORT, () => {
  console.log(`Server listening at port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try a different port or kill the process using this port.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});
