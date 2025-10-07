const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const orderRoutes = require('./routes/orders');
const uploadRoutes = require('./routes/upload');
const callRoutes = require('./routes/calls');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const webhookRoutes = require('./routes/webhooks'); // Add webhook routes
const stripeWebhookRoutes = require('./routes/stripe-webhooks');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['your-production-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vapiConfigured: !!process.env.VAPI_API_KEY
  });
});

// API Routes
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes); // Add webhook routes
// const stripeWebhookRoutes = require('./routes/stripe-webhooks');
app.use('/api/stripe-webhooks', stripeWebhookRoutes); // Stripe payment webhooks

// Test VAPI endpoint
app.get('/api/test-vapi', async (req, res) => {
  try {
    const vapiClient = require('./config/vapi');
    const testResult = await vapiClient.testConnection();
    
    res.json({
      success: testResult.success,
      message: testResult.success ? 'VAPI connection successful! 🎉' : 'VAPI connection failed ❌',
      data: testResult.data || testResult.error,
      credentials: {
        hasApiKey: !!process.env.VAPI_API_KEY,
        hasPhoneId: !!process.env.VAPI_PHONE_NUMBER_ID,
        hasAssistantId: !!process.env.VAPI_ASSISTANT_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'VAPI test failed',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      error: 'File too large', 
      message: 'Please upload a file smaller than 10MB' 
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📞 VAPI Test: http://localhost:${PORT}/api/test-vapi`);
  console.log(`🎣 Webhook URL: http://localhost:${PORT}/api/webhooks/vapi`);
  
  // Test VAPI connection on startup
  const vapiClient = require('./config/vapi');
  vapiClient.testConnection().then(result => {
    if (result.success) {
      console.log('✅ VAPI connection successful!');
    } else {
      console.log('❌ VAPI connection failed:', result.error);
    }
  }).catch(error => {
    console.log('❌ VAPI test error:', error.message);
  });
});

module.exports = app;