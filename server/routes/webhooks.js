// Replace your server/routes/webhooks.js with this:

const express = require('express');
const { supabase, TABLES } = require('../config/supabase');

const router = express.Router();

// Import broadcast function for real-time notifications
let broadcastNotification = null;
try {
  const callsModule = require('./calls');
  broadcastNotification = callsModule.broadcastNotification;
} catch (error) {
  console.log('Broadcast function not available yet');
}

/**
 * Enhanced VAPI Webhook Handler for Complete Conversation Capture
 * POST /api/webhooks/vapi
 */
router.post('/vapi', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    console.log('🎣 VAPI Webhook received - Enhanced conversation capture');
    
    // Parse the webhook payload
    let event;
    try {
      event = JSON.parse(req.body);
    } catch (error) {
      console.error('❌ Failed to parse webhook payload:', error);
      return res.status(400).send('Invalid JSON');
    }

    console.log('📨 Webhook Event Type:', event.type);
    console.log('📊 Webhook Data:', JSON.stringify(event, null, 2));

    // Handle different event types with enhanced conversation capture
    switch (event.type) {
      case 'call.started':
        await handleCallStarted(event);
        break;
      
      case 'call.ended':
        await handleCallEnded(event);
        break;
      
      case 'call.failed':
        await handleCallFailed(event);
        break;
      
      case 'call.transcript':
      case 'transcript':
        await handleTranscriptUpdate(event);
        break;

      case 'message':
        await handleMessageUpdate(event);
        break;

      case 'conversation.updated':
        await handleConversationUpdate(event);
        break;
      
      default:
        console.log('ℹ️ Unhandled webhook event type:', event.type);
        // Log all unhandled events for debugging
        await logWebhookEvent(event);
    }

    // Respond to VAPI that we received the webhook
    res.status(200).json({ received: true, processed: true });

  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Handle call started event with enhanced logging
 */
async function handleCallStarted(event) {
  try {
    console.log('🚀 Call Started with enhanced tracking:', event.call.id);

    const vapiCallId = event.call.id;
    const call = event.call;
    const metadata = call.metadata || {};

    // Find the call record in our database
    const { data: callRecord, error: findError } = await supabase
      .from(TABLES.CALLS)
      .select('*')
      .eq('vapi_call_id', vapiCallId)
      .single();

    if (findError || !callRecord) {
      console.log('⚠️ Call record not found for VAPI call:', vapiCallId);
      return;
    }

    // Update call status with enhanced information
    const { error: updateError } = await supabase
      .from(TABLES.CALLS)
      .update({
        status: 'in_progress',
        started_at: call.startedAt || new Date().toISOString(),
        phone_number: call.customer?.number || callRecord.phone_number,
        updated_at: new Date().toISOString()
      })
      .eq('vapi_call_id', vapiCallId);

    if (updateError) {
      console.error('❌ Failed to update call status:', updateError);
    } else {
      console.log('✅ Call status updated to in_progress with enhanced data');
    }

    // Update lead status
    if (metadata.leadId) {
      await supabase
        .from(TABLES.LEADS)
        .update({
          status: 'calling',
          updated_at: new Date().toISOString()
        })
        .eq('id', metadata.leadId);
    }

    // 🔔 SEND REAL-TIME NOTIFICATION
    const orderId = callRecord.order_id;
    if (orderId && broadcastNotification) {
      broadcastNotification(orderId, {
        type: 'call_started',
        message: `Call started to ${call.customer?.number}`,
        data: {
          callId: callRecord.id,
          vapiCallId: vapiCallId,
          phoneNumber: call.customer?.number,
          leadId: metadata.leadId,
          status: 'in_progress'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Log the call start event
    await logCallEvent(callRecord.id, 'call_started', {
      vapiCallId,
      customerNumber: call.customer?.number,
      assistantId: call.assistantId,
      startTime: call.startedAt
    });

  } catch (error) {
    console.error('❌ Handle call started error:', error);
  }
}

/**
 * Handle call ended event with complete conversation capture
 */
async function handleCallEnded(event) {
  try {
    console.log('📞 Call Ended - Capturing complete conversation:', event.call.id);

    const vapiCallId = event.call.id;
    const call = event.call;
    const metadata = call.metadata || {};

    // Calculate duration
    const duration = call.endedAt && call.startedAt 
      ? Math.round((new Date(call.endedAt) - new Date(call.startedAt)) / 1000)
      : 0;

    // Extract and process complete transcript
    const transcriptData = await processCompleteTranscript(call);
    
    console.log('📝 Complete transcript processed:');
    console.log('   - Length:', transcriptData.fullTranscript.length, 'characters');
    console.log('   - Messages:', transcriptData.messageCount);
    console.log('   - Word count:', transcriptData.wordCount);

    // Update call record with complete conversation data
    const { error: updateError } = await supabase
      .from(TABLES.CALLS)
      .update({
        status: 'completed',
        transcript: transcriptData.fullTranscript,
        duration: duration,
        ended_at: call.endedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('vapi_call_id', vapiCallId);

    if (updateError) {
      console.error('❌ Failed to update call:', updateError);
    } else {
      console.log('✅ Call updated with complete conversation data');
    }

    // Analyze conversation quality and extract insights
    const conversationAnalysis = await analyzeConversationQuality(transcriptData, metadata);
    
    // Update lead status based on conversation analysis
    if (metadata.leadId) {
      const leadStatus = determineLeadStatus(conversationAnalysis, transcriptData);
      
      await supabase
        .from(TABLES.LEADS)
        .update({
          status: leadStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', metadata.leadId);

      console.log('✅ Lead status updated to:', leadStatus);
    }

    // 🔔 SEND REAL-TIME NOTIFICATION
    const { data: callRecord } = await supabase
      .from(TABLES.CALLS)
      .select('order_id')
      .eq('vapi_call_id', vapiCallId)
      .single();

    if (callRecord?.order_id && broadcastNotification) {
      broadcastNotification(callRecord.order_id, {
        type: 'call_completed',
        message: `Call completed - ${duration}s conversation`,
        data: {
          vapiCallId: vapiCallId,
          duration: duration,
          wordCount: transcriptData.wordCount,
          quality: conversationAnalysis.quality,
          hasConversation: transcriptData.hasConversation,
          leadId: metadata.leadId
        },
        timestamp: new Date().toISOString()
      });
    }

    // Log the complete call event with analysis
    await logCallEvent(null, 'call_completed', {
      vapiCallId,
      duration,
      conversationAnalysis,
      transcriptLength: transcriptData.fullTranscript.length,
      messageCount: transcriptData.messageCount,
      wordCount: transcriptData.wordCount
    });

    console.log('📊 Call conversation analysis completed:', conversationAnalysis);

  } catch (error) {
    console.error('❌ Handle call ended error:', error);
  }
}

/**
 * Handle call failed event
 */
async function handleCallFailed(event) {
  try {
    console.log('❌ Call Failed:', event.call.id);

    const vapiCallId = event.call.id;
    const call = event.call;
    const metadata = call.metadata || {};
    const errorMessage = call.error || event.error || 'Call failed';

    // Update call record
    const { error: updateError } = await supabase
      .from(TABLES.CALLS)
      .update({
        status: 'failed',
        error: errorMessage,
        ended_at: call.endedAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('vapi_call_id', vapiCallId);

    if (updateError) {
      console.error('❌ Failed to update failed call:', updateError);
    } else {
      console.log('✅ Failed call updated');
    }

    // Update lead status - check if we should retry
    let willRetry = false;
    if (metadata.leadId) {
      // Get current lead info to check retry count
      const { data: lead } = await supabase
        .from(TABLES.LEADS)
        .select('retry_count, orders(max_retries)')
        .eq('id', metadata.leadId)
        .single();

      const maxRetries = lead?.orders?.max_retries || 2;
      const currentRetries = lead?.retry_count || 0;

      let newStatus = 'failed';
      if (currentRetries < maxRetries) {
        newStatus = 'pending'; // Will be retried
        willRetry = true;
        console.log(`🔄 Lead will be retried (${currentRetries + 1}/${maxRetries})`);
      } else {
        console.log(`❌ Lead failed permanently (${currentRetries}/${maxRetries})`);
      }

      await supabase
        .from(TABLES.LEADS)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', metadata.leadId);
    }

    // 🔔 SEND REAL-TIME NOTIFICATION
    const { data: callRecord } = await supabase
      .from(TABLES.CALLS)
      .select('order_id')
      .eq('vapi_call_id', vapiCallId)
      .single();

    if (callRecord?.order_id && broadcastNotification) {
      broadcastNotification(callRecord.order_id, {
        type: 'call_failed',
        message: `Call failed: ${errorMessage}`,
        data: {
          vapiCallId: vapiCallId,
          error: errorMessage,
          leadId: metadata.leadId,
          willRetry: willRetry
        },
        timestamp: new Date().toISOString()
      });
    }

    // Log the failure
    await logCallEvent(null, 'call_failed', {
      vapiCallId,
      errorMessage,
      failureReason: call.endReason || 'unknown'
    });

  } catch (error) {
    console.error('❌ Handle call failed error:', error);
  }
}

/**
 * Handle real-time transcript updates
 */
async function handleTranscriptUpdate(event) {
  try {
    console.log('📝 Real-time transcript update:', event.call?.id || event.callId);

    const vapiCallId = event.call?.id || event.callId;
    const transcript = event.transcript || event.message || '';

    if (!vapiCallId || !transcript) {
      console.log('⚠️ Missing callId or transcript in update');
      return;
    }

    // Update call record with latest transcript chunk
    const { error: updateError } = await supabase
      .from(TABLES.CALLS)
      .update({
        transcript: transcript,
        updated_at: new Date().toISOString()
      })
      .eq('vapi_call_id', vapiCallId);

    if (updateError) {
      console.error('❌ Failed to update transcript:', updateError);
    } else {
      console.log('✅ Real-time transcript updated, length:', transcript.length);
    }

    // Log transcript update for debugging
    await logCallEvent(null, 'transcript_update', {
      vapiCallId,
      transcriptLength: transcript.length,
      updateTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Handle transcript update error:', error);
  }
}

/**
 * Handle individual message updates
 */
async function handleMessageUpdate(event) {
  try {
    console.log('💬 Message update received:', event.call?.id || event.callId);

    const vapiCallId = event.call?.id || event.callId;
    const message = event.message;

    if (!vapiCallId || !message) return;

    // Log individual messages for detailed conversation tracking
    await logCallEvent(null, 'message_received', {
      vapiCallId,
      message: message,
      messageType: event.messageType || 'unknown',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Handle message update error:', error);
  }
}

/**
 * Handle conversation updates
 */
async function handleConversationUpdate(event) {
  try {
    console.log('🗣️ Conversation update:', event.call?.id || event.callId);

    const vapiCallId = event.call?.id || event.callId;
    
    // Log conversation state changes
    await logCallEvent(null, 'conversation_update', {
      vapiCallId,
      conversationState: event.conversationState,
      updateTime: new Date().toISOString(),
      additionalData: event.data
    });

  } catch (error) {
    console.error('❌ Handle conversation update error:', error);
  }
}

/**
 * Process complete transcript from VAPI call data
 */
async function processCompleteTranscript(call) {
  let fullTranscript = '';
  let messageCount = 0;
  
  try {
    // Try multiple sources for transcript data
    if (call.transcript) {
      if (typeof call.transcript === 'string') {
        fullTranscript = call.transcript;
      } else if (Array.isArray(call.transcript)) {
        fullTranscript = call.transcript.map(msg => 
          typeof msg === 'string' ? msg : `${msg.role || 'speaker'}: ${msg.content || msg.text || ''}`
        ).join('\n');
        messageCount = call.transcript.length;
      } else if (typeof call.transcript === 'object') {
        fullTranscript = JSON.stringify(call.transcript, null, 2);
      }
    }

    // Also check messages array
    if (call.messages && Array.isArray(call.messages)) {
      const messageTranscript = call.messages.map(msg => 
        `${msg.role || 'speaker'}: ${msg.content || msg.text || ''}`
      ).join('\n');
      
      if (messageTranscript.length > fullTranscript.length) {
        fullTranscript = messageTranscript;
        messageCount = call.messages.length;
      }
    }

    // Calculate word count
    const wordCount = fullTranscript.split(/\s+/).filter(word => word.length > 0).length;

    return {
      fullTranscript,
      messageCount,
      wordCount,
      hasConversation: wordCount > 10
    };

  } catch (error) {
    console.error('❌ Error processing transcript:', error);
    return {
      fullTranscript: call.transcript || '',
      messageCount: 0,
      wordCount: 0,
      hasConversation: false
    };
  }
}

/**
 * Analyze conversation quality and extract insights
 */
async function analyzeConversationQuality(transcriptData, metadata) {
  const transcript = transcriptData.fullTranscript.toLowerCase();
  
  // Basic conversation analysis
  const analysis = {
    hasConversation: transcriptData.hasConversation,
    wordCount: transcriptData.wordCount,
    messageCount: transcriptData.messageCount,
    
    // Conversation quality indicators
    hasGreeting: /hello|hi|good morning|good afternoon|hey/i.test(transcript),
    hasGoodbye: /goodbye|bye|talk soon|have a good|thanks/i.test(transcript),
    hasQuestions: /\?|\bwhat\b|\bhow\b|\bwhen\b|\bwhere\b|\bwho\b|\bwhy\b/i.test(transcript),
    
    // Response indicators
    positiveResponse: /yes|sure|absolutely|interested|sounds good|okay|great/i.test(transcript),
    negativeResponse: /no|not interested|busy|stop calling|remove|don't call/i.test(transcript),
    neutralResponse: !(/yes|no|interested|not interested/i.test(transcript)),
    
    // Verification indicators
    nameConfirmation: false,
    companyConfirmation: false,
    
    // Conversation flow
    conversationLength: transcriptData.wordCount > 50 ? 'long' : transcriptData.wordCount > 20 ? 'medium' : 'short',
    interactionLevel: transcriptData.messageCount > 4 ? 'high' : transcriptData.messageCount > 2 ? 'medium' : 'low'
  };

  // Check for name and company confirmation if metadata available
  if (metadata.leadId) {
    try {
      const { data: lead } = await supabase
        .from(TABLES.LEADS)
        .select('name, company')
        .eq('id', metadata.leadId)
        .single();

      if (lead) {
        const firstName = lead.name.split(' ')[0].toLowerCase();
        const companyName = lead.company.toLowerCase();
        
        analysis.nameConfirmation = transcript.includes(firstName);
        analysis.companyConfirmation = transcript.includes(companyName.split(' ')[0]);
      }
    } catch (error) {
      console.log('Could not fetch lead info for verification check');
    }
  }

  // Determine overall conversation quality
  let qualityScore = 0;
  if (analysis.hasConversation) qualityScore += 2;
  if (analysis.hasGreeting) qualityScore += 1;
  if (analysis.hasQuestions) qualityScore += 1;
  if (analysis.positiveResponse) qualityScore += 2;
  if (analysis.nameConfirmation) qualityScore += 2;
  if (analysis.companyConfirmation) qualityScore += 2;
  if (analysis.wordCount > 100) qualityScore += 1;

  analysis.qualityScore = qualityScore;
  analysis.quality = qualityScore >= 6 ? 'high' : qualityScore >= 3 ? 'medium' : 'low';

  return analysis;
}

/**
 * Determine lead status based on conversation analysis
 */
function determineLeadStatus(analysis, transcriptData) {
  if (!analysis.hasConversation) {
    return 'failed'; // No conversation happened
  }

  if (analysis.positiveResponse && (analysis.nameConfirmation || analysis.companyConfirmation)) {
    return 'completed'; // Verified and positive
  }

  if (analysis.negativeResponse) {
    return 'completed'; // Completed but negative
  }

  if (analysis.hasConversation && transcriptData.wordCount > 20) {
    return 'completed'; // Had a meaningful conversation
  }

  return 'completed'; // Default for any conversation
}

/**
 * Log call events for detailed tracking
 */
async function logCallEvent(callId, eventType, eventData) {
  try {
    // If we don't have callId, try to find it from vapiCallId
    if (!callId && eventData.vapiCallId) {
      const { data: call } = await supabase
        .from(TABLES.CALLS)
        .select('id')
        .eq('vapi_call_id', eventData.vapiCallId)
        .single();
      
      callId = call?.id;
    }

    if (callId) {
      await supabase
        .from(TABLES.CALL_LOGS)
        .insert([{
          call_id: callId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString()
        }]);
    }
  } catch (error) {
    console.error('❌ Failed to log call event:', error);
  }
}

/**
 * Log webhook events for debugging
 */
async function logWebhookEvent(event) {
  try {
    console.log('📝 Logging unhandled webhook event:', event.type);
    
    // Store in call_logs for debugging purposes
    await supabase
      .from(TABLES.CALL_LOGS)
      .insert([{
        call_id: null, // No specific call
        event_type: `webhook_${event.type}`,
        event_data: {
          eventType: event.type,
          eventData: event,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('❌ Failed to log webhook event:', error);
  }
}

/**
 * Test webhook endpoint
 * GET /api/webhooks/test
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced webhook endpoint is working! 🎉',
    timestamp: new Date().toISOString(),
    url: `${req.protocol}://${req.get('host')}/api/webhooks/vapi`,
    features: [
      'Complete conversation capture',
      'Real-time transcript updates',
      'Real-time notifications',
      'Conversation quality analysis',
      'Lead verification tracking',
      'Detailed event logging'
    ]
  });
});

module.exports = router;