// Enhanced reports.js - Complete Call Report System
// Replace your server/routes/reports.js with this:

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const { supabase, STORAGE_BUCKETS, TABLES } = require('../config/supabase');
const { sendEmail } = require('../utils/email');

const router = express.Router();


// ADD THESE ROUTES TO THE TOP OF YOUR server/routes/reports.js FILE
// Place them BEFORE your existing routes

/**
 * Basic report endpoint (fallback)
 * GET /api/reports/:orderId
 */
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('📊 Fetching basic report for order:', orderId);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Get calls with lead information
    const { data: calls, error: callsError } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads(name, phone, company, email)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (callsError) {
      console.error('Get calls error:', callsError);
    }

    // Calculate basic statistics
    const callsArray = calls || [];
    const stats = {
      totalCalls: callsArray.length,
      completedCalls: callsArray.filter(call => call.status === 'completed').length,
      failedCalls: callsArray.filter(call => call.status === 'failed').length,
      verifiedCalls: callsArray.filter(call => 
        call.status === 'completed' && 
        call.transcript && 
        call.transcript.length > 50
      ).length
    };

    stats.successRate = stats.totalCalls > 0 ? 
      Math.round((stats.completedCalls / stats.totalCalls) * 100) : 0;

    res.json({
      success: true,
      data: {
        orderId,
        order,
        calls: callsArray,
        stats
      }
    });

  } catch (error) {
    console.error('Get basic report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

**
 * Generate Excel Report with Multiple Sheets
 * GET /api/reports/download/:orderId
 */
router.get('/download/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Fetch all leads for this order
    const { data: leads, error: leadsError } = await supabase
      .from(TABLES.LEADS)
      .select('*')
      .eq('order_id', orderId);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    // Fetch all calls for this order
    const { data: calls, error: callsError } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads (*)
      `)
      .eq('order_id', orderId);

    if (callsError) {
      console.error('Error fetching calls:', callsError);
    }

    // Create a map of lead_id to call data
    const callMap = {};
    if (calls && calls.length > 0) {
      calls.forEach(call => {
        callMap[call.lead_id] = call;
      });
    }

    // Categorize leads
    const mainList = [];
    const priority = []; // high-pickup: people who picked up the phone
    const verifiedContact = []; // people who picked up + said their name in voicemail
    const dnc = []; // bad numbers/dead lines
    const standard = []; // everyone not in other 3 categories

    leads.forEach(lead => {
      const call = callMap[lead.id];
      
      const leadData = {
        number: lead.phone,
        name: lead.name,
        business: lead.company,
        mobileType: '',
        phoneCompany: '',
        phoneLocation: '',
        highPickup: '',
        fakeNumber: '',
        verifiedContact: ''
      };

      mainList.push(leadData);

      if (call) {
        // DNC: failed calls (bad numbers/dead lines)
        if (call.status === 'failed' || call.status === 'no-answer' || call.status === 'busy') {
          dnc.push(leadData);
        }
        // Priority: completed calls (people who picked up)
        else if (call.status === 'completed' && call.duration && parseInt(call.duration) > 0) {
          leadData.highPickup = 'Yes';
          priority.push(leadData);

          // Verified Contact: completed calls with transcript containing name
          if (call.transcript && call.transcript.toLowerCase().includes(lead.name.toLowerCase())) {
            leadData.verifiedContact = 'Yes';
            verifiedContact.push(leadData);
          }
        }
      }
    });

    // Standard: everyone not in other 3 categories
    leads.forEach(lead => {
      const call = callMap[lead.id];
      const isInPriority = priority.some(p => p.number === lead.phone);
      const isInVerified = verifiedContact.some(v => v.number === lead.phone);
      const isInDNC = dnc.some(d => d.number === lead.phone);

      if (!isInPriority && !isInVerified && !isInDNC) {
        standard.push({
          number: lead.phone,
          name: lead.name,
          business: lead.company,
          mobileType: '',
          phoneCompany: '',
          phoneLocation: '',
          highPickup: '',
          fakeNumber: '',
          verifiedContact: ''
        });
      }
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // 1. YIELD SHEET
    const yieldSheet = workbook.addWorksheet('Yield');
    
    // Set column widths
    yieldSheet.getColumn('B').width = 25;
    yieldSheet.getColumn('C').width = 10;
    yieldSheet.getColumn('D').width = 10;
    yieldSheet.getColumn('E').width = 60;

    // Add headers
    yieldSheet.getCell('C1').value = '#';
    yieldSheet.getCell('D1').value = '%';
    
    // Add data rows
    const totalLeads = mainList.length;
    
    yieldSheet.getCell('B2').value = 'Main List';
    yieldSheet.getCell('C2').value = totalLeads;
    yieldSheet.getCell('D2').value = '100%';
    
    yieldSheet.getCell('B3').value = 'Priority (high-pickup)';
    yieldSheet.getCell('C3').value = priority.length;
    yieldSheet.getCell('D3').value = totalLeads > 0 ? ((priority.length / totalLeads) * 100).toFixed(1) + '%' : '0%';
    yieldSheet.getCell('E3').value = 'people who picked up the phone';
    
    yieldSheet.getCell('B4').value = 'Verified Contact';
    yieldSheet.getCell('C4').value = verifiedContact.length;
    yieldSheet.getCell('D4').value = totalLeads > 0 ? ((verifiedContact.length / totalLeads) * 100).toFixed(1) + '%' : '0%';
    yieldSheet.getCell('E4').value = 'people who picked up the phone + people who said their name in the voicemail';
    
    yieldSheet.getCell('B5').value = 'DNC';
    yieldSheet.getCell('C5').value = dnc.length;
    yieldSheet.getCell('D5').value = totalLeads > 0 ? ((dnc.length / totalLeads) * 100).toFixed(1) + '%' : '0%';
    yieldSheet.getCell('E5').value = 'bad numbers/dead lines';
    
    yieldSheet.getCell('B6').value = 'Standard';
    yieldSheet.getCell('C6').value = standard.length;
    yieldSheet.getCell('D6').value = totalLeads > 0 ? ((standard.length / totalLeads) * 100).toFixed(1) + '%' : '0%';
    yieldSheet.getCell('E6').value = 'everyone not in the other 3 categories';

    // Style the Yield sheet
    ['C1', 'D1'].forEach(cell => {
      yieldSheet.getCell(cell).font = { bold: true };
      yieldSheet.getCell(cell).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
    });

    ['B2', 'B3', 'B4', 'B5', 'B6'].forEach(cell => {
      yieldSheet.getCell(cell).font = { bold: true };
    });

    // Highlight rows with color
    ['C2', 'D2', 'E2'].forEach(cell => {
      yieldSheet.getCell(cell).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFDE9D9' }
      };
    });

    ['C3', 'D3', 'E3', 'C4', 'D4', 'E4', 'C5', 'D5', 'E5', 'C6', 'D6', 'E6'].forEach(cell => {
      yieldSheet.getCell(cell).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFDE9D9' }
      };
    });

    // 2. MAIN LIST SHEET
    const mainListSheet = workbook.addWorksheet('Main List');
    mainListSheet.columns = [
      { header: 'Number', key: 'number', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Business', key: 'business', width: 25 },
      { header: 'Mobile Type', key: 'mobileType', width: 15 },
      { header: 'Phone Company', key: 'phoneCompany', width: 20 },
      { header: 'Phone Location', key: 'phoneLocation', width: 20 },
      { header: 'High Pickup', key: 'highPickup', width: 12 },
      { header: 'Fake (invalid) Number', key: 'fakeNumber', width: 20 },
      { header: 'Verified Contact', key: 'verifiedContact', width: 18 }
    ];
    mainList.forEach(lead => mainListSheet.addRow(lead));

    // 3. PRIORITY SHEET
    const prioritySheet = workbook.addWorksheet('Priority');
    prioritySheet.columns = [
      { header: 'Number', key: 'number', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Business', key: 'business', width: 25 },
      { header: 'Mobile Type', key: 'mobileType', width: 15 },
      { header: 'Phone Company', key: 'phoneCompany', width: 20 },
      { header: 'Phone Location', key: 'phoneLocation', width: 20 },
      { header: 'Fake (invalid) Number', key: 'fakeNumber', width: 20 },
      { header: 'Verified Contact', key: 'verifiedContact', width: 18 },
      { header: 'High Pickup', key: 'highPickup', width: 12 }
    ];
    priority.forEach(lead => prioritySheet.addRow(lead));

    // 4. VERIFIED CONTACT SHEET
    const verifiedSheet = workbook.addWorksheet('Verified Contact');
    verifiedSheet.columns = [
      { header: 'Number', key: 'number', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Business', key: 'business', width: 25 },
      { header: 'Mobile Type', key: 'mobileType', width: 15 },
      { header: 'Phone Company', key: 'phoneCompany', width: 20 },
      { header: 'Phone Location', key: 'phoneLocation', width: 20 },
      { header: 'Fake (invalid) Number', key: 'fakeNumber', width: 20 },
      { header: 'Verified Contact', key: 'verifiedContact', width: 18 },
      { header: 'High Pickup', key: 'highPickup', width: 12 }
    ];
    verifiedContact.forEach(lead => verifiedSheet.addRow(lead));

    // 5. DNC SHEET
    const dncSheet = workbook.addWorksheet('DNC');
    dncSheet.columns = [
      { header: 'Number', key: 'number', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Business', key: 'business', width: 25 }
    ];
    dnc.forEach(lead => dncSheet.addRow(lead));

    // Style all sheet headers
    [mainListSheet, prioritySheet, verifiedSheet, dncSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
    });

    // Generate Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Order_Report_${orderId}_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

/**
 * Test endpoint to verify everything is working
 * GET /api/reports/test/:orderId
 */
router.get('/test/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🧪 Testing reports for order:', orderId);

    // Check order
    const { data: order } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    // Check calls
    const { data: calls } = await supabase
      .from(TABLES.CALLS)
      .select('*')
      .eq('order_id', orderId);

    res.json({
      success: true,
      test_results: {
        orderId,
        order_found: !!order,
        calls_count: calls?.length || 0,
        endpoints_available: [
          `GET /api/reports/test/${orderId}`,
          `GET /api/reports/${orderId}`,
          `GET /api/reports/download/${orderId}`,
          `GET /api/reports/download/${orderId}/excel`,
          `POST /api/reports/generate/${orderId}`
        ],
        sample_call: calls?.[0] || null
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
/**
 * Generate comprehensive call report with all conversations
 * POST /api/reports/generate/:orderId
 */
router.post('/generate/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('📊 Generating comprehensive call report for order:', orderId);

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Generate comprehensive report data
    const reportData = await generateComprehensiveReport(orderId);

    if (!reportData.success) {
      return res.status(500).json({
        error: 'Failed to generate report data',
        message: reportData.error
      });
    }

    // Create multiple report formats
    const reports = await createAllReportFormats(reportData.data, orderId);

    // Upload reports to Supabase Storage
    const uploadResults = await uploadReportsToStorage(reports, orderId);

    // Save report record in database
    const reportRecord = await saveReportRecord(orderId, reportData.data, uploadResults);

    // Send email with all reports
    const emailResult = await sendComprehensiveReportEmail(order, reportData.data, reports);

    // Update order status
    await supabase
      .from(TABLES.ORDERS)
      .update({
        status: 'completed',
        report_generated: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    res.json({
      success: true,
      message: 'Comprehensive call report generated and sent successfully! 📊',
      data: {
        reportId: reportRecord.id,
        summary: reportData.data.summary,
        emailSent: emailResult.success,
        reportsGenerated: Object.keys(reports),
        conversationCount: reportData.data.detailedCalls.length
      }
    });

  } catch (error) {
    console.error('❌ Generate report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get detailed call transcript for a specific call
 * GET /api/reports/call/:callId/transcript
 */
router.get('/call/:callId/transcript', async (req, res) => {
  try {
    const { callId } = req.params;

    const { data: call, error } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads(name, phone, company, email),
        orders(customer_name, customer_email)
      `)
      .eq('id', callId)
      .single();

    if (error || !call) {
      return res.status(404).json({
        error: 'Call not found'
      });
    }

    // Parse transcript if it's JSON
    let parsedTranscript = call.transcript;
    try {
      if (typeof call.transcript === 'string' && call.transcript.startsWith('[')) {
        parsedTranscript = JSON.parse(call.transcript);
      }
    } catch (e) {
      // Keep as string if parsing fails
    }

    res.json({
      success: true,
      data: {
        call: {
          id: call.id,
          status: call.status,
          duration: call.duration,
          startedAt: call.started_at,
          endedAt: call.ended_at,
          phoneNumber: call.phone_number,
          vapiCallId: call.vapi_call_id
        },
        lead: call.leads,
        order: call.orders,
        transcript: parsedTranscript,
        rawTranscript: call.transcript
      }
    });

  } catch (error) {
    console.error('❌ Get transcript error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get all call reports for an order
 * GET /api/reports/order/:orderId/all
 */
router.get('/order/:orderId/all', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get all calls with full details
    const { data: calls, error } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads(name, phone, company, email, title, address),
        orders(customer_name, customer_email)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch calls',
        message: error.message
      });
    }

    // Process and categorize calls
    const categorizedCalls = categorizeCalls(calls || []);
    const summary = generateCallSummary(calls || []);

    res.json({
      success: true,
      data: {
        orderId,
        summary,
        categorizedCalls,
        allCalls: calls || [],
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Get all reports error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Download specific report format
 * GET /api/reports/download/:orderId/:format
 */
router.get('/download/:orderId/:format', async (req, res) => {
  try {
    const { orderId, format } = req.params;

    // Generate report data
    const reportData = await generateComprehensiveReport(orderId);
    if (!reportData.success) {
      return res.status(500).json({ error: 'Failed to generate report' });
    }

    let fileBuffer;
    let fileName;
    let contentType;

    switch (format) {
      case 'excel':
        fileBuffer = await createExcelReport(reportData.data);
        fileName = `comprehensive_call_report_${orderId}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      
      case 'conversations':
        fileBuffer = await createConversationsReport(reportData.data);
        fileName = `conversations_report_${orderId}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      
      case 'summary':
        fileBuffer = await createSummaryReport(reportData.data);
        fileName = `summary_report_${orderId}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid format' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error('❌ Download report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Generate comprehensive report data with ALL conversations
 */
async function generateComprehensiveReport(orderId) {
  try {
    console.log('📊 Generating comprehensive report data for order:', orderId);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      return { success: false, error: orderError.message };
    }

    // Get all leads for the order
    const { data: leads, error: leadsError } = await supabase
      .from(TABLES.LEADS)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (leadsError) {
      return { success: false, error: leadsError.message };
    }

    // Get all calls with detailed information
    const { data: calls, error: callsError } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads(name, phone, company, email, title, address)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (callsError) {
      return { success: false, error: callsError.message };
    }

    console.log(`📞 Found ${calls.length} calls with conversations`);

    // Process each call and extract conversation details
    const detailedCalls = await Promise.all(
      calls.map(async (call) => {
        const conversationAnalysis = analyzeConversation(call);
        return {
          ...call,
          conversationAnalysis,
          leadInfo: call.leads
        };
      })
    );

    // Categorize calls by status and conversation quality
    const categorizedCalls = categorizeCalls(detailedCalls);
    
    // Generate comprehensive summary
    const summary = generateCallSummary(detailedCalls);

    // Identify verified contacts (where transcript matches lead info)
    const verifiedContacts = identifyVerifiedContacts(detailedCalls);

    return {
      success: true,
      data: {
        orderId,
        order,
        leads: leads || [],
        detailedCalls,
        categorizedCalls,
        verifiedContacts,
        summary,
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Generate comprehensive report error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze individual conversation for insights
 */
function analyzeConversation(call) {
  const transcript = call.transcript || '';
  
  if (!transcript || transcript.length < 10) {
    return {
      hasConversation: false,
      wordCount: 0,
      duration: call.duration || 0,
      quality: 'no_conversation',
      keyPoints: [],
      sentiment: 'unknown'
    };
  }

  // Basic conversation analysis
  const wordCount = transcript.split(/\s+/).length;
  const hasGreeting = /hello|hi|good morning|good afternoon/i.test(transcript);
  const hasCompanyMention = call.leads?.company ? 
    new RegExp(call.leads.company.split(' ')[0], 'i').test(transcript) : false;
  const hasNameMention = call.leads?.name ? 
    new RegExp(call.leads.name.split(' ')[0], 'i').test(transcript) : false;

  // Determine conversation quality
  let quality = 'low';
  if (wordCount > 100 && call.duration > 60) quality = 'high';
  else if (wordCount > 50 && call.duration > 30) quality = 'medium';

  // Extract key points
  const keyPoints = [];
  if (hasGreeting) keyPoints.push('Professional greeting');
  if (hasCompanyMention) keyPoints.push('Company mentioned');
  if (hasNameMention) keyPoints.push('Name mentioned');
  if (/interested|yes|sure|okay/i.test(transcript)) keyPoints.push('Positive response');
  if (/not interested|no|busy|call back/i.test(transcript)) keyPoints.push('Negative response');

  // Basic sentiment analysis
  let sentiment = 'neutral';
  if (/great|excellent|interested|yes|sure/i.test(transcript)) sentiment = 'positive';
  else if (/no|not interested|busy|stop|remove/i.test(transcript)) sentiment = 'negative';

  return {
    hasConversation: true,
    wordCount,
    duration: call.duration || 0,
    quality,
    keyPoints,
    sentiment,
    hasGreeting,
    hasCompanyMention,
    hasNameMention,
    verificationScore: (hasNameMention ? 1 : 0) + (hasCompanyMention ? 1 : 0)
  };
}

/**
 * Categorize calls by status and quality
 */
function categorizeCalls(calls) {
  return {
    // By call status
    completed: calls.filter(call => call.status === 'completed'),
    failed: calls.filter(call => call.status === 'failed'),
    inProgress: calls.filter(call => call.status === 'in_progress'),
    
    // By conversation quality
    highQualityConversations: calls.filter(call => 
      call.conversationAnalysis?.quality === 'high'
    ),
    mediumQualityConversations: calls.filter(call => 
      call.conversationAnalysis?.quality === 'medium'
    ),
    lowQualityConversations: calls.filter(call => 
      call.conversationAnalysis?.quality === 'low'
    ),
    noConversation: calls.filter(call => 
      !call.conversationAnalysis?.hasConversation
    ),
    
    // By sentiment
    positiveResponses: calls.filter(call => 
      call.conversationAnalysis?.sentiment === 'positive'
    ),
    negativeResponses: calls.filter(call => 
      call.conversationAnalysis?.sentiment === 'negative'
    ),
    neutralResponses: calls.filter(call => 
      call.conversationAnalysis?.sentiment === 'neutral'
    ),
    
    // By verification status
    verifiedContacts: calls.filter(call => 
      call.conversationAnalysis?.verificationScore >= 1
    ),
    unverifiedContacts: calls.filter(call => 
      call.conversationAnalysis?.verificationScore === 0
    )
  };
}

/**
 * Generate comprehensive summary statistics
 */
function generateCallSummary(calls) {
  const total = calls.length;
  const completed = calls.filter(c => c.status === 'completed').length;
  const failed = calls.filter(c => c.status === 'failed').length;
  
  const withConversations = calls.filter(c => c.conversationAnalysis?.hasConversation).length;
  const highQuality = calls.filter(c => c.conversationAnalysis?.quality === 'high').length;
  const verified = calls.filter(c => c.conversationAnalysis?.verificationScore >= 1).length;
  
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
  const avgDuration = completed > 0 ? Math.round(totalDuration / completed) : 0;
  
  const totalWords = calls.reduce((sum, call) => 
    sum + (call.conversationAnalysis?.wordCount || 0), 0
  );

  return {
    totalCalls: total,
    completedCalls: completed,
    failedCalls: failed,
    successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    
    conversationStats: {
      callsWithConversations: withConversations,
      conversationRate: total > 0 ? Math.round((withConversations / total) * 100) : 0,
      highQualityConversations: highQuality,
      averageDuration: avgDuration,
      totalDuration,
      totalWords
    },
    
    verificationStats: {
      verifiedContacts: verified,
      verificationRate: withConversations > 0 ? Math.round((verified / withConversations) * 100) : 0,
      unverifiedContacts: withConversations - verified
    }
  };
}

/**
 * Identify verified contacts based on conversation content
 */
function identifyVerifiedContacts(calls) {
  return calls
    .filter(call => call.conversationAnalysis?.verificationScore >= 1)
    .map(call => ({
      leadName: call.leads?.name,
      company: call.leads?.company,
      phone: call.phone_number,
      verificationScore: call.conversationAnalysis.verificationScore,
      conversationQuality: call.conversationAnalysis.quality,
      keyPoints: call.conversationAnalysis.keyPoints,
      transcript: call.transcript?.substring(0, 200) + '...',
      callDuration: call.duration,
      callDate: call.created_at
    }));
}

/**
 * Create all report formats
 */
async function createAllReportFormats(reportData, orderId) {
  console.log('📝 Creating all report formats...');
  
  return {
    comprehensive: await createExcelReport(reportData),
    conversations: await createConversationsReport(reportData),
    summary: await createSummaryReport(reportData),
    transcripts: await createTranscriptsReport(reportData)
  };
}

/**
 * Create comprehensive Excel report with all conversations
 */
async function createExcelReport(reportData) {
  const workbook = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    ['COMPREHENSIVE CALL REPORT'],
    ['Generated:', reportData.generatedAt],
    ['Order ID:', reportData.orderId],
    [''],
    ['CALL STATISTICS'],
    ['Total Calls:', reportData.summary.totalCalls],
    ['Completed Calls:', reportData.summary.completedCalls],
    ['Failed Calls:', reportData.summary.failedCalls],
    ['Success Rate:', reportData.summary.successRate + '%'],
    [''],
    ['CONVERSATION STATISTICS'],
    ['Calls with Conversations:', reportData.summary.conversationStats.callsWithConversations],
    ['Conversation Rate:', reportData.summary.conversationStats.conversationRate + '%'],
    ['High Quality Conversations:', reportData.summary.conversationStats.highQualityConversations],
    ['Average Duration:', reportData.summary.conversationStats.averageDuration + ' seconds'],
    ['Total Words Spoken:', reportData.summary.conversationStats.totalWords],
    [''],
    ['VERIFICATION STATISTICS'],
    ['Verified Contacts:', reportData.summary.verificationStats.verifiedContacts],
    ['Verification Rate:', reportData.summary.verificationStats.verificationRate + '%']
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // 2. All Conversations Sheet
  if (reportData.detailedCalls.length > 0) {
    const conversationHeaders = [
      'Lead Name', 'Company', 'Phone', 'Call Status', 'Duration (s)', 
      'Conversation Quality', 'Word Count', 'Sentiment', 'Key Points', 
      'Has Greeting', 'Name Mentioned', 'Company Mentioned', 'Call Date', 'Full Transcript'
    ];
    
    const conversationData = reportData.detailedCalls.map(call => [
      call.leads?.name || 'Unknown',
      call.leads?.company || 'Unknown',
      call.phone_number,
      call.status,
      call.duration || 0,
      call.conversationAnalysis?.quality || 'unknown',
      call.conversationAnalysis?.wordCount || 0,
      call.conversationAnalysis?.sentiment || 'unknown',
      call.conversationAnalysis?.keyPoints?.join(', ') || 'None',
      call.conversationAnalysis?.hasGreeting ? 'Yes' : 'No',
      call.conversationAnalysis?.hasNameMention ? 'Yes' : 'No',
      call.conversationAnalysis?.hasCompanyMention ? 'Yes' : 'No',
      new Date(call.created_at).toLocaleString(),
      call.transcript || 'No transcript available'
    ]);

    const conversationSheet = XLSX.utils.aoa_to_sheet([conversationHeaders, ...conversationData]);
    XLSX.utils.book_append_sheet(workbook, conversationSheet, 'All Conversations');
  }

  // 3. Verified Contacts Sheet
  if (reportData.verifiedContacts.length > 0) {
    const verifiedHeaders = [
      'Lead Name', 'Company', 'Phone', 'Verification Score', 
      'Conversation Quality', 'Key Points', 'Call Duration', 'Transcript Preview'
    ];
    
    const verifiedData = reportData.verifiedContacts.map(contact => [
      contact.leadName,
      contact.company,
      contact.phone,
      contact.verificationScore,
      contact.conversationQuality,
      contact.keyPoints.join(', '),
      contact.callDuration + 's',
      contact.transcript
    ]);

    const verifiedSheet = XLSX.utils.aoa_to_sheet([verifiedHeaders, ...verifiedData]);
    XLSX.utils.book_append_sheet(workbook, verifiedSheet, 'Verified Contacts');
  }

  // 4. High Quality Conversations
  const highQualityCalls = reportData.categorizedCalls.highQualityConversations;
  if (highQualityCalls.length > 0) {
    const highQualityHeaders = [
      'Lead Name', 'Company', 'Phone', 'Duration', 'Word Count', 
      'Sentiment', 'Key Points', 'Full Transcript'
    ];
    
    const highQualityData = highQualityCalls.map(call => [
      call.leads?.name || 'Unknown',
      call.leads?.company || 'Unknown',
      call.phone_number,
      call.duration + 's',
      call.conversationAnalysis.wordCount,
      call.conversationAnalysis.sentiment,
      call.conversationAnalysis.keyPoints.join(', '),
      call.transcript || 'No transcript'
    ]);

    const highQualitySheet = XLSX.utils.aoa_to_sheet([highQualityHeaders, ...highQualityData]);
    XLSX.utils.book_append_sheet(workbook, highQualitySheet, 'High Quality Calls');
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Create focused conversations report
 */
async function createConversationsReport(reportData) {
  const workbook = XLSX.utils.book_new();

  // Conversations with transcript analysis
  const conversationsWithTranscripts = reportData.detailedCalls.filter(
    call => call.transcript && call.transcript.length > 20
  );

  if (conversationsWithTranscripts.length > 0) {
    const headers = [
      'Call ID', 'Lead Name', 'Company', 'Phone', 'Date', 'Duration', 
      'Quality', 'Sentiment', 'Word Count', 'Complete Conversation'
    ];
    
    const data = conversationsWithTranscripts.map(call => [
      call.id,
      call.leads?.name || 'Unknown',
      call.leads?.company || 'Unknown',
      call.phone_number,
      new Date(call.created_at).toLocaleString(),
      call.duration + 's',
      call.conversationAnalysis.quality,
      call.conversationAnalysis.sentiment,
      call.conversationAnalysis.wordCount,
      call.transcript
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'All Conversations');
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Create summary report
 */
async function createSummaryReport(reportData) {
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    ['CALL CAMPAIGN SUMMARY REPORT'],
    [''],
    ['Campaign Overview'],
    ['Order ID:', reportData.orderId],
    ['Customer:', reportData.order.customer_name],
    ['Email:', reportData.order.customer_email],
    ['Generated:', new Date(reportData.generatedAt).toLocaleString()],
    [''],
    ['Performance Metrics'],
    ['Total Leads:', reportData.leads.length],
    ['Total Calls Made:', reportData.summary.totalCalls],
    ['Successful Calls:', reportData.summary.completedCalls],
    ['Failed Calls:', reportData.summary.failedCalls],
    ['Success Rate:', reportData.summary.successRate + '%'],
    [''],
    ['Conversation Analysis'],
    ['Calls with Conversations:', reportData.summary.conversationStats.callsWithConversations],
    ['Conversation Rate:', reportData.summary.conversationStats.conversationRate + '%'],
    ['High Quality Conversations:', reportData.summary.conversationStats.highQualityConversations],
    ['Average Call Duration:', reportData.summary.conversationStats.averageDuration + ' seconds'],
    ['Total Talk Time:', Math.round(reportData.summary.conversationStats.totalDuration / 60) + ' minutes'],
    ['Total Words Exchanged:', reportData.summary.conversationStats.totalWords],
    [''],
    ['Contact Verification'],
    ['Verified Contacts:', reportData.summary.verificationStats.verifiedContacts],
    ['Verification Rate:', reportData.summary.verificationStats.verificationRate + '%'],
    ['Unverified Contacts:', reportData.summary.verificationStats.unverifiedContacts],
    [''],
    ['Sentiment Analysis'],
    ['Positive Responses:', reportData.categorizedCalls.positiveResponses.length],
    ['Negative Responses:', reportData.categorizedCalls.negativeResponses.length],
    ['Neutral Responses:', reportData.categorizedCalls.neutralResponses.length]
  ];

  const sheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Campaign Summary');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Create transcripts-only report
 */
async function createTranscriptsReport(reportData) {
  const workbook = XLSX.utils.book_new();

  const callsWithTranscripts = reportData.detailedCalls.filter(
    call => call.transcript && call.transcript.length > 10
  );

  if (callsWithTranscripts.length > 0) {
    const headers = ['Lead Name', 'Phone', 'Company', 'Call Date', 'Duration', 'Complete Transcript'];
    
    const data = callsWithTranscripts.map(call => [
      call.leads?.name || 'Unknown',
      call.phone_number,
      call.leads?.company || 'Unknown',
      new Date(call.created_at).toLocaleString(),
      call.duration + 's',
      call.transcript
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths for better readability
    sheet['!cols'] = [
      { wch: 20 }, // Lead Name
      { wch: 15 }, // Phone
      { wch: 25 }, // Company
      { wch: 20 }, // Date
      { wch: 10 }, // Duration
      { wch: 100 } // Transcript
    ];
    
    XLSX.utils.book_append_sheet(workbook, sheet, 'Call Transcripts');
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Upload reports to Supabase Storage
 */
async function uploadReportsToStorage(reports, orderId) {
  const uploadResults = {};
  
  for (const [reportType, buffer] of Object.entries(reports)) {
    try {
      const fileName = `${reportType}_report_${orderId}_${Date.now()}.xlsx`;
      
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.REPORTS)
        .upload(fileName, buffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          metadata: {
            orderId,
            reportType,
            generatedAt: new Date().toISOString()
          }
        });

      if (error) {
        console.error(`❌ Failed to upload ${reportType} report:`, error);
      } else {
        uploadResults[reportType] = {
          fileName,
          path: data.path,
          success: true
        };
        console.log(`✅ Uploaded ${reportType} report: ${fileName}`);
      }
    } catch (error) {
      console.error(`❌ Upload error for ${reportType}:`, error);
      uploadResults[reportType] = { success: false, error: error.message };
    }
  }
  
  return uploadResults;
}

/**
 * Save report record in database
 */
async function saveReportRecord(orderId, reportData, uploadResults) {
  const reportId = uuidv4();
  
  const { data, error } = await supabase
    .from(TABLES.REPORTS)
    .insert([{
      id: reportId,
      order_id: orderId,
      file_name: uploadResults.comprehensive?.fileName || 'comprehensive_report.xlsx',
      file_path: uploadResults.comprehensive?.path || '',
      total_leads: reportData.leads.length,
      completed_calls: reportData.summary.completedCalls,
      verified_contacts: reportData.summary.verificationStats.verifiedContacts,
      failed_calls: reportData.summary.failedCalls,
      status: 'completed',
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to save report record:', error);
    throw error;
  }

  return data;
}



// ADD THESE ENDPOINTS TO YOUR server/routes/reports.js FILE

/**
 * Get all call reports for an order - MISSING ENDPOINT
 * GET /api/reports/order/:orderId/all
 */
router.get('/order/:orderId/all', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🔍 Fetching all reports for order:', orderId);

    // Get all calls with full details - USING CORRECT COLUMN NAMES
    const { data: calls, error } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads(name, phone, company, email, title, address),
        orders(customer_name, customer_email)
      `)
      .eq('order_id', orderId)  // ✅ Using snake_case from your schema
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch calls:', error);
      return res.status(500).json({
        error: 'Failed to fetch calls',
        message: error.message
      });
    }

    console.log(`✅ Found ${calls?.length || 0} calls for order ${orderId}`);

    // Process and categorize calls
    const categorizedCalls = categorizeCalls(calls || []);
    const summary = generateCallSummary(calls || []);

    res.json({
      success: true,
      data: {
        orderId,
        summary,
        categorizedCalls,
        allCalls: calls || [],
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Get all reports error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get detailed call transcript for a specific call - MISSING ENDPOINT
 * GET /api/reports/call/:callId/transcript
 */
router.get('/call/:callId/transcript', async (req, res) => {
  try {
    const { callId } = req.params;
    console.log('📝 Fetching transcript for call:', callId);

    const { data: call, error } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads(name, phone, company, email),
        orders(customer_name, customer_email)
      `)
      .eq('id', callId)
      .single();

    if (error || !call) {
      console.error('❌ Call not found:', error);
      return res.status(404).json({
        error: 'Call not found'
      });
    }

    // Parse transcript if it's JSON
    let parsedTranscript = call.transcript;
    try {
      if (typeof call.transcript === 'string' && call.transcript.startsWith('[')) {
        parsedTranscript = JSON.parse(call.transcript);
      }
    } catch (e) {
      // Keep as string if parsing fails
      console.log('📝 Transcript is plain text, not JSON');
    }

    res.json({
      success: true,
      data: {
        call: {
          id: call.id,
          status: call.status,
          duration: call.duration,
          startedAt: call.started_at,  // ✅ Using snake_case from DB
          endedAt: call.ended_at,      // ✅ Using snake_case from DB
          phoneNumber: call.phone_number, // ✅ Using snake_case from DB
          vapiCallId: call.vapi_call_id    // ✅ Using snake_case from DB
        },
        lead: call.leads,
        order: call.orders,
        transcript: parsedTranscript,
        rawTranscript: call.transcript
      }
    });

  } catch (error) {
    console.error('❌ Get transcript error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Helper functions for the new endpoints
function categorizeCalls(calls) {
  return {
    // By call status
    completed: calls.filter(call => call.status === 'completed'),
    failed: calls.filter(call => call.status === 'failed'),
    inProgress: calls.filter(call => call.status === 'in_progress'),
    
    // By conversation quality (basic analysis)
    highQualityConversations: calls.filter(call => 
      call.transcript && call.transcript.length > 200 && call.duration > 60
    ),
    mediumQualityConversations: calls.filter(call => 
      call.transcript && call.transcript.length > 100 && call.duration > 30
    ),
    lowQualityConversations: calls.filter(call => 
      call.transcript && call.transcript.length > 20
    ),
    noConversation: calls.filter(call => 
      !call.transcript || call.transcript.length < 20
    ),
    
    // By basic sentiment (simple keyword detection)
    positiveResponses: calls.filter(call => 
      call.transcript && /yes|sure|interested|okay|sounds good/i.test(call.transcript)
    ),
    negativeResponses: calls.filter(call => 
      call.transcript && /no|not interested|busy|stop|remove/i.test(call.transcript)
    ),
    neutralResponses: calls.filter(call => 
      call.transcript && !/yes|no|interested|not interested|busy|stop/i.test(call.transcript)
    ),
    
    // By verification status (basic name/company matching)
    verifiedContacts: calls.filter(call => {
      if (!call.transcript || !call.leads) return false;
      const transcript = call.transcript.toLowerCase();
      const name = call.leads.name?.toLowerCase() || '';
      const company = call.leads.company?.toLowerCase() || '';
      
      const hasName = name && transcript.includes(name.split(' ')[0]);
      const hasCompany = company && transcript.includes(company.split(' ')[0]);
      
      return hasName || hasCompany;
    }),
    unverifiedContacts: calls.filter(call => {
      if (!call.transcript || !call.leads) return true;
      const transcript = call.transcript.toLowerCase();
      const name = call.leads.name?.toLowerCase() || '';
      const company = call.leads.company?.toLowerCase() || '';
      
      const hasName = name && transcript.includes(name.split(' ')[0]);
      const hasCompany = company && transcript.includes(company.split(' ')[0]);
      
      return !(hasName || hasCompany);
    })
  };
}

function generateCallSummary(calls) {
  const total = calls.length;
  const completed = calls.filter(c => c.status === 'completed').length;
  const failed = calls.filter(c => c.status === 'failed').length;
  
  const withTranscripts = calls.filter(c => c.transcript && c.transcript.length > 20).length;
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
  const avgDuration = completed > 0 ? Math.round(totalDuration / completed) : 0;
  
  // Basic verification (name or company mentioned)
  const verified = calls.filter(call => {
    if (!call.transcript || !call.leads) return false;
    const transcript = call.transcript.toLowerCase();
    const name = call.leads.name?.toLowerCase() || '';
    const company = call.leads.company?.toLowerCase() || '';
    
    const hasName = name && transcript.includes(name.split(' ')[0]);
    const hasCompany = company && transcript.includes(company.split(' ')[0]);
    
    return hasName || hasCompany;
  }).length;

  return {
    totalCalls: total,
    completedCalls: completed,
    failedCalls: failed,
    successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    
    conversationStats: {
      callsWithConversations: withTranscripts,
      conversationRate: total > 0 ? Math.round((withTranscripts / total) * 100) : 0,
      highQualityConversations: calls.filter(c => c.transcript?.length > 200 && c.duration > 60).length,
      averageDuration: avgDuration,
      totalDuration,
      totalWords: calls.reduce((sum, call) => {
        if (!call.transcript) return sum;
        return sum + call.transcript.split(/\s+/).length;
      }, 0)
    },
    
    verificationStats: {
      verifiedContacts: verified,
      verificationRate: withTranscripts > 0 ? Math.round((verified / withTranscripts) * 100) : 0,
      unverifiedContacts: withTranscripts - verified
    }
  };
}

/**
 * Send comprehensive email with all reports
 */
async function sendComprehensiveReportEmail(order, reportData, reports) {
  try {
    const emailContent = `
      <h2>📊 Comprehensive Call Report</h2>
      <p>Dear ${order.customer_name},</p>
      
      <p>Your complete call campaign report is ready! Here's a summary of all conversations and interactions:</p>
      
      <h3>📈 Campaign Performance</h3>
      <ul>
        <li><strong>Total Leads:</strong> ${reportData.leads.length}</li>
        <li><strong>Calls Made:</strong> ${reportData.summary.totalCalls}</li>
        <li><strong>Successful Calls:</strong> ${reportData.summary.completedCalls}</li>
        <li><strong>Success Rate:</strong> ${reportData.summary.successRate}%</li>
        <li><strong>Total Talk Time:</strong> ${Math.round(reportData.summary.conversationStats.totalDuration / 60)} minutes</li>
      </ul>
      
      <h3>💬 Conversation Analysis</h3>
      <ul>
        <li><strong>Calls with Conversations:</strong> ${reportData.summary.conversationStats.callsWithConversations}</li>
        <li><strong>Conversation Rate:</strong> ${reportData.summary.conversationStats.conversationRate}%</li>
        <li><strong>High Quality Conversations:</strong> ${reportData.summary.conversationStats.highQualityConversations}</li>
        <li><strong>Verified Contacts:</strong> ${reportData.summary.verificationStats.verifiedContacts}</li>
        <li><strong>Total Words Exchanged:</strong> ${reportData.summary.conversationStats.totalWords}</li>
      </ul>

      <h3>✅ Verified Contacts</h3>
      <p>We successfully verified ${reportData.verifiedContacts.length} contacts where the conversation included proper name and company verification:</p>
      <ul>
        ${reportData.verifiedContacts.slice(0, 5).map(contact => 
          `<li><strong>${contact.leadName}</strong> at ${contact.company} - ${contact.conversationQuality} quality conversation</li>`
        ).join('')}
        ${reportData.verifiedContacts.length > 5 ? `<li><em>...and ${reportData.verifiedContacts.length - 5} more verified contacts</em></li>` : ''}
      </ul>

      <h3>📑 Report Attachments</h3>
      <p>We've generated multiple detailed reports for you:</p>
      <ul>
        <li><strong>Comprehensive Report:</strong> Complete analysis with all data</li>
        <li><strong>Conversations Report:</strong> All conversations with full transcripts</li>
        <li><strong>Summary Report:</strong> Key metrics and performance overview</li>
        <li><strong>Transcripts Report:</strong> All call transcripts for review</li>
      </ul>

      <h3>🎯 Key Insights</h3>
      <ul>
        <li><strong>Most Responsive:</strong> ${reportData.categorizedCalls.positiveResponses.length} positive responses received</li>
        <li><strong>Average Call Duration:</strong> ${reportData.summary.conversationStats.averageDuration} seconds</li>
        <li><strong>Best Performance:</strong> ${Math.round((reportData.summary.verificationStats.verificationRate))}% verification rate</li>
      </ul>
      
      <p>All conversation transcripts are included in the detailed reports. You can review every interaction your prospects had with our AI system.</p>
      
      <p>Thank you for using our comprehensive call reporting service!</p>
      
      <hr>
      <p><small>This is an automated report. All conversations were recorded and analyzed for quality and verification purposes.</small></p>
    `;

    // Prepare attachments for all report types
    const attachments = [];
    
    if (reports.comprehensive) {
      attachments.push({
        filename: `Comprehensive_Call_Report_${order.customer_name.replace(/\s+/g, '_')}.xlsx`,
        content: reports.comprehensive,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    if (reports.conversations) {
      attachments.push({
        filename: `All_Conversations_${order.customer_name.replace(/\s+/g, '_')}.xlsx`,
        content: reports.conversations,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    if (reports.summary) {
      attachments.push({
        filename: `Campaign_Summary_${order.customer_name.replace(/\s+/g, '_')}.xlsx`,
        content: reports.summary,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    if (reports.transcripts) {
      attachments.push({
        filename: `Call_Transcripts_${order.customer_name.replace(/\s+/g, '_')}.xlsx`,
        content: reports.transcripts,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    const result = await sendEmail({
      to: order.customer_email,
      subject: `📊 Complete Call Report with All Conversations - Order ${order.id}`,
      html: emailContent,
      attachments
    });

    return { success: result.success, error: result.error };

  } catch (error) {
    console.error('❌ Send comprehensive report email error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = router;