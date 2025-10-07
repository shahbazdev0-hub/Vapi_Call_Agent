# Project Structure

This document provides a comprehensive overview of the Vapi Lead Calling System project structure.

```
vapi-lead-calling-system/
├── 📁 client/                          # React Frontend Application
│   ├── 📁 public/                      # Static files
│   ├── 📁 src/                         # Source code
│   │   ├── 📁 components/              # Reusable React components
│   │   │   └── 📄 Header.js            # Navigation header component
│   │   ├── 📁 pages/                   # Page components
│   │   │   ├── 📄 Home.js              # Landing page with features and stats
│   │   │   ├── 📄 CreateOrder.js       # Order creation form
│   │   │   ├── 📄 UploadSpreadsheet.js # File upload interface
│   │   │   ├── 📄 OrderStatus.js       # Order monitoring and management
│   │   │   ├── 📄 Dashboard.js         # Admin dashboard
│   │   │   └── 📄 NotFound.js          # 404 error page
│   │   ├── 📁 services/                # API service layer
│   │   │   └── 📄 api.js               # Axios configuration and interceptors
│   │   ├── 📄 App.js                   # Main React application component
│   │   ├── 📄 App.css                  # Global styles and component styles
│   │   ├── 📄 index.js                 # React application entry point
│   │   └── 📄 index.css                # Tailwind CSS imports
│   ├── 📄 package.json                 # Frontend dependencies and scripts
│   ├── 📄 tailwind.config.js           # Tailwind CSS configuration
│   └── 📄 postcss.config.js            # PostCSS configuration
│
├── 📁 server/                          # Node.js Backend Application
│   ├── 📁 config/                      # Configuration files
│   │   ├── 📄 supabase.js              # Supabase client configuration
│   │   └── 📄 vapi.js                  # Vapi API client configuration
│   ├── 📁 routes/                      # API route handlers
│   │   ├── 📄 orders.js                # Order management endpoints
│   │   ├── 📄 upload.js                # File upload endpoints
│   │   ├── 📄 calls.js                 # Call management endpoints
│   │   ├── 📄 reports.js               # Report generation endpoints
│   │   └── 📄 dashboard.js             # Dashboard data endpoints
│   ├── 📁 utils/                       # Utility functions
│   │   ├── 📄 validation.js            # Data validation schemas and functions
│   │   ├── 📄 spreadsheet.js           # CSV/Excel parsing utilities
│   │   └── 📄 email.js                 # Email sending utilities
│   └── 📄 index.js                     # Express server entry point
│
├── 📁 database/                        # Database schema and migrations
│   └── 📄 schema.sql                   # Supabase database schema
│
├── 📁 uploads/                         # File upload directory (created at runtime)
├── 📁 logs/                           # Application logs (created at runtime)
│
├── 📄 package.json                     # Backend dependencies and scripts
├── 📄 env.example                      # Environment variables template
├── 📄 setup.sh                        # Linux/Mac setup script
├── 📄 setup.bat                       # Windows setup script
├── 📄 test-system.js                   # Integration testing script
├── 📄 README.md                       # Project documentation
├── 📄 DEPLOYMENT.md                   # Deployment guide
└── 📄 PROJECT_STRUCTURE.md            # This file
```

## Key Components

### Frontend (React)

#### Components
- **Header.js**: Navigation component with logo and menu links
- **Home.js**: Landing page showcasing system features and statistics
- **CreateOrder.js**: Form for creating new lead calling orders
- **UploadSpreadsheet.js**: File upload interface with drag-and-drop support
- **OrderStatus.js**: Real-time order monitoring and management
- **Dashboard.js**: Admin interface for system overview and order management
- **NotFound.js**: 404 error page

#### Services
- **api.js**: Centralized API client with error handling and interceptors

### Backend (Node.js/Express)

#### Configuration
- **supabase.js**: Database and storage client setup
- **vapi.js**: AI calling service integration

