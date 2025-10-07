// FIXED ConversationReports.js with DEBUG LOGGING
// Replace your src/components/ConversationReports.js with this:

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  Users,
  Volume2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';

const ConversationReports = ({ orderId }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchReportData();
    } else {
      // Get orderId from URL if not passed as prop
      const urlOrderId = window.location.pathname.split('/').pop();
      if (urlOrderId) {
        fetchReportData(urlOrderId);
      }
    }
  }, [orderId]);

  const fetchReportData = async (orderIdParam = orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      const finalOrderId = orderIdParam || orderId;
      console.log('🔍 Fetching report data for order:', finalOrderId);
      
      // Try the new endpoint
      const response = await api.get(`/reports/order/${finalOrderId}/all`);
      
      console.log('📊 API Response:', response.data);
      
      if (response.data && response.data.success) {
        console.log('✅ Report data fetched successfully:', response.data.data);
        setReportData(response.data.data);
        
        // Debug the data structure
        console.log('📈 Summary:', response.data.data.summary);
        console.log('📞 All Calls:', response.data.data.allCalls);
        console.log('🎯 Categorized Calls:', response.data.data.categorizedCalls);
      } else {
        console.error('❌ API returned error:', response.data);
        setError('Failed to load report data: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Failed to fetch report data:', error);
      
      // More detailed error handling
      if (error.response?.status === 404) {
        setError('Report endpoint not found. Please add the missing API endpoints to your backend.');
      } else if (error.response?.status === 500) {
        setError(`Server error: ${error.response?.data?.message || error.message}`);
      } else if (error.code === 'NETWORK_ERROR') {
        setError('Network error: Please check if your backend server is running.');
      } else {
        setError(`Failed to load report data: ${error.response?.data?.message || error.message}`);
      }
      
      toast.error('Failed to load conversation reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format) => {
    try {
      console.log('📥 Downloading report format:', format);
      
      const finalOrderId = orderId || window.location.pathname.split('/').pop();
      const response = await api.get(`/reports/download/${finalOrderId}/${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${format}_report_${finalOrderId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format} report downloaded successfully!`);
    } catch (error) {
      console.error('❌ Download failed:', error);
      toast.error(`Failed to download ${format} report`);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      console.log('📊 Generating comprehensive report...');
      
      const finalOrderId = orderId || window.location.pathname.split('/').pop();
      const response = await api.post(`/reports/generate/${finalOrderId}`);
      
      if (response.data.success) {
        toast.success('Comprehensive report generated and sent via email! 📊');
        await fetchReportData(finalOrderId); // Refresh data
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('❌ Generate report failed:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const viewTranscript = async (call) => {
    try {
      console.log('📝 Fetching transcript for call:', call.id);
      
      const response = await api.get(`/reports/call/${call.id}/transcript`);
      
      if (response.data.success) {
        setSelectedCall(response.data.data);
        setShowTranscript(true);
      } else {
        toast.error('Failed to fetch transcript');
      }
    } catch (error) {
      console.error('❌ Failed to fetch transcript:', error);
      toast.error('Failed to fetch transcript');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-600" size={16} />;
      case 'failed':
        return <XCircle className="text-red-600" size={16} />;
      case 'in_progress':
        return <Clock className="text-yellow-600" size={16} />;
      default:
        return <Clock className="text-gray-600" size={16} />;
    }
  };

  const getConversationQuality = (call) => {
    const transcript = call.transcript || '';
    const duration = call.duration || 0;
    
    if (!transcript || transcript.length < 20) return 'No conversation';
    
    const wordCount = transcript.split(/\s+/).length;
    
    if (wordCount > 100 && duration > 60) return 'High quality';
    if (wordCount > 50 && duration > 30) return 'Medium quality';
    if (wordCount > 20) return 'Basic conversation';
    
    return 'Short interaction';
  };

  const getQualityColor = (call) => {
    const quality = getConversationQuality(call);
    if (quality.includes('High')) return 'text-green-600 bg-green-100';
    if (quality.includes('Medium')) return 'text-yellow-600 bg-yellow-100';
    if (quality.includes('Basic')) return 'text-blue-600 bg-blue-100';
    if (quality.includes('Short')) return 'text-purple-600 bg-purple-100';
    return 'text-gray-600 bg-gray-100';
  };

  // DEBUG: Log current state
  console.log('🎯 Current State:', {
    loading,
    error,
    reportData,
    orderId: orderId || window.location.pathname.split('/').pop()
  });

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-4"></div>
        <p>Loading conversation reports...</p>
        <p className="text-sm text-gray-500 mt-2">
          Order ID: {orderId || window.location.pathname.split('/').pop()}
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="card">
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="mr-2" size={20} />
          <h3 className="font-semibold">Error Loading Reports</h3>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="space-y-2">
          <button
            onClick={() => fetchReportData()}
            className="btn btn-primary mr-2"
          >
            Try Again
          </button>
          <div className="text-xs text-gray-500 mt-2">
            <p>Debug Info:</p>
            <p>Order ID: {orderId || window.location.pathname.split('/').pop()}</p>
            <p>API URL: /reports/order/{orderId || window.location.pathname.split('/').pop()}/all</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!reportData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
        <p>No report data available</p>
        <p className="text-sm text-gray-500">Order ID: {orderId || window.location.pathname.split('/').pop()}</p>
        <button
          onClick={() => fetchReportData()}
          className="btn btn-secondary mt-4"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DEBUG INFO */}
      <div className="card bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">🔍 Debug Information</h4>
        <div className="text-sm text-blue-700">
          <p><strong>Order ID:</strong> {reportData.orderId}</p>
          <p><strong>Total Calls:</strong> {reportData.allCalls?.length || 0}</p>
          <p><strong>API Response Time:</strong> {reportData.generatedAt}</p>
          <p><strong>High Quality Conversations:</strong> {reportData.categorizedCalls?.highQualityConversations?.length || 0}</p>
        </div>
      </div>

      {/* Report Header */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h2 className="card-title flex items-center">
              <MessageSquare className="mr-2" size={24} />
              Conversation Reports & Analytics
            </h2>
            <button
              onClick={generateReport}
              className="btn btn-primary"
              disabled={loading}
            >
              <Download className="mr-2" size={16} />
              Generate Full Report
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        {reportData.summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="flex items-center">
                <BarChart3 className="text-blue-600 mr-2" size={20} />
                <div>
                  <div className="stat-value">{reportData.summary.totalCalls}</div>
                  <div className="stat-label">Total Calls</div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-center">
                <MessageSquare className="text-green-600 mr-2" size={20} />
                <div>
                  <div className="stat-value">{reportData.summary.conversationStats?.callsWithConversations || 0}</div>
                  <div className="stat-label">With Conversations</div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-center">
                <CheckCircle className="text-purple-600 mr-2" size={20} />
                <div>
                  <div className="stat-value">{reportData.summary.verificationStats?.verifiedContacts || 0}</div>
                  <div className="stat-label">Verified Contacts</div>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-center">
                <Clock className="text-orange-600 mr-2" size={20} />
                <div>
                  <div className="stat-value">
                    {Math.round((reportData.summary.conversationStats?.totalDuration || 0) / 60)}m
                  </div>
                  <div className="stat-label">Total Talk Time</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Options */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => downloadReport('excel')}
            className="btn btn-secondary btn-sm"
          >
            <Download className="mr-1" size={14} />
            Comprehensive Report
          </button>
          <button
            onClick={() => downloadReport('conversations')}
            className="btn btn-secondary btn-sm"
          >
            <MessageSquare className="mr-1" size={14} />
            All Conversations
          </button>
          <button
            onClick={() => downloadReport('summary')}
            className="btn btn-secondary btn-sm"
          >
            <BarChart3 className="mr-1" size={14} />
            Summary Report
          </button>
        </div>
      </div>

      {/* High Quality Conversations */}
      {reportData.categorizedCalls?.highQualityConversations?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-lg mb-4 text-green-600">
            🌟 High Quality Conversations ({reportData.categorizedCalls.highQualityConversations.length})
          </h3>
          <div className="space-y-3">
            {reportData.categorizedCalls.highQualityConversations.slice(0, 5).map(call => (
              <div key={call.id} className="border rounded-lg p-3 bg-green-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{call.leads?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-600">{call.leads?.company}</div>
                    <div className="text-sm text-green-600">
                      {call.duration}s • {call.transcript?.split(' ').length || 0} words
                    </div>
                  </div>
                  <button
                    onClick={() => viewTranscript(call)}
                    className="btn btn-sm btn-secondary"
                  >
                    <Eye size={14} />
                  </button>
                </div>
                {call.transcript && (
                  <div className="mt-2 text-sm text-gray-700 bg-white p-2 rounded">
                    {call.transcript.substring(0, 150)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Conversations Table */}
      <div className="card">
        <h3 className="font-semibold text-lg mb-4">
          📞 All Call Conversations ({reportData.allCalls?.length || 0})
        </h3>
        
        {reportData.allCalls && reportData.allCalls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Conversation Quality</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportData.allCalls.map(call => (
                  <tr key={call.id}>
                    <td>{call.leads?.name || 'Unknown'}</td>
                    <td>{call.leads?.company || 'Unknown'}</td>
                    <td>{call.phone_number}</td>
                    <td>
                      <div className="flex items-center">
                        {getStatusIcon(call.status)}
                        <span className="ml-1 capitalize">{call.status}</span>
                      </div>
                    </td>
                    <td>{call.duration || 0}s</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs ${getQualityColor(call)}`}>
                        {getConversationQuality(call)}
                      </span>
                    </td>
                    <td>{new Date(call.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-1">
                        {call.transcript && (
                          <button
                            onClick={() => viewTranscript(call)}
                            className="btn btn-sm btn-secondary"
                            title="View Transcript"
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600">No calls found for this order</p>
          </div>
        )}
      </div>

      {/* Transcript Modal */}
      {showTranscript && selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Conversation with {selectedCall.lead?.name}
                </h3>
                <p className="text-gray-600">
                  {selectedCall.lead?.company} • {selectedCall.call?.phoneNumber}
                </p>
                <p className="text-sm text-gray-500">
                  Duration: {selectedCall.call?.duration}s • 
                  Date: {new Date(selectedCall.call?.startedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Complete Conversation Transcript:</h4>
              <div className="whitespace-pre-wrap text-sm">
                {selectedCall.transcript || 'No transcript available'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationReports;