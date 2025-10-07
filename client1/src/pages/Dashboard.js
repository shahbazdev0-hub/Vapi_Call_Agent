import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // ✅ ADD THIS IMPORT
import { toast } from 'react-toastify';
import useRealTimeNotifications from '../hooks/useRealTimeNotifications';
import { 
  BarChart3, 
  Users, 
  Phone, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Eye,
  Trash2,
  MessageSquare // ✅ ADD THIS IMPORT
} from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchOverview();
    fetchOrders();
  }, [currentPage, selectedStatus]);

  const fetchOverview = async () => {
    try {
      const response = await api.get('/dashboard/overview');
      if (response.data.success) {
        setOverview(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch overview:', error);
      toast.error('Failed to load dashboard overview');
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (selectedStatus) {
        params.append('status', selectedStatus);
      }

      const response = await api.get(`/dashboard/orders?${params}`);
      if (response.data.success) {
        setOrders(response.data.data.orders);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setOrdersLoading(false);
      setLoading(false);
    }
  };

  const handleReprocessOrder = async (orderId) => {
    try {
      const response = await api.post(`/dashboard/reprocess/${orderId}`);
      if (response.data.success) {
        toast.success('Order reprocessing initiated');
        fetchOrders();
      } else {
        toast.error(response.data.error || 'Failed to reprocess order');
      }
    } catch (error) {
      console.error('Reprocess error:', error);
      toast.error(error.response?.data?.error || 'Failed to reprocess order');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/orders/${orderId}`);
      if (response.data.success) {
        toast.success('Order deleted successfully');
        fetchOrders();
        fetchOverview();
      } else {
        toast.error(response.data.error || 'Failed to delete order');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete order');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'status-pending',
      processing: 'status-processing',
      calling: 'status-calling',
      completed: 'status-completed',
      failed: 'status-failed',
      cancelled: 'status-cancelled'
    };
    return colors[status] || 'status-pending';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-4"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="card-header">
          <h1 className="card-title flex items-center">
            <BarChart3 className="mr-2" size={24} />
            Admin Dashboard
          </h1>
          <p className="text-gray-600">Monitor and manage all lead calling orders</p>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="stat-value">{overview.overview.totalOrders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overview.overview.totalLeads}</div>
            <div className="stat-label">Total Leads</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{overview.overview.totalCalls}</div>
            <div className="stat-label">Total Calls</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {overview.overview.averageCallDuration > 0 
                ? `${Math.round(overview.overview.averageCallDuration / 60)}m` 
                : '0s'
              }
            </div>
            <div className="stat-label">Avg Call Duration</div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h2 className="card-title">Orders</h2>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="form-select"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="calling">Calling</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={fetchOrders}
                disabled={ordersLoading}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw className={`mr-1 ${ordersLoading ? 'animate-spin' : ''}`} size={14} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {ordersLoading ? (
          <div className="text-center py-8">
            <div className="spinner mx-auto mb-4"></div>
            <p>Loading orders...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Leads</th>
                    <th>Calls</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((orderItem) => ( // ✅ RENAMED 'order' to 'orderItem'
                    <tr key={orderItem.id}>
                      <td>
                        <Link 
                          to={`/order/${orderItem.id}`}
                          className="text-blue-600 hover:underline font-mono text-sm"
                        >
                          {orderItem.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td>{orderItem.customer_name || orderItem.customerName}</td>
                      <td>{orderItem.customer_email || orderItem.customerEmail}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(orderItem.status)}`}>
                          {orderItem.status}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div>Total: {orderItem.stats?.totalLeads || 0}</div>
                          <div className="text-gray-600">
                            Completed: {orderItem.stats?.completedCalls || 0}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          <div>Total: {orderItem.stats?.totalCalls || 0}</div>
                          <div className="text-green-600">
                            Completed: {orderItem.stats?.completedCalls || 0}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {new Date(orderItem.created_at || orderItem.createdAt).toLocaleDateString()}
                          <div className="text-gray-600">
                            {new Date(orderItem.created_at || orderItem.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Link
                            to={`/order/${orderItem.id}`}
                            className="btn btn-secondary btn-sm"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </Link>
                          
                          {/* ✅ ADD CONVERSATION REPORTS LINK */}
                          {(orderItem.status === 'completed' || orderItem.status === 'calling') && (
                            <Link
                              to={`/reports/${orderItem.id}`}
                              className="btn btn-primary btn-sm"
                              title="View Conversation Reports"
                            >
                              <MessageSquare size={14} />
                            </Link>
                          )}
                          
                          {(orderItem.status === 'failed' || orderItem.status === 'completed') && (
                            <button
                              onClick={() => handleReprocessOrder(orderItem.id)}
                              className="btn btn-primary btn-sm"
                              title="Reprocess"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteOrder(orderItem.id)}
                            className="btn btn-danger btn-sm"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Activity */}
      {overview?.recentCalls && overview.recentCalls.length > 0 && (
        <div className="card mt-6">
          <h2 className="card-title mb-4">Recent Calls</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentCalls.slice(0, 10).map((call) => (
                  <tr key={call.id}>
                    <td>{call.leads?.name || 'N/A'}</td>
                    <td>{call.phone_number || call.phoneNumber}</td>
                    <td>{call.leads?.company || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${call.status}`}>
                        {call.status}
                      </span>
                    </td>
                    <td>{call.duration ? `${call.duration}s` : '-'}</td>
                    <td>{new Date(call.created_at || call.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card mt-6">
        <h2 className="card-title mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link to="/create-order" className="btn btn-primary">
            Create New Order
          </Link>
          <button onClick={fetchOverview} className="btn btn-secondary">
            <RefreshCw className="mr-2" size={16} />
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;