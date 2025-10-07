// ========================================
// 1. COMPLETE ORDERS.JS FIX
// Replace server/routes/orders.js with this:
// ========================================

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase, TABLES } = require('../config/supabase');
const Joi = require('joi');

const router = express.Router();

// Order validation schema (updated)
const orderSchema = Joi.object({
  customerName: Joi.string().min(2).max(100).required(),
  customerEmail: Joi.string().email().required(),
  customerPhone: Joi.string().allow('').optional(),
  company: Joi.string().allow('').optional(),
  callStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
  callEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('18:00'),
  timezone: Joi.string().default('America/New_York'),
  maxRetries: Joi.number().min(0).max(5).default(2),
  customScript: Joi.string().allow('').optional()
});

/**
 * Create a new order
 * POST /api/orders
 */
router.post('/', async (req, res) => {
  try {
    console.log('Creating order with data:', req.body);

    // Validate order data
    const { error, value } = orderSchema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }

    // Create order record with snake_case columns
    const orderId = uuidv4();
    const orderData = {
      id: orderId,
      customer_name: value.customerName,
      customer_email: value.customerEmail,
      customer_phone: value.customerPhone || null,
      company: value.company || null,
      call_start_time: value.callStartTime,
      call_end_time: value.callEndTime,
      timezone: value.timezone,
      max_retries: value.maxRetries,
      custom_script: value.customScript || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Inserting order data:', orderData);

    const { data, error: insertError } = await supabase
      .from(TABLES.ORDERS)
      .insert([orderData])
      .select()
      .single();

    if (insertError) {
      console.error('Order creation error:', insertError);
      return res.status(500).json({
        error: 'Failed to create order',
        message: insertError.message
      });
    }

    console.log('Order created successfully:', data);

    res.status(201).json({
      success: true,
      order: data,
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get order by ID
 * GET /api/orders/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching order:', id);

    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', id)
      .single();

    if (orderError) {
      console.error('Order fetch error:', orderError);
      return res.status(404).json({
        error: 'Order not found',
        message: orderError.message
      });
    }

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Get leads count for this order
    let leadsCount = 0;
    try {
      const { count } = await supabase
        .from(TABLES.LEADS)
        .select('*', { count: 'exact', head: true })
        .eq('order_id', id);
      leadsCount = count || 0;
    } catch (error) {
      console.error('Error fetching leads count:', error);
    }

    // Get calls count and status
    let calls = [];
    let callStats = {};
    try {
      const { data: callsData } = await supabase
        .from(TABLES.CALLS)
        .select('status')
        .eq('order_id', id);

      calls = callsData || [];
      callStats = calls.reduce((acc, call) => {
        if (call && call.status) {
          acc[call.status] = (acc[call.status] || 0) + 1;
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching calls:', error);
    }

    // Get report if exists
    let report = null;
    try {
      const { data: reportData } = await supabase
        .from(TABLES.REPORTS)
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      report = reportData;
    } catch (error) {
      // Report doesn't exist, which is fine
    }

    res.json({
      success: true,
      order: {
        ...order,
        stats: {
          totalLeads: leadsCount,
          calls: callStats,
          totalCalls: calls.length,
          hasReport: !!report
        }
      }
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get all orders with pagination
 * GET /api/orders
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { data: orders, error, count } = await supabase
      .from(TABLES.ORDERS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get orders error:', error);
      return res.status(500).json({
        error: 'Failed to fetch orders',
        message: error.message
      });
    }

    res.json({
      success: true,
      orders: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Update order status
 * PUT /api/orders/:id/status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        validStatuses
      });
    }

    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Order not found or update failed'
      });
    }

    res.json({
      success: true,
      order: data,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Delete order (admin only)
 * DELETE /api/orders/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related records first
    await supabase.from(TABLES.CALLS).delete().eq('order_id', id);
    await supabase.from(TABLES.LEADS).delete().eq('order_id', id);
    await supabase.from(TABLES.REPORTS).delete().eq('order_id', id);

    const { error } = await supabase
      .from(TABLES.ORDERS)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete order error:', error);
      return res.status(500).json({
        error: 'Failed to delete order',
        message: error.message
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
