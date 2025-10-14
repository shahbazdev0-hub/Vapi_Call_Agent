// TEST SCRIPT - Run this after making a test call
// Save as: server/test-data-flow.js
// Run with: node server/test-data-flow.js

require('dotenv').config();
const { supabase, TABLES } = require('./config/supabase');

async function testDataFlow() {
  console.log('🧪 Testing Complete Data Flow\n');
  
  // Get the most recent order
  const { data: orders } = await supabase
    .from(TABLES.ORDERS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (!orders || orders.length === 0) {
    console.log('❌ No orders found in database');
    return;
  }
  
  const order = orders[0];
  console.log('📋 Testing Order:', order.id);
  console.log('   Customer:', order.customer_email);
  console.log('   Status:', order.status);
  console.log('');
  
  // Get leads for this order
  const { data: leads } = await supabase
    .from(TABLES.LEADS)
    .select('*')
    .eq('order_id', order.id);
  
  console.log('👥 Leads:', leads?.length || 0);
  console.log('');
  
  // Get calls for this order
  const { data: calls } = await supabase
    .from(TABLES.CALLS)
    .select(`
      *,
      leads (name, phone, company)
    `)
    .eq('order_id', order.id)
    .order('created_at', { ascending: false });
  
  console.log('📞 Calls:', calls?.length || 0);
  console.log('');
  
  if (calls && calls.length > 0) {
    console.log('📊 Call Status Breakdown:');
    const statusCounts = {};
    let hasTranscript = 0;
    let totalDuration = 0;
    
    calls.forEach(call => {
      statusCounts[call.status] = (statusCounts[call.status] || 0) + 1;
      if (call.transcript && call.transcript.length > 0) hasTranscript++;
      if (call.duration) totalDuration += parseInt(call.duration);
    });
    
    console.log('   Status counts:', statusCounts);
    console.log('   Calls with transcript:', hasTranscript);
    console.log('   Total call duration:', totalDuration, 'seconds');
    console.log('');
    
    // Show details of most recent call
    console.log('🔍 Most Recent Call Details:');
    const recentCall = calls[0];
    console.log('   Lead:', recentCall.leads?.name || 'N/A');
    console.log('   Phone:', recentCall.leads?.phone || 'N/A');
    console.log('   Company:', recentCall.leads?.company || 'N/A');
    console.log('   Status:', recentCall.status);
    console.log('   Duration:', recentCall.duration || 0, 'seconds');
    console.log('   Transcript length:', recentCall.transcript?.length || 0, 'characters');
    console.log('   Started:', recentCall.started_at || 'N/A');
    console.log('   Ended:', recentCall.ended_at || 'N/A');
    console.log('   VAPI Call ID:', recentCall.vapi_call_id || 'N/A');
    console.log('');
    
    if (recentCall.transcript) {
      console.log('   Transcript preview:', recentCall.transcript.substring(0, 150) + '...');
      console.log('');
    }
    
    // Test categorization logic (same as reports.js)
    console.log('📈 Report Categorization Test:');
    const priority = calls.filter(call => 
      call.status === 'completed' && call.duration && parseInt(call.duration) > 0
    );
    
    const verified = calls.filter(call => 
      call.status === 'completed' && 
      call.transcript && 
      call.leads?.name &&
      call.transcript.toLowerCase().includes(call.leads.name.toLowerCase())
    );
    
    const dnc = calls.filter(call => 
      call.status === 'failed' || call.status === 'no-answer' || call.status === 'busy'
    );
    
    console.log('   Priority (high-pickup):', priority.length);
    console.log('   Verified Contact:', verified.length);
    console.log('   DNC (bad numbers):', dnc.length);
    console.log('   Standard:', leads.length - priority.length - verified.length - dnc.length);
    console.log('');
  }
  
  // Test if data is ready for dashboard/report
  console.log('✅ Dashboard/Report Readiness Check:');
  
  const checks = [
    {
      name: 'Order exists',
      pass: !!order,
      value: order ? '✅' : '❌'
    },
    {
      name: 'Leads exist',
      pass: leads && leads.length > 0,
      value: leads ? `✅ (${leads.length})` : '❌'
    },
    {
      name: 'Calls exist',
      pass: calls && calls.length > 0,
      value: calls ? `✅ (${calls.length})` : '❌'
    },
    {
      name: 'Completed calls',
      pass: calls && calls.some(c => c.status === 'completed'),
      value: calls ? `✅ (${calls.filter(c => c.status === 'completed').length})` : '❌'
    },
    {
      name: 'Calls have transcripts',
      pass: calls && calls.some(c => c.transcript && c.transcript.length > 0),
      value: calls ? `✅ (${calls.filter(c => c.transcript && c.transcript.length > 0).length})` : '❌'
    },
    {
      name: 'Calls linked to leads',
      pass: calls && calls.every(c => c.leads),
      value: calls && calls.every(c => c.leads) ? '✅' : '❌'
    }
  ];
  
  checks.forEach(check => {
    console.log(`   ${check.name}: ${check.value}`);
  });
  
  console.log('');
  
  const allPassed = checks.every(c => c.pass);
  
  if (allPassed) {
    console.log('🎉 All checks passed! Data flow is working correctly!');
    console.log('✅ Dashboard should display call data');
    console.log('✅ Excel report should generate successfully');
  } else {
    console.log('⚠️  Some checks failed. Issues to address:');
    checks.filter(c => !c.pass).forEach(check => {
      console.log(`   - ${check.name}`);
    });
  }
  
  console.log('');
  console.log('🧪 Test completed!');
}

// Run the test
testDataFlow().catch(console.error);