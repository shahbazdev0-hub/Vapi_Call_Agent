import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { getCurrentUser, getUserOrders, getCallReport, signOut } from '@/services/authApi';
import { useToast } from '@/components/ui/use-toast';

function DashboardPage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [callReport, setCallReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { user, error } = await getCurrentUser();
    
    if (error || !user) {
      navigate('/login');
      return;
    }

    setUser(user);
    
    const { data: ordersData } = await getUserOrders(user.email);
    if (ordersData && ordersData.length > 0) {
      setOrders(ordersData);
      setSelectedOrder(ordersData[0]);
      loadCallReport(ordersData[0].id);
    }
    
    setLoading(false);
  };

  const loadCallReport = async (orderId) => {
    const { data } = await getCallReport(orderId);
    if (data) {
      setCallReport(data);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/');
  };

  const downloadReport = () => {
    if (!callReport || callReport.length === 0) {
      toast({
        title: "No Data",
        description: "No call data available to download.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      ['Lead Name', 'Company', 'Phone', 'Status', 'Duration', 'Timestamp', 'Verified', 'Transcript'],
      ...callReport.map(call => [
        call.leads?.name || 'N/A',
        call.leads?.company || 'N/A',
        call.leads?.phone || 'N/A',
        call.status,
        call.duration || '0:00',
        new Date(call.created_at).toLocaleString(),
        call.transcript && call.transcript.length > 50 ? 'Yes' : 'No',
        call.transcript ? call.transcript.substring(0, 100) + '...' : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call_report_${selectedOrder?.id}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!selectedOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Order Dashboard</h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Orders Found</h2>
            <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Place an Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completedCalls = callReport.filter(c => c.status === 'completed').length;
  const failedCalls = callReport.filter(c => c.status === 'failed').length;
  const verifiedCalls = callReport.filter(c => c.transcript && c.transcript.length > 50).length;
  const totalCalls = callReport.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Order Dashboard</h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Order Selector */}
        {orders.length > 1 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Order</label>
            <select
              value={selectedOrder.id}
              onChange={(e) => {
                const order = orders.find(o => o.id === e.target.value);
                setSelectedOrder(order);
                loadCallReport(order.id);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  Order {order.id} - {new Date(order.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Order Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Order Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="text-lg font-semibold text-gray-800">{selectedOrder.id}</p>
                </div>
                <Phone className="text-blue-500" size={32} />
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-green-600 capitalize">{selectedOrder.status}</p>
                </div>
                <CheckCircle className="text-green-500" size={32} />
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {new Date(selectedOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Clock className="text-purple-500" size={32} />
              </div>
            </div>
          </div>

          {/* Progress */}
          {totalCalls > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Calls Progress</span>
                <span>{completedCalls} / {totalCalls}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all"
                  style={{ width: `${totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Call Report */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Call Report</h2>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Download size={20} />
              Download Report
            </button>
          </div>

          {totalCalls > 0 ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{completedCalls}</p>
                  <p className="text-sm text-gray-600">Successful Calls</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{failedCalls}</p>
                  <p className="text-sm text-gray-600">Failed Calls</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{verifiedCalls}</p>
                  <p className="text-sm text-gray-600">Verified Contacts</p>
                </div>
              </div>

              {/* Call Details Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Lead Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Company</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {callReport.map(call => (
                      <tr key={call.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-800">{call.leads?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{call.leads?.company || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{call.leads?.phone || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            call.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{call.duration || '0:00'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(call.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {call.transcript && call.transcript.length > 50 ? (
                            <CheckCircle className="text-green-500" size={20} />
                          ) : (
                            <AlertCircle className="text-red-500" size={20} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600">No call data available yet</p>
              <p className="text-sm text-gray-500 mt-2">Calls will appear here once processing begins</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;