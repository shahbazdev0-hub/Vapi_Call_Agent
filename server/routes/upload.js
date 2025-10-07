const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const { supabase, STORAGE_BUCKETS, TABLES } = require('../config/supabase');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  }
});

/**
 * Validate file upload
 */
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

/**
 * Parse CSV file
 */
const parseCSV = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const leads = [];
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    bufferStream
      .pipe(csv())
      .on('data', (row) => {
        console.log('CSV Row:', row);
        
        // Normalize column names (case-insensitive, handle spaces)
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '');
          normalizedRow[normalizedKey] = (row[key] || '').toString().trim();
        });

        console.log('Normalized row:', normalizedRow);

        // Map common column variations to standard fields
        const lead = {
          name: normalizedRow.name || normalizedRow.fullname || normalizedRow.contactname || '',
          phone: normalizedRow.phone || normalizedRow.phonenumber || normalizedRow.telephone || '',
          company: normalizedRow.company || normalizedRow.companyname || normalizedRow.organization || '',
          email: normalizedRow.email || normalizedRow.emailaddress || '',
          title: normalizedRow.title || normalizedRow.jobtitle || normalizedRow.position || '',
          address: normalizedRow.address || normalizedRow.street || normalizedRow.location || '',
          notes: normalizedRow.notes || normalizedRow.comments || normalizedRow.description || ''
        };

        console.log('Mapped lead:', lead);

        // Only add if at least name, phone, and company are present
        if (lead.name && lead.phone && lead.company) {
          // Basic phone number cleanup
          lead.phone = lead.phone.replace(/[^\d+]/g, '');
          if (lead.phone && !lead.phone.startsWith('+')) {
            lead.phone = '+1' + lead.phone.replace(/^\+?1?/, '');
          }
          
          if (lead.phone.length >= 10) {
            leads.push(lead);
            console.log('Added lead:', lead.name);
          }
        } else {
          console.log('Skipped lead - missing required fields:', { name: lead.name, phone: lead.phone, company: lead.company });
        }
      })
      .on('end', () => {
        console.log('CSV parsing complete. Total leads:', leads.length);
        resolve(leads);
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      });
  });
};

/**
 * Parse Excel file
 */