#### Routes
- **orders.js**: Order CRUD operations and status management
- **upload.js**: File upload handling and validation
- **calls.js**: Call initiation, monitoring, and retry logic
- **reports.js**: Report generation and email delivery
- **dashboard.js**: Admin dashboard data and statistics

#### Utilities
- **validation.js**: Joi schemas for data validation
- **spreadsheet.js**: CSV/Excel parsing and template generation
- **email.js**: Email service integration with templates

### Database Schema

The system uses Supabase (PostgreSQL) with the following main tables:

- **orders**: Order information and configuration
- **leads**: Lead data from uploaded spreadsheets
- **calls**: Call records and status tracking
- **call_logs**: Detailed call event logging
- **reports**: Generated report metadata

### File Structure Patterns

#### Frontend Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Route-specific page components
├── services/      # API and external service integrations
├── styles/        # CSS and styling files
└── utils/         # Helper functions and utilities
```

#### Backend Structure
```
server/
├── config/        # Service configurations
├── routes/        # API endpoint handlers
├── middleware/    # Express middleware functions
├── utils/         # Helper functions and utilities
├── models/        # Data models (if using ORM)
└── tests/         # Test files
```

## Environment Configuration

### Required Environment Variables

```env
# Database
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Calling Service
VAPI_API_KEY=your_vapi_api_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@yourcompany.com

# Server Configuration
PORT=5000
NODE_ENV=production

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.csv,.xlsx,.xls

# Call Configuration
DEFAULT_CALL_START_TIME=09:00
DEFAULT_CALL_END_TIME=18:00
MAX_RETRY_ATTEMPTS=2
CALL_TIMEOUT=300
```

## API Endpoints

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `GET /api/orders` - List orders (paginated)
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order

### File Upload
- `POST /api/upload/spreadsheet/:orderId` - Upload leads spreadsheet
- `GET /api/upload/template/csv` - Download CSV template
- `GET /api/upload/template/excel` - Download Excel template

### Call Management
- `POST /api/calls/start/:orderId` - Start calling process
- `POST /api/calls/stop/:orderId` - Stop calling process
- `GET /api/calls/status/:orderId` - Get call status
- `POST /api/calls/retry/:leadId` - Retry specific call

### Reports
- `POST /api/reports/generate/:orderId` - Generate report
- `GET /api/reports/:orderId` - Get report details
- `GET /api/reports/download/:orderId` - Download report

### Dashboard
- `GET /api/dashboard/overview` - System overview statistics
- `GET /api/dashboard/orders` - Orders list with pagination
- `GET /api/dashboard/orders/:id` - Detailed order information
- `POST /api/dashboard/reprocess/:orderId` - Reprocess order

## Data Flow

1. **Order Creation**: User creates order via frontend form
2. **File Upload**: User uploads spreadsheet with lead data
3. **Data Validation**: System validates and processes lead data
4. **Call Initiation**: System starts automated calling process
5. **Call Monitoring**: Real-time tracking of call progress
6. **Report Generation**: Automatic report creation upon completion
7. **Email Delivery**: Report sent to customer via email

## Security Considerations

- Input validation on all endpoints
- File upload restrictions and scanning
- Rate limiting on API endpoints
- CORS configuration for frontend access
- Environment variable protection
- Database connection security
- API key management

## Scalability Features

- Database indexing for performance
- File storage optimization
- Efficient API pagination
- Background job processing
- Error handling and recovery
- Monitoring and logging

## Testing Strategy

- Integration tests for API endpoints
- Frontend component testing
- End-to-end workflow testing
- Error handling validation
- Performance testing
- Security testing

## Deployment Architecture

### Development
- Local Node.js server (port 5000)
- React development server (port 3000)
- Local Supabase instance or cloud

### Production
- Node.js application server
- React static build served by web server
- Supabase cloud database
- File storage in Supabase
- Email service integration

This structure provides a scalable, maintainable foundation for the lead calling system with clear separation of concerns and organized codebase.
