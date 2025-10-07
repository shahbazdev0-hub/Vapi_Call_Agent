const express = require('express');
const { supabase, TABLES } = require('../config/supabase');

const router = express.Router();

/**
 * Get dashboard overview statistics
 * GET /api/dashboard/overview
 */
router.get('/overview', async (req, res) => {
  try {
    console.log('Starting dashboard overview fetch...');

    // Get total orders with better error handling
    let totalOrders = 0;
    try {
      const { count } = await supabase
        .from(TABLES.ORDERS)
        .select('*', { count: 'exact', head: true });
      totalOrders = count || 0;
      console.log('Total orders:', totalOrders);
    } catch (error) {
      console.error('Error fetching total orders:', error);
    }

    // Get orders by status with null safety
    let statusCounts = {};
    try {
      const { data: ordersByStatus, error } = await supabase
        .from(TABLES.ORDERS)
        .select('status');
      
      if (error) {
        console.error('Error fetching orders by status:', error);
      } else {
        console.log('Orders by status data:', ordersByStatus);
        statusCounts = Array.isArray(ordersByStatus) 
          ? ordersByStatus.reduce((acc, order) => {
              if (order && order.status) {
                acc[order.status] = (acc[order.status] || 0) + 1;
              }
              return acc;
            }, {})
          : {};
      }
    } catch (error) {
      console.error('Error processing orders by status:', error);
    }

    // Get total leads with error handling
    let totalLeads = 0;
    try {
      const { count } = await supabase
        .from(TABLES.LEADS)
        .select('*', { count: 'exact', head: true });
      totalLeads = count || 0;
      console.log('Total leads:', totalLeads);
    } catch (error) {
      console.error('Error fetching total leads:', error);
    }

    // Get leads by status with null safety
    let leadStatusCounts = {};
    try {
      const { data: leadsByStatus, error } = await supabase
        .from(TABLES.LEADS)
        .select('status');
      
      if (error) {
        console.error('Error fetching leads by status:', error);
      } else {
        console.log('Leads by status data:', leadsByStatus);
        leadStatusCounts = Array.isArray(leadsByStatus)
          ? leadsByStatus.reduce((acc, lead) => {
              if (lead && lead.status) {
                acc[lead.status] = (acc[lead.status] || 0) + 1;
              }
              return acc;
            }, {})
          : {};
      }
    } catch (error) {
      console.error('Error processing leads by status:', error);
    }

    // Get total calls with error handling
    let totalCalls = 0;
    try {
      const { count } = await supabase
        .from(TABLES.CALLS)
        .select('*', { count: 'exact', head: true });
      totalCalls = count || 0;
      console.log('Total calls:', totalCalls);
    } catch (error) {
      console.error('Error fetching total calls:', error);
    }

    // Get calls by status with null safety
    let callStatusCounts = {};
    let totalCallDuration = 0;
    try {
      const { data: callsByStatus, error } = await supabase
        .from(TABLES.CALLS)
        .select('status, duration');
      
      if (error) {
        console.error('Error fetching calls by status:', error);
      } else {
        console.log('Calls by status data:', callsByStatus);
        if (Array.isArray(callsByStatus)) {
          callStatusCounts = callsByStatus.reduce((acc, call) => {
            if (call && call.status) {
              acc[call.status] = (acc[call.status] || 0) + 1;
            }
            return acc;
          }, {});

          // Calculate total call duration
          totalCallDuration = callsByStatus.reduce((total, call) => {
            return total + (call && typeof call.duration === 'number' ? call.duration : 0);
          }, 0);
        }
      }
    } catch (error) {
      console.error('Error processing calls by status:', error);
    }

    // Get recent orders with error handling
    let recentOrders = [];
    try {
      const { data, error } = await supabase
        .from(TABLES.ORDERS)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('Error fetching recent orders:', error);
      } else {
        recentOrders = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('Error processing recent orders:', error);
    }

    // Get recent calls with error handling
    let recentCalls = [];
    try {
      const { data, error } = await supabase
        .from(TABLES.CALLS)
        .select(`
          *,
          leads(name, phone, company),
          orders(customer_name, customer_email)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching recent calls:', error);
      } else {
        recentCalls = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('Error processing recent calls:', error);
    }

    console.log('Dashboard overview completed successfully');

    res.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          totalLeads,
          totalCalls,
          totalCallDuration,
          averageCallDuration: totalCalls > 0 ? Math.round(totalCallDuration / totalCalls) : 0
        },
        statusCounts: {
          orders: statusCounts,
          leads: leadStatusCounts,
          calls: callStatusCounts
        },
        recentOrders,
        recentCalls
      }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get orders with detailed information
 * GET /api/dashboard/orders
 */
router.get('/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    let query = supabase
      .from(TABLES.ORDERS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get orders error:', error);
      return res.status(500).json({
        error: 'Failed to fetch orders',
        message: error.message
      });
    }

    // Get additional stats for each order
    const ordersWithStats = await Promise.all(
      (orders || []).map(async (order) => {
        try {
          // Get leads count
          const { count: leadsCount } = await supabase
            .from(TABLES.LEADS)
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id);

          // Get calls count
          const { count: callsCount } = await supabase
            .from(TABLES.CALLS)
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id);

          // Get completed calls count
          const { count: completedCallsCount } = await supabase
            .from(TABLES.CALLS)
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id)
            .eq('status', 'completed');

          return {
            ...order,
            stats: {
              totalLeads: leadsCount || 0,
              totalCalls: callsCount || 0,
              completedCalls: completedCallsCount || 0
            }
          };
        } catch (statsError) {
          console.error('Error fetching stats for order:', order.id, statsError);
          return {
            ...order,
            stats: {
              totalLeads: 0,
              totalCalls: 0,
              completedCalls: 0
            }
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        orders: ordersWithStats,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard orders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get detailed order information
 * GET /api/dashboard/orders/:orderId
 */
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

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

    // Get leads for this order
    const { data: leads, error: leadsError } = await supabase
      .from(TABLES.LEADS)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (leadsError) {
      console.error('Get leads error:', leadsError);
    }

    // Get calls for this order
    const { data: calls, error: callsError } = await supabase
      .from(TABLES.CALLS)
      .select(`
        *,
        leads(name, phone, company)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (callsError) {
      console.error('Get calls error:', callsError);
    }

    // Get report if exists
    const { data: report } = await supabase
      .from(TABLES.REPORTS)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate statistics with null safety
    const callsArray = Array.isArray(calls) ? calls : [];
    const leadsArray = Array.isArray(leads) ? leads : [];
    
    const stats = {
      totalLeads: leadsArray.length,
      totalCalls: callsArray.length,
      completedCalls: callsArray.filter(call => call && call.status === 'completed').length,
      failedCalls: callsArray.filter(call => call && call.status === 'failed').length,
      verifiedContacts: callsArray.filter(call => 
        call && 
        call.status === 'completed' && 
        call.transcript && 
        call.transcript.length > 50
      ).length,
      totalCallDuration: callsArray.reduce((total, call) => 
        total + (call && typeof call.duration === 'number' ? call.duration : 0), 0
      )
    };

    stats.averageCallDuration = stats.completedCalls > 0 
      ? Math.round(stats.totalCallDuration / stats.completedCalls) 
      : 0;

    res.json({
      success: true,
      data: {
        order,
        leads: leadsArray,
        calls: callsArray,
        report,
        stats
      }
    });

  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Manually trigger reprocessing of an order
 * POST /api/dashboard/reprocess/:orderId
 */
router.post('/reprocess/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

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

    // Reset all leads to pending status
    const { error: resetError } = await supabase
      .from(TABLES.LEADS)
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (resetError) {
      console.error('Reset leads error:', resetError);
      return res.status(500).json({
        error: 'Failed to reset leads status'
      });
    }

    // Delete existing calls for this order
    const { error: deleteCallsError } = await supabase
      .from(TABLES.CALLS)
      .delete()
      .eq('order_id', orderId);

    if (deleteCallsError) {
      console.error('Delete calls error:', deleteCallsError);
    }

    // Update order status
    const { error: updateError } = await supabase
      .from(TABLES.ORDERS)
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Update order error:', updateError);
      return res.status(500).json({
        error: 'Failed to update order status'
      });
    }

    res.json({
      success: true,
      message: 'Order reprocessing initiated successfully'
    });

  } catch (error) {
    console.error('Reprocess order error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Get system health status
 * GET /api/dashboard/health
 */
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from(TABLES.ORDERS)
      .select('count')
      .limit(1);

    // Test storage connection
    const { data: storageTest, error: storageError } = await supabase.storage
      .from('spreadsheets')
      .list('', { limit: 1 });

    const health = {
      database: !dbError,
      storage: !storageError,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    const isHealthy = health.database && health.storage;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      health
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

module.exports = router;