#!/bin/bash

# Vapi Lead Calling System Setup Script
# This script helps set up the development environment

echo "🚀 Setting up Vapi Lead Calling System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install server dependencies"
    exit 1
fi

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install client dependencies"
    exit 1
fi

cd ..

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env file with your actual credentials before running the application"
else
    echo "✅ .env file already exists"
fi

# Create uploads directory
mkdir -p uploads
echo "✅ Created uploads directory"

# Create logs directory
mkdir -p logs
echo "✅ Created logs directory"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual credentials:"
echo "   - Supabase URL and keys"
echo "   - Vapi API key and assistant ID"
echo "   - Email service credentials"
echo ""
echo "2. Set up your Supabase database:"
echo "   - Create a new Supabase project"
echo "   - Run the SQL script in database/schema.sql"
echo "   - Configure storage buckets"
echo ""
echo "3. Configure your Vapi assistant:"
echo "   - Create an assistant in Vapi dashboard"
echo "   - Set up your calling script"
echo "   - Test the assistant"
echo ""
echo "4. Start the development server:"
echo "   npm run dev"
echo ""
echo "5. Open your browser to:"
echo "   http://localhost:3000"
echo ""
echo "For detailed setup instructions, see README.md"
echo "For deployment instructions, see DEPLOYMENT.md"
