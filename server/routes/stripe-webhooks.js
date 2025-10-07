const express = require('express');
const { supabase, TABLES } = require('../config/supabase');
const vapiClient = require('../config/vapi');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * Stripe Webhook Handler - LOCALHOST VERSION
 * POST /api/stripe-webhooks
 */
router.post('/', express.json(), async (req, res) => {
  try {
    const event = req.body;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 STRIPE WEBHOOK RECEIVED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Event Type:', event.type);
    console.log('Event ID:', event.id);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      console.log('✅ PAYMENT SUCCESSFUL!');
      console.log('📋 Order ID:', orderId);
      console.log('💰 Amount:', session.amount_total / 100, session.currency?.toUpperCase());
      console.log('📧 Customer Email:', session.customer_details?.email);

      if (!orderId) {
        console.error('❌ No orderId in metadata!');
        return res.status(400).json({ error: 'Missing orderId' });
      }

      // Update order in database
      console.log('📝 Updating order in database...');
      const { error: updateError } = await supabase
        .from(TABLES.ORDERS)
        .update({ 
          status: 'processing',
          payment_status: 'paid',
          stripe_session_id: session.id,
          amount_paid: session.amount_total / 100,
          customer_email: session.customer_details?.email || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('❌ Failed to update order:', updateError);
        return res.status(500).json({ error: 'Failed to update order' });
      }

      console.log('✅ Order updated successfully');
      console.log('📞 Starting automatic calling process...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Start calling process (async)
      startAutomaticCalling(orderId).catch(err => {
        console.error('❌ Auto-calling error:', err);
      });

      return res.json({ 
        received: true,
        message: 'Payment processed and calling started',
        orderId: orderId
      });
    }

    // Other event types
    console.log('ℹ️ Unhandled event type:', event.type);
    res.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start calling all leads for an order
 */
async function startAutomaticCalling(orderId) {
  try {
    console.log('\n🚀 AUTOMATIC CALLING STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Order ID:', orderId);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('❌ Order not found:', orderId);
      return;
    }

    console.log('✅ Order found:', order.customer_name);

    // Get pending leads
    const { data: leads, error: leadsError } = await supabase
      .from(TABLES.LEADS)
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log('⚠️ No pending leads found');
      
      await supabase
        .from(TABLES.ORDERS)
        .update({ status: 'completed' })
        .eq('id', orderId);
      
      return;
    }

    console.log(`📊 Found ${leads.length} leads to call`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Process in batches of 10
    const maxConcurrentCalls = 10;
    const batches = [];
    
    for (let i = 0; i < leads.length; i += maxConcurrentCalls) {
      batches.push(leads.slice(i, i + maxConcurrentCalls));
    }

    console.log(`📦 Total batches: ${batches.length}`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n📞 BATCH ${i + 1}/${batches.length} - Calling ${batch.length} leads`);
      console.log('─────────────────────────────────────────');

      await Promise.all(batch.map(lead => makeCallToLead(lead, order)));

      if (i < batches.length - 1) {
        console.log('⏳ Waiting 5 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log('\n✅ ALL CALLS INITIATED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Update order status
    await supabase
      .from(TABLES.ORDERS)
      .update({ 
        status: 'calling_in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

  } catch (error) {
    console.error('❌ Automatic calling error:', error);
  }
}

/**
 * Make a call to a single lead
 */
async function makeCallToLead(lead, order) {
  try {
    console.log(`📞 Calling: ${lead.name} (${lead.phone})`);

    const callId = uuidv4();
    
    // Create call record
    const { error: insertError } = await supabase
      .from(TABLES.CALLS)
      .insert({
        id: callId,
        order_id: order.id,
        lead_id: lead.id,
        phone_number: lead.phone,
        status: 'initiated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`   ❌ Failed to create call record:`, insertError);
      return;
    }

    // Update lead status
    await supabase
      .from(TABLES.LEADS)
      .update({ 
        status: 'calling',
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id);

    // Make Vapi call
    const callResult = await vapiClient.createOutboundCall({
      phoneNumber: lead.phone,
      name: lead.name,
      company: lead.company || 'Unknown Company',
      leadId: lead.id,
      orderId: order.id
    });

    if (callResult.success) {
      console.log(`   ✅ Call started - Vapi ID: ${callResult.callId}`);

      await supabase
        .from(TABLES.CALLS)
        .update({
          vapi_call_id: callResult.callId,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

    } else {
      console.error(`   ❌ Call failed:`, callResult.error);

      await supabase
        .from(TABLES.CALLS)
        .update({
          status: 'failed',
          error_message: callResult.error || 'Unknown error',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', callId);

      await supabase
        .from(TABLES.LEADS)
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);
    }

  } catch (error) {
    console.error(`   ❌ Error calling ${lead.name}:`, error);
  }
}

module.exports = router;