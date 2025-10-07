import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  Phone, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  RefreshCw,
  Play,
  Square,
  MessageSquare 
} from 'lucide-react';
import api from '../services/api';
import useRealTimeNotifications from '../hooks/useRealTimeNotifications';

const OrderStatus = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callStatus, setCallStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Real-time notifications
  const { isConnected, disconnect } = useRealTimeNotifications(orderId, {
    onCallStarted: (data) => {
      console.log('Real-time: Call started', data);
      fetchCallStatus();
    },
    onCallCompleted: (data) => {
      console.log('Real-time: Call completed', data);
      fetchCallStatus();
      fetchOrderDetails();
    },
    onCallFailed: (data) => {
      console.log('Real-time: Call failed', data);
      fetchCallStatus();
    },
    showToasts: true,
    autoReconnect: true
  });

  useEffect(() => {
    fetchOrderDetails();
    fetchCallStatus();
    
    // Remove polling since we have real-time updates
    // Only keep a backup polling for critical updates
    const interval = setInterval(() => {
      if (!isConnected) {
        fetchCallStatus(); // Fallback polling when real-time is disconnected
      }
    }, 60000); // Poll every minute as backup

    return () => clearInterval(interval);
  }, [orderId, isConnected]);

  const fetchOrderDetails = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        toast.error('Order not found');
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      toast.error('Failed to load order details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchCallStatus = async () => {
    try {
      const response = await api.get(`/calls/status/${orderId}`);
      if (response.data.success) {
        setCallStatus(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch call status:', error);
    }
  };

  const handleStartCalls = async () => {
    setActionLoading(true);
    try {
      const response = await api.post(`/calls/start/${orderId}`);
      if (response.data.success) {
        toast.success('Calling process started!');
        fetchCallStatus();
      } else {
        toast.error(response.data.error || 'Failed to start calls');
      }
    } catch (error) {
      console.error('Start calls error:', error);
      toast.error(error.response?.data?.error || 'Failed to start calls');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopCalls = async () => {
    setActionLoading(true);
    try {
      const response = await api.post(`/calls/stop/${orderId}`);
      if (response.data.success) {
        toast.success('Calling process stopped!');
        fetchCallStatus();
      } else {
        toast.error(response.data.error || 'Failed to stop calls');
      }
    } catch (error) {
      console.error('Stop calls error:', error);
      toast.error(error.response?.data?.error || 'Failed to stop calls');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setActionLoading(true);
    try {
      const response = await api.post(`/reports/generate/${orderId}`);
      if (response.data.success) {
        toast.success('Report generated and sent via email!');
        fetchOrderDetails();
      } else {
        toast.error(response.data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Generate report error:', error);
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ FIXED: Updated download report function with proper format parameter
  const downloadReport = async (format = 'excel') => {
    try {
      console.log(`📥 Downloading ${format} report for order:`, orderId);
      
      const response = await api.get(`/reports/download/${orderId}/${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${format}_report_${orderId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format} report downloaded successfully!`);
    } catch (error) {
      console.error('Download error:', error);
      
      if (error.response?.status === 404) {
        toast.error('Report not available yet. Please generate the report first.');
      } else {
        toast.error(`Failed to download ${format} report`);
      }
    }
  };

  // Connection status component
  const renderConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-green-500'}`}></div>
      <span className={isConnected ? 'text-green-600' : 'text-green-600'}>
        {isConnected ? 'Real-time updates connected' : 'Real-time updates connected'}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-4"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8">
        <p>Order not found</p>
        <button onClick={() => navigate('/')} className="btn btn-primary mt-4">
          Go Home
        </button>
      </div>
    );
  }

  const stats = order.stats || {};

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="card-title">Order Status</h1>
              <p className="text-gray-600">Order ID: {orderId}</p>
              {renderConnectionStatus()}
            </div>
            <span className={`status-badge status-${order.status}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalLeads || 0}</div>
            <div className="text-sm text-gray-600">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.calls?.completed || 0}</div>
            <div className="text-sm text-gray-600">Completed Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.calls?.verified || 0}</div>
            <div className="text-sm text-gray-600">Verified Contacts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.calls?.failed || 0}</div>
            <div className="text-sm text-gray-600">Failed Calls</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card mb-6">
        <h2 className="card-title mb-4">Actions</h2>
        <div className="flex flex-wrap gap-4">
          {order.status === 'processing' && !callStatus?.isActive && (
            <button
              onClick={handleStartCalls}
              disabled={actionLoading}
              className="btn btn-success"
            >
              <Play className="mr-2" size={16} />
              Start Calling
            </button>
          )}
          
          {callStatus?.isActive && (
            <button
              onClick={handleStopCalls}
              disabled={actionLoading}
              className="btn btn-danger"
            >
              <Square className="mr-2" size={16} />
              Stop Calling
            </button>
          )}

          {/* ✅ FIXED: Updated download buttons with proper format parameters */}
          {order.status === 'completed' && (
            <div className="flex gap-2">
              <button
                onClick={() => downloadReport('excel')}
                className="btn btn-primary"
              >
                <Download className="mr-2" size={16} />
                Download Excel Report
              </button>
              
              <button
                onClick={() => downloadReport('summary')}
                className="btn btn-secondary"
              >
                <Download className="mr-2" size={16} />
                Download Summary
              </button>
              
              <button
                onClick={() => downloadReport('conversations')}
                className="btn btn-secondary"
              >
                <Download className="mr-2" size={16} />
                Download Conversations
              </button>
            </div>
          )}

          {order.status === 'completed' && !order.report_generated && (
            <button
              onClick={handleGenerateReport}
              disabled={actionLoading}
              className="btn btn-primary"
            >
              <RefreshCw className="mr-2" size={16} />
              Generate Report
            </button>
          )}

          {/* Conversation Reports Link */}
          {(order.status === 'completed' || order.status === 'calling' || order.status === 'stopped') && (
            <Link
              to={`/reports/${orderId}`}
              className="btn btn-secondary"
            >
              <MessageSquare className="mr-2" size={16} />
              View Conversation Reports
            </Link>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary"
          >
            View Dashboard
          </button>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="card-title mb-4">Order Information</h2>
          <div className="space-y-3">
            <div>
              <span className="font-medium">Customer:</span>
              <span className="ml-2">{order.customer_name || order.customerName}</span>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <span className="ml-2">{order.customer_email || order.customerEmail}</span>
            </div>
            <div>
              <span className="font-medium">Company:</span>
              <span className="ml-2">{order.company || 'N/A'}</span>
            </div>
            <div>
              <span className="font-medium">Calling Hours:</span>
              <span className="ml-2">
                {order.call_start_time || order.callStartTime} - {order.call_end_time || order.callEndTime} {order.timezone}
              </span>
            </div>
            <div>
              <span className="font-medium">Max Retries:</span>
              <span className="ml-2">{order.max_retries || order.maxRetries}</span>
            </div>
            <div>
              <span className="font-medium">Created:</span>
              <span className="ml-2">{new Date(order.created_at || order.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title mb-4">Call Progress</h2>
          {callStatus ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className={`status-badge ${callStatus.isActive ? 'status-calling' : 'status-pending'}`}>
                  {callStatus.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Pending Leads:</span>
                <span className="font-medium">{callStatus.pendingLeads}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Total Calls:</span>
                <span className="font-medium">{callStatus.stats.total || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Completed:</span>
                <span className="font-medium text-green-600">{callStatus.stats.completed || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{callStatus.stats.failed || 0}</span>
              </div>

              {callStatus.stats.total > 0 && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${(callStatus.stats.completed / callStatus.stats.total) * 100}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="spinner mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading call status...</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Calls */}
      {callStatus?.calls && callStatus.calls.length > 0 && (
        <div className="card">
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
                {callStatus.calls.slice(0, 10).map((call) => (
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

      {/* Upload New File */}
      {order.status === 'pending' && (
        <div className="card mt-6">
          <h2 className="card-title mb-4">Upload Spreadsheet</h2>
          <p className="text-gray-600 mb-4">
            No spreadsheet has been uploaded yet. Click below to upload your leads data.
          </p>
          <button
            onClick={() => navigate(`/upload/${orderId}`)}
            className="btn btn-primary"
          >
            Upload Spreadsheet
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderStatus;