// Create this file as: server/utils/validation.js

const Joi = require('joi');

/**
 * Normalize phone number to E.164 format - INTERNATIONAL SUPPORT
 * @param {string} phone - Phone number in any format
 * @returns {string|null} - Normalized phone number or null if invalid
 */
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.toString().replace(/[^\d]/g, '');
  
  console.log('📞 Normalizing phone:', phone, '-> cleaned:', cleaned);
  
  // Handle Pakistani numbers specifically
  if (cleaned.startsWith('92') || (cleaned.startsWith('0') && cleaned.length === 11)) {
    // Pakistani number formats:
    // +923091453950 -> 923091453950
    // 92 309 1453950 -> 923091453950
    // 0309-1453950 -> 03091453950 -> 923091453950
    
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      // Local Pakistani format: 03091453950 -> 923091453950
      cleaned = '92' + cleaned.substring(1);
    } else if (cleaned.startsWith('92') && cleaned.length === 12) {
      // Already in correct format: 923091453950
      // Keep as is
    } else if (cleaned.startsWith('92') && cleaned.length === 13) {
      // Sometimes Pakistani numbers have extra digits, trim to 12
      cleaned = cleaned.substring(0, 12);
    } else {
      console.log('❌ Invalid Pakistani number format:', cleaned);
      return null;
    }
  }
  // Handle US numbers
  else if (cleaned.length === 10) {
    // US number without country code: 1234567890 -> +11234567890
    cleaned = '1' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US number with country code: 11234567890 -> keep as is
    // cleaned is already correct
  }
  // Handle other international numbers
  else if (cleaned.length >= 10 && cleaned.length <= 15) {
    // International number - assume it's already in correct format
    // Common country codes: 44 (UK), 91 (India), 33 (France), 49 (Germany), etc.
    const knownCountryCodes = ['44', '91', '33', '49', '34', '39', '86', '81', '61', '65', '82', '84'];
    const hasKnownCountryCode = knownCountryCodes.some(code => cleaned.startsWith(code));
    
    if (hasKnownCountryCode || cleaned.length >= 11) {
      // Keep as is for known international codes or if long enough
    } else if (cleaned.length < 10) {
      console.log('❌ Phone number too short:', cleaned);
      return null;
    }
  } else {
    console.log('❌ Invalid phone number length:', cleaned);
    return null;
  }
  
  // Add + prefix for E.164 format
  const normalized = '+' + cleaned;
  
  // Validate E.164 format (more flexible for international)
  const e164Regex = /^\+[1-9]\d{7,14}$/; // 8-15 digits total
  if (!e164Regex.test(normalized)) {
    console.log('❌ Invalid E.164 format:', normalized);
    return null;
  }
  
  console.log('✅ Normalized phone:', normalized);
  return normalized;
};

/**
 * Validate phone number format
 */
const validatePhoneNumber = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  return normalized !== null;
};

// Updated lead validation schema with international phone validation
const leadSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().custom((value, helpers) => {
    const normalized = normalizePhoneNumber(value);
    if (!normalized) {
      return helpers.error('any.invalid');
    }
    return normalized; // Return normalized value
  }).required().messages({
    'any.invalid': 'Phone number must be a valid international format (e.g., +923091453950, +12345678901, +447911123456)'
  }),
  company: Joi.string().min(2).max(200).required(),
  email: Joi.string().email().optional().allow(''),
  title: Joi.string().max(100).optional().allow(''),
  address: Joi.string().max(500).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow('')
});

// Order validation schema with international phone support
const orderSchema = Joi.object({
  customerName: Joi.string().min(2).max(100).required(),
  customerEmail: Joi.string().email().required(),
  customerPhone: Joi.string().custom((value, helpers) => {
    if (!value) return value; // Allow empty
    const normalized = normalizePhoneNumber(value);
    if (!normalized) {
      return helpers.error('any.invalid');
    }
    return normalized;
  }).optional().allow('').messages({
    'any.invalid': 'Phone number must be a valid international format'
  }),
  company: Joi.string().allow('').optional(),
  callStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
  callEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('18:00'),
  timezone: Joi.string().default('Asia/Karachi'), // Pakistan timezone
  maxRetries: Joi.number().min(0).max(5).default(2),
  customScript: Joi.string().allow('').optional()
});

// File upload validation
const validateFileUpload = (file) => {
  const allowedTypes = ['.csv', '.xlsx', '.xls'];
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB default
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  
  if (!allowedTypes.includes(fileExtension)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB` 
    };
  }
  
  return { valid: true };
};

// Validate leads array with international phone number normalization
const validateLeads = (leads) => {
  const errors = [];
  const validLeads = [];
  
  if (!Array.isArray(leads)) {
    return {
      valid: false,
      leads: [],
      errors: [{ row: 0, errors: ['Invalid data format'] }]
    };
  }
  
  leads.forEach((lead, index) => {
    const { error, value } = leadSchema.validate(lead, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      errors.push({
        row: index + 1,
        errors: error.details.map(detail => detail.message),
        originalPhone: lead.phone,
        leadName: lead.name
      });
      console.log(`❌ Lead ${index + 1} (${lead.name}) validation failed:`, lead.phone, error.details.map(d => d.message));
    } else {
      validLeads.push(value);
      console.log(`✅ Lead ${index + 1} (${value.name}) validated:`, lead.phone, '->', value.phone);
    }
  });
  
  return {
    valid: errors.length === 0,
    leads: validLeads,
    errors
  };
};

/**
 * Test phone number normalization - for debugging
 */
function testPhoneNormalization() {
  const testNumbers = [
    '+923091453950',    // Your number in E.164
    '92 309 1453950',   // Your number with spaces
    '0309-1453950',     // Local Pakistani format
    '03091453950',      // Local without dash
    '+12345678901',     // US number
    '(555) 123-4567',   // US with parentheses
    '+447911123456',    // UK number
    '+919876543210',    // Indian number
    '1234567890',       // US without country code
    'invalid',          // Invalid
    '123'               // Too short
  ];

  console.log('\n🧪 Testing phone number normalization:');
  console.log('='.repeat(50));
  testNumbers.forEach(phone => {
    const result = normalizePhoneNumber(phone);
    const status = result ? '✅' : '❌';
    console.log(`${status} ${phone.padEnd(20)} -> ${result || 'INVALID'}`);
  });
  console.log('='.repeat(50));
}

module.exports = {
  leadSchema,
  orderSchema,
  validateFileUpload,
  validateLeads,
  validatePhoneNumber,
  normalizePhoneNumber,
  testPhoneNormalization
};

// Auto-test when file is run directly
if (require.main === module) {
  testPhoneNormalization();
}