const parseExcel = (fileBuffer) => {
  try {
    console.log('Parsing Excel file...');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log('Excel data:', jsonData);
    
    const leads = [];
    
    jsonData.forEach((row, index) => {
      console.log(`Processing Excel row ${index + 1}:`, row);
      
      // Normalize column names
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '');
        normalizedRow[normalizedKey] = (row[key] || '').toString().trim();
      });

      const lead = {
        name: normalizedRow.name || normalizedRow.fullname || normalizedRow.contactname || '',
        phone: normalizedRow.phone || normalizedRow.phonenumber || normalizedRow.telephone || '',
        company: normalizedRow.company || normalizedRow.companyname || normalizedRow.organization || '',
        email: normalizedRow.email || normalizedRow.emailaddress || '',
        title: normalizedRow.title || normalizedRow.jobtitle || normalizedRow.position || '',
        address: normalizedRow.address || normalizedRow.street || normalizedRow.location || '',
        notes: normalizedRow.notes || normalizedRow.comments || normalizedRow.description || ''
      };

      console.log('Mapped Excel lead:', lead);

      // Only add if at least name, phone, and company are present
      if (lead.name && lead.phone && lead.company) {
        // Basic phone number cleanup
        lead.phone = lead.phone.replace(/[^\d+]/g, '');
        if (lead.phone && !lead.phone.startsWith('+')) {
          lead.phone = '+1' + lead.phone.replace(/^\+?1?/, '');
        }
        
        if (lead.phone.length >= 10) {
          leads.push(lead);
          console.log('Added Excel lead:', lead.name);
        }
      } else {
        console.log('Skipped Excel lead - missing required fields:', { name: lead.name, phone: lead.phone, company: lead.company });
      }
    });

    console.log('Excel parsing complete. Total leads:', leads.length);
    return leads;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Excel parsing error: ${error.message}`);
  }
};

/**
 * Parse spreadsheet file
 */
const parseSpreadsheet = async (file) => {
  try {
    console.log('Parsing spreadsheet:', file.originalname);
    
    if (!file || !file.buffer) {
      return {
        success: false,
        error: 'No file provided or file buffer is empty',
        leads: [],
        errors: []
      };
    }

    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    let leads = [];

    if (fileExtension === '.csv') {
      leads = await parseCSV(file.buffer);
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      leads = parseExcel(file.buffer);
    } else {
      throw new Error('Unsupported file format. Please use CSV, XLS, or XLSX files.');
    }

    console.log('Parsed leads:', leads);

    if (!leads || leads.length === 0) {
      return {
        success: false,
        error: 'No valid leads found in the spreadsheet. Please ensure the file contains Name, Phone, and Company columns with valid data.',
        leads: [],
        errors: [],
        debug: {
          fileExtension,
          fileSize: file.size,
          fileName: file.originalname
        }
      };
    }

    return {
      success: true,
      leads: leads,
      errors: [],
      totalRows: leads.length,
      validRows: leads.length
    };

  } catch (error) {
    console.error('Spreadsheet parsing error:', error);
    return {
      success: false,
      error: error.message,
      leads: [],
      errors: []
    };
  }
};

/**
 * Upload spreadsheet and create leads
 * POST /api/upload/spreadsheet/:orderId
 */
router.post('/spreadsheet/:orderId', upload.single('spreadsheet'), async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('Upload request for order:', orderId);
    console.log('File:', req.file ? req.file.originalname : 'No file');

    // Validate order exists
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Validate file upload
    const fileValidation = validateFileUpload(req.file);
    if (!fileValidation.valid) {
      console.error('File validation failed:', fileValidation.error);
      return res.status(400).json({
        error: fileValidation.error
      });
    }

    // Parse spreadsheet
    console.log('Starting spreadsheet parsing...');
    const parseResult = await parseSpreadsheet(req.file);
    
    console.log('Parse result:', parseResult);
    
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error,
        validationErrors: parseResult.errors,
        debug: parseResult.debug
      });
    }

    // Upload file to Supabase Storage (optional - comment out if storage not set up)
    // const fileExtension = req.file.originalname.substring(req.file.originalname.lastIndexOf('.'));
    // const fileName = `${orderId}_${Date.now()}${fileExtension}`;

    // Create leads in database
    console.log('Creating leads in database...');
    const leads = parseResult.leads.map(lead => ({
      id: uuidv4(),
      order_id: orderId,
      name: lead.name,
      phone: lead.phone,
      company: lead.company,
      email: lead.email || null,
      title: lead.title || null,
      address: lead.address || null,
      notes: lead.notes || null,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    console.log('Inserting leads:', leads.length);
    const { data: leadsData, error: leadsError } = await supabase
      .from(TABLES.LEADS)
      .insert(leads)
      .select();

    if (leadsError) {
      console.error('Leads creation error:', leadsError);
      return res.status(500).json({
        error: 'Failed to create leads',
        message: leadsError.message
      });
    }

    console.log('Leads created successfully:', leadsData.length);

    // Update order status
    const { error: updateError } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: 'processing',
        total_leads: leads.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
    }

    res.status(201).json({
      success: true,
      message: 'Spreadsheet uploaded and leads created successfully',
      data: {
        orderId,
        totalLeads: leads.length,
        validLeads: leads.length,
        validationErrors: []
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Download sample CSV template
 * GET /api/upload/template/csv
 */
router.get('/template/csv', async (req, res) => {
  try {
    const csvContent = 'Name,Phone,Company,Email,Title,Address,Notes\n' +
      'John Smith,+1234567890,Acme Corp,john@acme.com,Sales Manager,123 Main St,Interested in our services\n' +
      'Jane Doe,+1987654321,Tech Solutions,jane@tech.com,CEO,456 Oak Ave,Previous customer\n' +
      'Bob Johnson,+1555123456,Global Inc,bob@global.com,VP Marketing,789 Pine Rd,Hot lead';
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_template.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      error: 'Failed to generate template'
    });
  }
});

/**
 * Download sample Excel template
 * GET /api/upload/template/excel
 */
router.get('/template/excel', async (req, res) => {
  try {
    const headers = ['Name', 'Phone', 'Company', 'Email', 'Title', 'Address', 'Notes'];
    const sampleData = [
      ['John Smith', '+1234567890', 'Acme Corp', 'john@acme.com', 'Sales Manager', '123 Main St', 'Interested in our services'],
      ['Jane Doe', '+1987654321', 'Tech Solutions', 'jane@tech.com', 'CEO', '456 Oak Ave', 'Previous customer'],
      ['Bob Johnson', '+1555123456', 'Global Inc', 'bob@global.com', 'VP Marketing', '789 Pine Rd', 'Hot lead']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_template.xlsx"');
    res.send(excelBuffer);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      error: 'Failed to generate template'
    });
  }
});

module.exports = router;