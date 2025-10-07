@echo off
REM Vapi Lead Calling System Setup Script for Windows
REM This script helps set up the development environment

echo 🚀 Setting up Vapi Lead Calling System...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ npm detected

REM Install server dependencies
echo 📦 Installing server dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install server dependencies
    pause
    exit /b 1
)

REM Install client dependencies
echo 📦 Installing client dependencies...
cd client
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install client dependencies
    pause
    exit /b 1
)
cd ..

REM Create environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating environment file...
    copy env.example .env >nul
    echo ✅ Created .env file from template
    echo ⚠️  Please edit .env file with your actual credentials before running the application
) else (
    echo ✅ .env file already exists
)

REM Create uploads directory
if not exist uploads mkdir uploads
echo ✅ Created uploads directory

REM Create logs directory
if not exist logs mkdir logs
echo ✅ Created logs directory

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit .env file with your actual credentials:
echo    - Supabase URL and keys
echo    - Vapi API key and assistant ID
echo    - Email service credentials
echo.
echo 2. Set up your Supabase database:
echo    - Create a new Supabase project
echo    - Run the SQL script in database/schema.sql
echo    - Configure storage buckets
echo.
echo 3. Configure your Vapi assistant:
echo    - Create an assistant in Vapi dashboard
echo    - Set up your calling script
echo    - Test the assistant
echo.
echo 4. Start the development server:
echo    npm run dev
echo.
echo 5. Open your browser to:
echo    http://localhost:3000
echo.
echo For detailed setup instructions, see README.md
echo For deployment instructions, see DEPLOYMENT.md
echo.
pause
