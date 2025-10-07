# Vapi Lead Calling System

A comprehensive automated lead calling system that integrates with Vapi API for AI-powered phone calls, Supabase for data storage, and includes a modern React frontend with admin dashboard.

## Features

- **Automated Lead Calling**: AI-powered calls using Vapi API with customizable scripts
- **Spreadsheet Upload**: Support for CSV/Excel files with lead validation
- **Smart Scheduling**: Configurable calling hours and timezone support
- **Retry Logic**: Automatic retry mechanism for failed calls
- **Call Monitoring**: Real-time call status tracking and progress monitoring
- **Report Generation**: Comprehensive reports with call transcripts and lead verification
- **Email Delivery**: Automatic report delivery via email
- **Admin Dashboard**: Full admin interface for order management and monitoring
- **Scalable Architecture**: Built to handle hundreds of leads per order

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Supabase** for database and file storage
- **Vapi API** for AI calling services
- **Nodemailer** for email delivery
- **Multer** for file uploads
- **XLSX** for Excel processing
- **CSV-Parser** for CSV processing

### Frontend
- **React** with functional components and hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Dropzone** for file uploads
- **React Toastify** for notifications

## Prerequisites

Before setting up the system, ensure you have:

1. **Node.js** (v16 or higher)
2. **Supabase Account** and project
3. **Vapi API** account and credentials
4. **Email Service** (Gmail, SendGrid, etc.)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vapi-lead-calling-system
```

### 2. Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your actual credentials:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Vapi API Configuration
VAPI_API_KEY=your_vapi_api_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourcompany.com

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 4. Database Setup

1. **Create Supabase Project**:
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Get your project URL and API keys

2. **Run Database Schema**:
   - Open the Supabase SQL editor
   - Copy and paste the contents of `database/schema.sql`
   - Execute the script to create tables and storage buckets

3. **Configure Storage Buckets**:
   The schema will automatically create these buckets:
   - `spreadsheets` - for uploaded lead files
   - `reports` - for generated reports
   - `call-recordings` - for call recordings (if enabled)

### 5. Vapi API Setup

1. **Create Vapi Account**:
   - Sign up at [Vapi](https://vapi.ai)
   - Create an assistant with your calling script
   - Get your API key and assistant ID

2. **Configure Assistant**:
   - Set up your calling script in Vapi dashboard
   - Configure call parameters and voice settings
   - Test your assistant before going live

### 6. Email Service Setup

For Gmail:
1. Enable 2-factor authentication
2. Generate an app password
3. Use the app password in `EMAIL_PASS`

For other providers, adjust `EMAIL_HOST` and `EMAIL_PORT` accordingly.

## Running the Application

### Development Mode

```bash
# Start both server and client
npm run dev

# Or start individually
npm run server  # Backend only
npm run client  # Frontend only
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

### Production Mode

```bash
# Build the client
npm run build

# Start the server
npm start
```

## Usage Guide

### 1. Creating an Order

1. Navigate to "Create Order" in the main menu
2. Fill out customer information and calling preferences
3. Set calling hours and timezone
4. Configure retry attempts and custom script (optional)
5. Click "Create Order" to generate an order ID

### 2. Uploading Leads

1. Use the order ID to navigate to the upload page
2. Download a template (CSV or Excel) if needed
3. Prepare your spreadsheet with required columns:
   - **Required**: Name, Phone, Company
   - **Optional**: Email, Title, Address, Notes
4. Upload your file - the system will validate and process the data
5. Review validation results and fix any errors

### 3. Starting Calls

1. Go to the order status page
2. Click "Start Calling" to begin the automated process
3. Monitor progress in real-time
4. The system will automatically call leads during specified hours
5. Failed calls will be retried according to your settings

### 4. Viewing Results

1. Access the admin dashboard for system overview
2. View individual order details and call progress
3. Generate reports once calling is complete
4. Download reports or receive them via email

## API Endpoints

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `GET /api/orders` - List orders with pagination
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order

### Upload
- `POST /api/upload/spreadsheet/:orderId` - Upload leads spreadsheet
- `GET /api/upload/template/csv` - Download CSV template
- `GET /api/upload/template/excel` - Download Excel template

### Calls
- `POST /api/calls/start/:orderId` - Start calling process
- `POST /api/calls/stop/:orderId` - Stop calling process
- `GET /api/calls/status/:orderId` - Get call status
- `POST /api/calls/retry/:leadId` - Retry specific call

### Reports
- `POST /api/reports/generate/:orderId` - Generate report
- `GET /api/reports/:orderId` - Get report details
- `GET /api/reports/download/:orderId` - Download report

### Dashboard
- `GET /api/dashboard/overview` - Get dashboard statistics
- `GET /api/dashboard/orders` - List orders with pagination
- `GET /api/dashboard/orders/:id` - Get detailed order info
- `POST /api/dashboard/reprocess/:orderId` - Reprocess order

## Configuration

### Calling Hours
- Default: 9:00 AM - 6:00 PM
- Configurable per order
- Timezone support included

### Retry Logic
- Default: 2 additional attempts for failed calls
- Configurable per order (0-5 attempts)
- Automatic retry scheduling

### File Limits
- Maximum file size: 10MB
- Supported formats: CSV, XLS, XLSX
- Automatic validation and error reporting

## Monitoring and Maintenance

### Health Checks
- Database connection monitoring
- Storage bucket availability
- API endpoint status checking

### Error Handling
- Comprehensive error logging
- Email notifications for critical errors
- Graceful failure handling

### Performance Optimization
- Database indexing for fast queries
- Efficient file processing
- Rate limiting for API calls

## Security Considerations

- Input validation and sanitization
- File upload security
- Rate limiting on API endpoints
- CORS configuration
- Environment variable protection

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure database schema is properly set up

2. **File Upload Failures**
   - Check file size limits
   - Verify file format support
   - Review storage bucket permissions

3. **Call Failures**
   - Verify Vapi API credentials
   - Check assistant configuration
   - Review calling hours settings

4. **Email Delivery Issues**
   - Verify email service credentials
   - Check SMTP settings
   - Review spam filters

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

### Logs

Check console output for detailed error messages and debugging information.

## Deployment

### Heroku Deployment

1. Create a Heroku app
2. Set environment variables
3. Deploy the application
4. Configure database and storage

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN cd client && npm install && npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Variables for Production

Ensure all environment variables are properly set in your production environment:
- Database credentials
- API keys
- Email configuration
- Security settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue in the repository

## Roadmap

- [ ] Webhook support for real-time updates
- [ ] Advanced call analytics
- [ ] Multi-language support
- [ ] Integration with CRM systems
- [ ] Advanced reporting features
- [ ] Mobile app support
