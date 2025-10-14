const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const { supabase, TABLES } = require('../config/supabase');
const vapiClient = require('../config/vapi');
const router = express.Router();
const activeConnections = new Map();

/**
 * Real-time events endpoint using Server-Sent Events
 * GET /api/calls/events/:orderId
 */
router.get('/events/:orderId', (req, res) => {
  const { orderId } = req.params;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

  console.log(`📡 SSE connection established for order: ${orderId}`);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Real-time updates connected',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Store connection
  if (!activeConnections.has(orderId)) {
    activeConnections.set(orderId, new Set());
  }
  activeConnections.get(orderId).add(res);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 SSE connection closed for order: ${orderId}`);
    if (activeConnections.has(orderId)) {
      activeConnections.get(orderId).delete(res);
      if (activeConnections.get(orderId).size === 0) {
        activeConnections.delete(orderId);
      }
    }
  });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
    }
  }, 30000); // Every 30 seconds

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * Broadcast real-time notification to all connected clients for an order
 */
function broadcastNotification(orderId, notification) {
  if (activeConnections.has(orderId)) {
    const connections = activeConnections.get(orderId);
    const data = `data: ${JSON.stringify(notification)}\n\n`;
    
    connections.forEach(res => {
      try {
        res.write(data);
      } catch (error) {
        console.error('Error broadcasting notification:', error);
        connections.delete(res);
      }
    });
    
    console.log(`📢 Broadcasted notification to ${connections.size} clients for order ${orderId}`);
  }
}


// Store active call jobs
const activeCallJobs = new Map();

/**
 * Test VAPI connection
 * GET /api/calls/test-vapi
 */
router.get('/test-vapi', async (req, res) => {
  try {
    console.log('🧪 Testing VAPI connection...');
    
    const testResult = await vapiClient.testConnection();
    
    if (testResult.success) {
      res.json({
        success: true,
        message: 'VAPI connection successful! ✅',
        data: testResult.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'VAPI connection failed ❌',
        details: testResult.error
      });
    }

  } catch (error) {
    console.error('VAPI test error:', error);
    res.status(500).json({
      success: false,
      error: 'VAPI test failed',
      message: error.message
    });
  }
});

/**
 * Make a test call
 * POST /api/calls/test-call
 */
router.post('/test-call', async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Phone number is required'
      });
    }

    console.log('📞 Making test call to:', phoneNumber);

    const callResult = await vapiClient.createOutboundCall({
      phoneNumber: phoneNumber,
      name: name || 'Test Customer',
      company: 'Test Company',
      leadId: 'test-lead-id',
      orderId: 'test-order-id'
    });

    if (callResult.success) {
      res.json({
        success: true,
        message: 'Test call initiated successfully! 🎉',
        callId: callResult.callId,
        status: callResult.status
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Test call failed',
        details: callResult.error
      });
    }

  } catch (error) {
    console.error('Test call error:', error);
    res.status(500).json({
      success: false,
      error: 'Test call failed',
      message: error.message
    });
  }
});

/**
 * Start calling process for an order - REAL IMPLEMENTATION
 * POST /api/calls/start/:orderId
 */
router.post('/start/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🚀 Starting real-time calling for order:', orderId);

    // Check if order exists and is ready for calling
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

    if (order.status !== 'processing') {
      return res.status(400).json({
        error: 'Order is not in processing status',
        currentStatus: order.status
      });
    }

    // Check if calling is already in progress
    if (activeCallJobs.has(orderId)) {
      return res.status(400).json({
        error: 'Calling process already in progress for this order'
      });
    }

    // Test VAPI connection first
    const vapiTest = await vapiClient.testConnection();
    if (!vapiTest.success) {
      return res.status(500).json({
        error: 'VAPI connection failed',
        details: vapiTest.error
      });
    }

    // Check if within calling hours
    if (!vapiClient.isWithinCallingHours(order.call_start_time, order.call_end_time, order.timezone)) {
      return res.status(400).json({
        error: 'Outside calling hours',
        callingHours: `${order.call_start_time} - ${order.call_end_time} ${order.timezone}`
      });
    }

    // Get pending leads for this order
    const { data: leads, error: leadsError } = await supabase
      .from(TABLES.LEADS)
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (leadsError || !leads || leads.length === 0) {
      return res.status(400).json({
        error: 'No pending leads found for this order'
      });
    }

    // Start the real calling process
    await startRealTimeCallingProcess(orderId, leads, order);

    res.json({
      success: true,
      message: 'Real-time calling process started successfully! 🎉',
      data: {
        orderId,
        totalLeads: leads.length,
        callStartTime: order.call_start_time,
        callEndTime: order.call_end_time,
        timezone: order.timezone,
        vapiConnected: true
      }
    });

  } catch (error) {
    console.error('Start calling error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Stop calling process for an order
 * POST /api/calls/stop/:orderId
 */
router.post('/stop/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log('🛑 Stopping calling process for order:', orderId);

    if (!activeCallJobs.has(orderId)) {
      return res.status(400).json({
        error: 'No active calling process found for this order'
      });
    }

    // Stop the cron job
    const callJob = activeCallJobs.get(orderId);
    if (callJob && callJob.destroy) {
      callJob.destroy();
    }
    activeCallJobs.delete(orderId);

    // Update order status
    await supabase
      .from(TABLES.ORDERS)
      .update({
        status: 'stopped',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    res.json({
      success: true,
      message: 'Calling process stopped successfully'
    });

  } catch (error) {
    console.error('Stop calling error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get call status for an order
 * GET /api/calls/status/:orderId
 */
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get call statistics
    let calls = [];
    try {
      const { data: callsData, error } = await supabase
        .from(TABLES.CALLS)
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get call status error:', error);
        throw error;
      }

      calls = callsData || [];
    } catch (error) {
      console.error('Failed to fetch calls:', error);
      return res.status(500).json({
        error: 'Failed to fetch call status',
        message: error.message
      });
    }

    // Calculate statistics safely
    const stats = calls.reduce((acc, call) => {
      if (call && call.status) {
        acc.total++;
        acc[call.status] = (acc[call.status] || 0) + 1;
        if (call.status === 'completed') {
          acc.completed++;
          if (call.transcript && call.transcript.length > 50) {
            acc.verified++;
          }
        }
      }
      return acc;
    }, { total: 0, completed: 0, verified: 0 });

    // Get remaining leads
    let pendingCount = 0;
    try {
      const { count } = await supabase
        .from(TABLES.LEADS)
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
        .eq('status', 'pending');
      pendingCount = count || 0;
    } catch (error) {
      console.error('Error fetching pending leads:', error);
    }

    const isActive = activeCallJobs.has(orderId);

    res.json({
      success: true,
      data: {
        orderId,
        isActive,
        isRealTime: true, // Now it's real-time!
        stats,
        pendingLeads: pendingCount,
        calls: calls.slice(0, 20) // Return last 20 calls
      }
    });

  } catch (error) {
    console.error('Get call status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Start the real-time calling process with cron job
 */
async function startRealTimeCallingProcess(orderId, leads, order) {
  console.log(`🚀 Starting REAL-TIME calling process for order ${orderId} with ${leads.length} leads`);

  // Create cron job that runs every 60 seconds during calling hours
  const cronPattern = '*/60 * * * * *'; // Every 60 seconds
  
  const job = cron.schedule(cronPattern, async () => {
    try {
      console.log(`⏰ Cron job running for order ${orderId}`);

      // Check if still within calling hours
      if (!vapiClient.isWithinCallingHours(order.call_start_time, order.call_end_time, order.timezone)) {
        console.log(`🌙 Outside calling hours for order ${orderId}`);
        return;
      }

      // Get next pending lead
      const { data: nextLead, error } = await supabase
        .from(TABLES.LEADS)
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (error || !nextLead) {
        console.log(`✅ No more pending leads for order ${orderId}`);
        
        // Stop the job and mark order as completed
        job.destroy();
        activeCallJobs.delete(orderId);
        
        await supabase
          .from(TABLES.ORDERS)
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        console.log(`🎉 Calling process completed for order ${orderId}`);
        return;
      }

      // Make the REAL call
      await makeRealCall(nextLead, order);

      // Wait 30 seconds between calls to avoid overwhelming
      console.log('⏳ Waiting 30 seconds before next call...');

    } catch (error) {
      console.error(`❌ Error in calling process for order ${orderId}:`, error);
    }
  }, {
    scheduled: false,
    timezone: order.timezone || 'America/New_York'
  });

  // Start the job
  job.start();
  activeCallJobs.set(orderId, job);

  // Update order status
  await supabase
    .from(TABLES.ORDERS)
    .update({
      status: 'calling',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);

  console.log(`✅ Real-time calling job started for order ${orderId}`);
}

/**
 * Make a REAL call to a lead using VAPI
 */
async function makeRealCall(lead, order) {
  try {
    console.log(`📞 Making REAL call to ${lead.name} at ${lead.phone} for order ${order.id}`);

    // Create call record in database
    const callId = uuidv4();
    const callData = {
      id: callId,
      order_id: order.id,
      lead_id: lead.id,
      phone_number: lead.phone,
      status: 'initiated',
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString()
    };

    const { data: callRecord, error: callError } = await supabase
      .from(TABLES.CALLS)
      .insert([callData])
      .select()
      .single();

    if (callError) {
      console.error('❌ Call record creation error:', callError);
      return { success: false, error: callError.message };
    }

    // Update lead status to calling
    await supabase
      .from(TABLES.LEADS)
      .update({
        status: 'calling',
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    // Make REAL VAPI call
    const vapiResult = await vapiClient.createOutboundCall({
      phoneNumber: lead.phone,
      name: lead.name,
      leadId: lead.id,
      orderId: order.id,
      company: lead.company,
      retryAttempt: lead.retry_count || 0
    });

    if (!vapiResult.success) {
      console.error('❌ VAPI call failed:', vapiResult.error);
      
      // Update call and lead status to failed
      await Promise.all([
        supabase
          .from(TABLES.CALLS)
          .update({
            status: 'failed',
            error: vapiResult.error,
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', callId),
        supabase
          .from(TABLES.LEADS)
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id)
      ]);

      return { success: false, error: vapiResult.error };
    }

    console.log('✅ VAPI call created successfully:', vapiResult.callId);

    // Update call record with VAPI call ID
    await supabase
      .from(TABLES.CALLS)
      .update({
        vapi_call_id: vapiResult.callId,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', callId);

    // Schedule call status check after 2 minutes
    setTimeout(() => {
      checkRealCallStatus(callId, vapiResult.callId, lead.id);
    }, 120000); // Check after 2 minutes

    return { success: true, callId: vapiResult.callId };

  } catch (error) {
    console.error('❌ Make real call error:', error);
    
    // Update lead status to failed
    await supabase
      .from(TABLES.LEADS)
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    return { success: false, error: error.message };
  }
}

/**
 * Check REAL call status from VAPI and update records
 */
async function checkRealCallStatus(callId, vapiCallId, leadId) {
  try {
    console.log(`📊 Checking REAL call status for VAPI call: ${vapiCallId}`);

    const statusResult = await vapiClient.getCallStatus(vapiCallId);
    
    if (!statusResult.success) {
      console.error('❌ Failed to get call status:', statusResult.error);
      return;
    }

    const call = statusResult.data;
    let finalStatus = 'completed';
    let transcript = '';
    let duration = call.duration || 0;

    // Map VAPI status to our status
    switch (call.status) {
      case 'ended':
        finalStatus = 'completed';
        break;
      case 'failed':
      case 'no-answer':
      case 'busy':
        finalStatus = 'failed';
        break;
      case 'in-progress':
      case 'ringing':
        // Still in progress, check again later
        setTimeout(() => {
          checkRealCallStatus(callId, vapiCallId, leadId);
        }, 60000); // Check again in 60 seconds
        return;
      default:
        finalStatus = 'completed';
    }

    // Get transcript if available
    if (finalStatus === 'completed') {
      const transcriptResult = await vapiClient.getCallTranscript(vapiCallId);
      if (transcriptResult.success) {
        transcript = transcriptResult.transcript || '';
      }
    }

    console.log(`📝 Call ${vapiCallId} finished with status: ${finalStatus}, duration: ${duration}s`);

    // Update call record with final results
    await supabase
      .from(TABLES.CALLS)
      .update({
        status: finalStatus,
        transcript: transcript,
        duration: duration,
        ended_at: call.endedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', callId);

    // Update lead status
    const leadStatus = finalStatus === 'completed' ? 'completed' : 'failed';
    await supabase
      .from(TABLES.LEADS)
      .update({
        status: leadStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    console.log(`✅ Call ${vapiCallId} status updated to ${finalStatus}, lead status: ${leadStatus}`);

  } catch (error) {
    console.error('❌ Check call status error:', error);
  }
}

/**
 * Retry failed calls for a lead - REAL IMPLEMENTATION
 * POST /api/calls/retry/:leadId
 */
router.post('/retry/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from(TABLES.LEADS)
      .select('*, orders(*)')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    // Check if within calling hours
    if (!vapiClient.isWithinCallingHours(lead.orders.call_start_time, lead.orders.call_end_time, lead.orders.timezone)) {
      return res.status(400).json({
        error: 'Outside calling hours',
        callingHours: `${lead.orders.call_start_time} - ${lead.orders.call_end_time} ${lead.orders.timezone}`
      });
    }

    // Check retry limit
    const maxRetries = lead.orders.max_retries || 2;
    if ((lead.retry_count || 0) >= maxRetries) {
      return res.status(400).json({
        error: 'Maximum retry attempts reached',
        retryCount: lead.retry_count,
        maxRetries: maxRetries
      });
    }

    // Reset lead status to pending and increment retry count
    await supabase
      .from(TABLES.LEADS)
      .update({
        status: 'pending',
        retry_count: (lead.retry_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    // Make the REAL call immediately
    const callResult = await makeRealCall(lead, lead.orders);

    if (callResult.success) {
      res.json({
        success: true,
        message: 'Real call retry initiated successfully! 📞',
        callId: callResult.callId,
        retryAttempt: (lead.retry_count || 0) + 1
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Call retry failed',
        details: callResult.error
      });
    }

  } catch (error) {
    console.error('Retry call error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get all VAPI calls for debugging
 * GET /api/calls/vapi-calls
 */
router.get('/vapi-calls', async (req, res) => {
  try {
    console.log('📋 Fetching all VAPI calls...');

    const vapiResult = await vapiClient.listCalls({
      limit: req.query.limit || 50
    });

    if (vapiResult.success) {
      res.json({
        success: true,
        message: 'VAPI calls retrieved successfully',
        data: vapiResult.data,
        count: vapiResult.count
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch VAPI calls',
        details: vapiResult.error
      });
    }

  } catch (error) {
    console.error('Get VAPI calls error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
// Export the broadcast function so it can be used by webhooks
module.exports.broadcastNotification = broadcastNotification;