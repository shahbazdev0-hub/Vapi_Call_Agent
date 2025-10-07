require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');


// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Storage bucket names
const STORAGE_BUCKETS = {
  SPREADSHEETS: 'spreadsheets',
  REPORTS: 'reports',
  CALL_RECORDINGS: 'call-recordings'
};

// Database table names
const TABLES = {
  ORDERS: 'orders',
  LEADS: 'leads',
  CALLS: 'calls',
  CALL_LOGS: 'call_logs',
  REPORTS: 'reports'
};

module.exports = {
  supabase,
  STORAGE_BUCKETS,
  TABLES
};
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'OK' : 'MISSING');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'OK' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');