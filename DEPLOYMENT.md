# Deployment Guide

This guide covers deploying the Vapi Lead Calling System to various platforms.

## Prerequisites

- Node.js 16+ installed
- Git repository access
- Required API keys and credentials
- Domain name (for production)

## Environment Setup

### 1. Production Environment Variables

Create a `.env.production` file with production values:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Vapi API Configuration
VAPI_API_KEY=your_production_vapi_key
VAPI_ASSISTANT_ID=your_production_assistant_id

# Email Configuration
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_USER=your_production_email
EMAIL_PASS=your_production_password
EMAIL_FROM=noreply@yourdomain.com

# Server Configuration
PORT=5000
NODE_ENV=production

# Security
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key

# File Upload Limits
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.csv,.xlsx,.xls

# Call Configuration
DEFAULT_CALL_START_TIME=09:00
DEFAULT_CALL_END_TIME=18:00
MAX_RETRY_ATTEMPTS=2
CALL_TIMEOUT=300

# Admin Configuration
ADMIN_EMAIL=admin@yourdomain.com
```

### 2. Supabase Production Setup

1. **Create Production Project**:
   - Go to Supabase dashboard
   - Create a new project for production
   - Note down the project URL and API keys

2. **Run Database Schema**:
   - Execute `database/schema.sql` in the production database
   - Verify all tables and storage buckets are created

3. **Configure Storage Policies**:
   - Set up appropriate RLS policies for your use case
   - Configure storage bucket permissions

4. **Set Up Backups**:
   - Enable automatic backups
   - Configure retention policies

### 3. Vapi API Production Setup

1. **Create Production Assistant**:
   - Set up a production assistant in Vapi dashboard
   - Configure your calling script and voice settings
   - Test thoroughly before deployment

2. **Configure Webhooks** (Optional):
   - Set up webhook endpoints for call status updates
   - Configure retry and error handling

## Deployment Options

### Option 1: Heroku Deployment

#### 1. Prepare for Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
heroku create your-app-name

# Add buildpacks
heroku buildpacks:add heroku/nodejs
```

#### 2. Configure Environment Variables

```bash
# Set environment variables
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_ANON_KEY=your_anon_key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
heroku config:set VAPI_API_KEY=your_vapi_key
heroku config:set VAPI_ASSISTANT_ID=your_assistant_id
heroku config:set EMAIL_HOST=your_email_host
heroku config:set EMAIL_USER=your_email_user
heroku config:set EMAIL_PASS=your_email_pass
heroku config:set NODE_ENV=production
```

#### 3. Deploy

```bash
# Deploy to Heroku
git push heroku main

# Scale dynos
heroku ps:scale web=1

# View logs
heroku logs --tail
```

#### 4. Heroku Configuration

Create `Procfile`:
```
web: npm start
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "heroku-postbuild": "cd client && npm install && npm run build"
  }
}
```

### Option 2: DigitalOcean App Platform

#### 1. Prepare Repository

```bash
# Ensure all files are committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### 2. Create DigitalOcean App

1. Go to DigitalOcean App Platform
2. Create new app from GitHub repository
3. Configure build settings:
   - **Build Command**: `cd client && npm install && npm run build`
   - **Run Command**: `npm start`
   - **Environment**: Node.js

#### 3. Configure Environment Variables

Add all production environment variables in the App Platform dashboard.

#### 4. Deploy

The app will automatically deploy when you push to the main branch.

### Option 3: AWS EC2 Deployment

#### 1. Launch EC2 Instance

```bash
# Launch Ubuntu 20.04 LTS instance
# Configure security groups:
# - Port 22 (SSH)
# - Port 80 (HTTP)
# - Port 443 (HTTPS)
# - Port 5000 (Application)
```

#### 2. Server Setup

```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 3. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Create environment file
cp env.example .env
# Edit .env with production values

# Start with PM2
pm2 start server/index.js --name "lead-calling-system"
pm2 startup
pm2 save
```

#### 4. Configure Nginx

Create `/etc/nginx/sites-available/lead-calling`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve static files from React build
    location / {
        root /home/ubuntu/your-repo/client/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/lead-calling /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 4: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
# Dockerfile
FROM node:16-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Production stage
FROM node:16-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy built client and server code
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server ./server

# Expose port
EXPOSE 5000

# Start application
CMD ["npm", "start"]
```

#### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  lead-calling-system:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - VAPI_API_KEY=${VAPI_API_KEY}
      - VAPI_ASSISTANT_ID=${VAPI_ASSISTANT_ID}
      - EMAIL_HOST=${EMAIL_HOST}
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
```

#### 3. Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Cloudflare

1. Add your domain to Cloudflare
2. Update DNS records to point to your server
3. Enable SSL/TLS encryption mode
4. Configure page rules if needed

## Monitoring and Maintenance

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart lead-calling-system
```

### 2. Database Monitoring

- Set up Supabase monitoring alerts
- Monitor database performance
- Set up backup verification

### 3. Error Tracking

Consider integrating services like:
- Sentry for error tracking
- LogRocket for session replay
- New Relic for performance monitoring

### 4. Health Checks

The application includes health check endpoints:
- `GET /api/health` - Basic health check
- `GET /api/dashboard/health` - Detailed system health

### 5. Backup Strategy

- **Database**: Automatic Supabase backups
- **Files**: Regular backup of uploaded files
- **Configuration**: Version control for environment files

## Security Considerations

### 1. Environment Security

- Use strong, unique passwords
- Rotate API keys regularly
- Enable 2FA on all accounts
- Use environment variable encryption

### 2. Server Security

```bash
# Update firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban -y

# Configure automatic updates
sudo apt install unattended-upgrades -y
```

### 3. Application Security

- Enable rate limiting
- Implement CORS properly
- Validate all inputs
- Use HTTPS everywhere
- Regular security updates

## Performance Optimization

### 1. Database Optimization

- Monitor query performance
- Add appropriate indexes
- Use connection pooling
- Regular maintenance

### 2. Application Optimization

- Enable gzip compression
- Optimize images and assets
- Use CDN for static files
- Implement caching strategies

### 3. Monitoring Performance

- Set up performance monitoring
- Monitor response times
- Track resource usage
- Set up alerts for issues

## Troubleshooting Deployment

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for missing environment variables

2. **Database Connection Issues**:
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure database is accessible

3. **File Upload Issues**:
   - Check storage bucket permissions
   - Verify file size limits
   - Check disk space availability

4. **Email Delivery Problems**:
   - Verify SMTP credentials
   - Check spam filters
   - Test email configuration

### Debug Mode

Enable debug logging:
```bash
export NODE_ENV=development
export DEBUG=*
```

### Log Analysis

```bash
# View application logs
pm2 logs lead-calling-system

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# View system logs
sudo journalctl -u nginx -f
```

## Scaling Considerations

### Horizontal Scaling

- Use load balancers
- Implement session management
- Database connection pooling
- File storage optimization

### Vertical Scaling

- Monitor resource usage
- Upgrade server specifications
- Optimize database queries
- Implement caching layers

### Auto-scaling

- Configure auto-scaling groups
- Set up monitoring alerts
- Implement health checks
- Plan for traffic spikes

## Maintenance Schedule

### Daily
- Monitor system health
- Check error logs
- Verify backups

### Weekly
- Review performance metrics
- Update dependencies
- Security patches

### Monthly
- Full system backup
- Performance optimization
- Security audit
- Capacity planning

This deployment guide provides comprehensive instructions for deploying the Vapi Lead Calling System to various platforms. Choose the deployment method that best fits your requirements and infrastructure.
