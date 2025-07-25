#!/bin/bash

# Railway startup script
echo "Starting Motion Clinic Backend..."

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "Python3 is available"
    python3 --version
    echo "Python3 path: $(which python3)"
else
    echo "Python3 is not available"
    echo "Available Python versions:"
    which python || echo "python not found"
    which python3 || echo "python3 not found"
fi

# Check if Node.js is available
if command -v node &> /dev/null; then
    echo "Node.js is available"
    node --version
else
    echo "Node.js is not available"
fi

# Check if npm is available
if command -v npm &> /dev/null; then
    echo "npm is available"
    npm --version
else
    echo "npm is not available"
fi

# Start the application
echo "Starting the application..."
npm start 