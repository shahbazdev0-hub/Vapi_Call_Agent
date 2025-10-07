const csv = require('csv-parser');
const XLSX = require('xlsx');
const { validateLeads, normalizePhoneNumber } = require('./validation');

/**
 * Parse CSV file and extract leads
 * @param {Buffer} fileBuffer - CSV file buffer
 * @returns {Promise<Array>} Parsed leads array
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
        // Normalize column names (case-insensitive, handle spaces)
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '');
          normalizedRow[normalizedKey] = row[key]?.toString().trim() || '';
        });

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

        // Only add if at least name, phone, and company are present
        if (lead.name && lead.phone && lead.company) {
          // Normalize phone number
          try {
            lead.phone = normalizePhoneNumber(lead.phone);
            if (lead.phone) {
              leads.push(lead);
            }
          } catch (error) {
            console.warn('Phone normalization failed for:', lead.phone);
          }
        }
      })
      .on('end', () => {
        resolve(leads);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Parse Excel file and extract leads
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Array} Parsed leads array
 */
const parseExcel = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const leads = jsonData.map(row => {
      // Normalize column names
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '');
        normalizedRow[normalizedKey] = row[key]?.toString().trim() || '';
      });

      return {
        name: normalizedRow.name || normalizedRow.fullname || normalizedRow.contactname || '',
        phone: normalizedRow.phone || normalizedRow.phonenumber || normalizedRow.telephone || '',
        company: normalizedRow.company || normalizedRow.companyname || normalizedRow.organization || '',
        email: normalizedRow.email || normalizedRow.emailaddress || '',
        title: normalizedRow.title || normalizedRow.jobtitle || normalizedRow.position || '',
        address: normalizedRow.address || normalizedRow.street || normalizedRow.location || '',
        notes: normalizedRow.notes || normalizedRow.comments || normalizedRow.description || ''
      };
    }).filter(lead => {
      // Filter out empty rows and rows missing required fields
      if (lead.name && lead.phone && lead.company) {
        try {
          lead.phone = normalizePhoneNumber(lead.phone);
          return lead.phone !== '';
        } catch (error) {
          console.warn('Phone normalization failed for:', lead.phone);
          return false;
        }
      }
      return false;
    });

    return leads;
  } catch (error) {
    throw new Error(`Excel parsing error: ${error.message}`);
  }
};

/**
 * Parse spreadsheet file (CSV or Excel)
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} Parse result with leads and validation
 */
const parseSpreadsheet = async (file) => {
  try {
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

    if (!leads || leads.length === 0) {
      return {
        success: false,
        error: 'No valid leads found in the spreadsheet. Please ensure the file contains Name, Phone, and Company columns with valid data.',
        leads: [],
        errors: []
      };
    }

    // Validate leads
    const validation = validateLeads(leads);

    return {
      success: validation.valid || validation.leads.length > 0,
      leads: validation.leads,
      errors: validation.errors,
      totalRows: leads.length,
      validRows: validation.leads.length
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
 * Generate sample CSV template
 * @returns {string} CSV content
 */
const generateSampleCSV = () => {
  const headers = 'Name,Phone,Company,Email,Title,Address,Notes';
  const sampleData = [
    'John Smith,+1234567890,Acme Corp,john@acme.com,Sales Manager,123 Main St,Interested in our services',
    'Jane Doe,+1987654321,Tech Solutions,jane@tech.com,CEO,456 Oak Ave,Previous customer',
    'Bob Johnson,+1555123456,Global Inc,bob@global.com,VP Marketing,789 Pine Rd,Hot lead'
  ];
  
  return [headers, ...sampleData].join('\n');
};

/**
 * Generate sample Excel template
 * @returns {Buffer} Excel file buffer
 */
const generateSampleExcel = () => {
  const headers = ['Name', 'Phone', 'Company', 'Email', 'Title', 'Address', 'Notes'];
  const sampleData = [
    ['John Smith', '+1234567890', 'Acme Corp', 'john@acme.com', 'Sales Manager', '123 Main St', 'Interested in our services'],
    ['Jane Doe', '+1987654321', 'Tech Solutions', 'jane@tech.com', 'CEO', '456 Oak Ave', 'Previous customer'],
    ['Bob Johnson', '+1555123456', 'Global Inc', 'bob@global.com', 'VP Marketing', '789 Pine Rd', 'Hot lead']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  
  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Name
    { wch: 15 }, // Phone
    { wch: 20 }, // Company
    { wch: 25 }, // Email
    { wch: 15 }, // Title
    { wch: 20 }, // Address
    { wch: 30 }  // Notes
  ];
  worksheet['!cols'] = columnWidths;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  parseSpreadsheet,
  generateSampleCSV,
  generateSampleExcel
};