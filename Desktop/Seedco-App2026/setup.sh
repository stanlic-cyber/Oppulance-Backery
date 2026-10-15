#!/bin/bash

echo "SeedCo App Setup Script"
echo "======================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo ".env file created. Please update it with your configurations."
else
    echo ".env file already exists"
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building the application..."
npm run build

echo ""
echo "Setup complete!"
echo "To start the application, run: npm start"
echo "For development mode, run: npm run dev"
