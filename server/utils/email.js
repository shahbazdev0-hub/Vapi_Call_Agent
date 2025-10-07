// Replace your server/utils/email.js with this:

const nodemailer = require('nodemailer');

// Create email transporter - FIXED VERSION
const createTransporter = () => {
  console.log('Creating email transporter...');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Email will be disabled.');
    return null;
  }

  try {
    return nodemailer.createTransporter({
      service: 'gmail', // Use service instead of host for Gmail
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use App Password for Gmail
      }
    });
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

/**
 * Send email with optional attachments - FIXED VERSION
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {Array} options.attachments - File attachments
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async (options) => {
  try {
    console.log('Attempting to send email to:', options.to);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured. Skipping email send.');
      return { success: false, error: 'Email not configured' };
    }

    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'Failed to create email transporter' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || []
    };

    console.log('Sending email with options:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      attachmentCount: mailOptions.attachments.length
    });

    const result = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send order confirmation email
 * @param {Object} order - Order data
 * @returns {Promise<Object>} Send result
 */
const sendOrderConfirmation = async (order) => {
  const emailContent = `
    <h2>Order Confirmation</h2>
    <p>Dear ${order.customerName || order.customer_name},</p>
    
    <p>Thank you for placing your lead calling order. Here are the details:</p>
    
    <ul>
      <li><strong>Order ID:</strong> ${order.id}</li>
      <li><strong>Customer:</strong> ${order.customerName || order.customer_name}</li>
      <li><strong>Email:</strong> ${order.customerEmail || order.customer_email}</li>
      <li><strong>Company:</strong> ${order.company || 'N/A'}</li>
      <li><strong>Calling Hours:</strong> ${order.callStartTime || order.call_start_time} - ${order.callEndTime || order.call_end_time} ${order.timezone}</li>
      <li><strong>Max Retries:</strong> ${order.maxRetries || order.max_retries}</li>
    </ul>
    
    <p>Next steps:</p>
    <ol>
      <li>Upload your leads spreadsheet using the order ID: <strong>${order.id}</strong></li>
      <li>Our system will automatically start calling during the specified hours</li>
      <li>You'll receive a detailed report via email once the calling is complete</li>
    </ol>
    
    <p>If you have any questions, please don't hesitate to contact us.</p>
    
    <p>Best regards,<br>Lead Calling Team</p>
    
    <hr>
    <p><small>This is an automated message. Please do not reply to this email.</small></p>
  `;

  return await sendEmail({
    to: order.customerEmail || order.customer_email,
    subject: `Order Confirmation - ${order.id}`,
    html: emailContent
  });
};

/**
 * Send order status update email
 * @param {Object} order - Order data
 * @param {string} status - New status
 * @returns {Promise<Object>} Send result
 */
const sendOrderStatusUpdate = async (order, status) => {
  const statusMessages = {
    'processing': 'Your order is now being processed and leads are being prepared for calling.',
    'calling': 'The calling process has started and calls are being made to your leads.',
    'completed': 'The calling process has been completed successfully.',
    'failed': 'There was an issue with your order. Please contact support.',
    'cancelled': 'Your order has been cancelled.'
  };

  const emailContent = `
    <h2>Order Status Update</h2>
    <p>Dear ${order.customerName || order.customer_name},</p>
    
    <p>Your order status has been updated:</p>
    
    <ul>
      <li><strong>Order ID:</strong> ${order.id}</li>
      <li><strong>Status:</strong> ${status.toUpperCase()}</li>
      <li><strong>Updated:</strong> ${new Date().toLocaleString()}</li>
    </ul>
    
    <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
    
    <p>Best regards,<br>Lead Calling Team</p>
    
    <hr>
    <p><small>This is an automated message. Please do not reply to this email.</small></p>
  `;

  return await sendEmail({
    to: order.customerEmail || order.customer_email,
    subject: `Order Status Update - ${order.id}`,
    html: emailContent
  });
};

/**
 * Send error notification email (for admin)
 * @param {Object} error - Error details
 * @param {string} orderId - Related order ID
 * @returns {Promise<Object>} Send result
 */
const sendErrorNotification = async (error, orderId = null) => {
  const emailContent = `
    <h2>System Error Notification</h2>
    
    <p>An error occurred in the lead calling system:</p>
    
    <ul>
      <li><strong>Error:</strong> ${error.message}</li>
      <li><strong>Order ID:</strong> ${orderId || 'N/A'}</li>
      <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
      <li><strong>Stack:</strong></li>
    </ul>
    
    <pre>${error.stack || 'No stack trace available'}</pre>
    
    <p>Please investigate and resolve this issue.</p>
  `;

  // Send to admin email if configured
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
  
  if (adminEmail) {
    return await sendEmail({
      to: adminEmail,
      subject: `System Error - ${orderId ? `Order ${orderId}` : 'General'}`,
      html: emailContent
    });
  }

  return { success: false, error: 'No admin email configured' };
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendErrorNotification
};