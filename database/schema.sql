-- Supabase Database Schema for Lead Calling System

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    company VARCHAR(200),
    call_start_time TIME DEFAULT '09:00',
    call_end_time TIME DEFAULT '18:00',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    max_retries INTEGER DEFAULT 2,
    custom_script TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'calling', 'completed', 'failed', 'cancelled', 'stopped')),
    spreadsheet_file VARCHAR(255),
    total_leads INTEGER DEFAULT 0,
    report_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    title VARCHAR(100),
    address VARCHAR(500),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    vapi_call_id VARCHAR(100),
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'queued', 'ringing', 'in_progress', 'completed', 'failed')),
    duration INTEGER DEFAULT 0,
    transcript TEXT,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call logs table (for detailed logging)
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    total_leads INTEGER NOT NULL,
    completed_calls INTEGER DEFAULT 0,
    verified_contacts INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

CREATE INDEX IF NOT EXISTS idx_leads_order_id ON leads(order_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

CREATE INDEX IF NOT EXISTS idx_calls_order_id ON calls(order_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_vapi_call_id ON calls(vapi_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_reports_order_id ON reports(order_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('spreadsheets', 'spreadsheets', false),
    ('reports', 'reports', false),
    ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage buckets
CREATE POLICY "Users can upload spreadsheets" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'spreadsheets');

CREATE POLICY "Users can view spreadsheets" ON storage.objects
    FOR SELECT WITH CHECK (bucket_id = 'spreadsheets');

CREATE POLICY "Users can view reports" ON storage.objects
    FOR SELECT WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Users can upload reports" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'reports');

-- Create RLS policies for tables (if needed for security)
-- Note: These policies assume you want full access for now
-- You may want to restrict access based on user authentication

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust based on your security requirements)
CREATE POLICY "Allow all operations on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all operations on calls" ON calls FOR ALL USING (true);
CREATE POLICY "Allow all operations on call_logs" ON call_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on reports" ON reports FOR ALL USING (true);

-- Create a view for order statistics
CREATE OR REPLACE VIEW order_statistics AS
SELECT 
    o.id,
    o.customer_name,
    o.customer_email,
    o.status as order_status,
    o.created_at,
    COUNT(l.id) as total_leads,
    COUNT(CASE WHEN l.status = 'pending' THEN 1 END) as pending_leads,
    COUNT(CASE WHEN l.status = 'calling' THEN 1 END) as calling_leads,
    COUNT(CASE WHEN l.status = 'completed' THEN 1 END) as completed_leads,
    COUNT(CASE WHEN l.status = 'failed' THEN 1 END) as failed_leads,
    COUNT(c.id) as total_calls,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN c.status = 'failed' THEN 1 END) as failed_calls,
    COUNT(CASE WHEN c.status = 'completed' AND c.transcript IS NOT NULL AND LENGTH(c.transcript) > 50 THEN 1 END) as verified_contacts,
    COALESCE(SUM(c.duration), 0) as total_call_duration,
    CASE 
        WHEN COUNT(CASE WHEN c.status = 'completed' THEN 1 END) > 0 
        THEN ROUND(AVG(CASE WHEN c.status = 'completed' THEN c.duration END))
        ELSE 0 
    END as average_call_duration
FROM orders o
LEFT JOIN leads l ON o.id = l.order_id
LEFT JOIN calls c ON o.id = c.order_id
GROUP BY o.id, o.customer_name, o.customer_email, o.status, o.created_at;

-- Create a function to get calling statistics
CREATE OR REPLACE FUNCTION get_calling_stats(order_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_leads', COUNT(l.id),
        'pending_leads', COUNT(CASE WHEN l.status = 'pending' THEN 1 END),
        'calling_leads', COUNT(CASE WHEN l.status = 'calling' THEN 1 END),
        'completed_leads', COUNT(CASE WHEN l.status = 'completed' THEN 1 END),
        'failed_leads', COUNT(CASE WHEN l.status = 'failed' THEN 1 END),
        'total_calls', COUNT(c.id),
        'completed_calls', COUNT(CASE WHEN c.status = 'completed' THEN 1 END),
        'failed_calls', COUNT(CASE WHEN c.status = 'failed' THEN 1 END),
        'verified_contacts', COUNT(CASE WHEN c.status = 'completed' AND c.transcript IS NOT NULL AND LENGTH(c.transcript) > 50 THEN 1 END),
        'total_call_duration', COALESCE(SUM(c.duration), 0),
        'average_call_duration', CASE 
            WHEN COUNT(CASE WHEN c.status = 'completed' THEN 1 END) > 0 
            THEN ROUND(AVG(CASE WHEN c.status = 'completed' THEN c.duration END))
            ELSE 0 
        END
    ) INTO result
    FROM orders o
    LEFT JOIN leads l ON o.id = l.order_id
    LEFT JOIN calls c ON o.id = c.order_id
    WHERE o.id = order_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional)
-- INSERT INTO orders (customer_name, customer_email, company, call_start_time, call_end_time) VALUES
-- ('John Doe', 'john@example.com', 'Acme Corp', '09:00', '17:00'),
-- ('Jane Smith', 'jane@example.com', 'Tech Solutions', '08:00', '18:00');
