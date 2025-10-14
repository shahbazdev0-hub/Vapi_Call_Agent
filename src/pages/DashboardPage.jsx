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

  const downloadReport = async () => {
    if (!selectedOrder) {
      toast({
        title: "No Order Selected",
        description: "Please select an order first.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating Report",
        description: "Please wait while we prepare your Excel report...",
      });

      // Backend URL structure: http://localhost:5000/api
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
      const response = await fetch(`${backendUrl}/reports/download/${selectedOrder.id}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Order_Report_${selectedOrder.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Report downloaded successfully!",
      });

    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the report. Please try again.",
        variant: "destructive",
      });
    }
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
            <h2 className="text-xl font-bold text-gray-800">Order Report</h2>
            
            {/* Conditional Button Based on Order Status */}
            {selectedOrder.status === 'completed' ? (
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <Download size={20} />
                Download Report
              </button>
            ) : selectedOrder.status === 'processing' || selectedOrder.status === 'calling' ? (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
              >
                <Clock className="animate-spin" size={20} />
                Processing...
              </button>
            ) : selectedOrder.status === 'pending' ? (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg cursor-not-allowed"
              >
                <AlertCircle size={20} />
                Waiting to Start
              </button>
            ) : selectedOrder.status === 'failed' ? (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg cursor-not-allowed"
              >
                <AlertCircle size={20} />
                Process Failed
              </button>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
              >
                <AlertCircle size={20} />
                Not Available
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;