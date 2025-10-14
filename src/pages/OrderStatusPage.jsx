import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { getOrderDetails, getCallStatus, startCalling, generateReport } from '@/services/backendApi';
import { Loader2, Play, Download, RefreshCw } from 'lucide-react';
import DynamicBackground from '@/components/DynamicBackground';

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderData();
    const interval = setInterval(fetchCallStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      const response = await getOrderDetails(orderId);
      setOrder(response.order);
      await fetchCallStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCallStatus = async () => {
    try {
      const response = await getCallStatus(orderId);
      setCallStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch call status');
    }
  };

  const handleStartCalling = async () => {
    try {
      await startCalling(orderId);
      toast({
        title: "✅ Calling Started!",
        description: "Calls are now being made to your leads.",
      });
      fetchCallStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not start calling process",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async () => {
    try {
      await generateReport(orderId);
      toast({
        title: "📊 Report Generated!",
        description: "Check your email for the detailed report.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not generate report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <DynamicBackground />
      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Order Status</h1>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">Order Details</h2>
          <div className="space-y-2">
            <p><strong>Order ID:</strong> {order?.id}</p>
            <p><strong>Customer:</strong> {order?.customer_name}</p>
            <p><strong>Email:</strong> {order?.customer_email}</p>
            <p><strong>Status:</strong> <span className="font-bold text-orange-600">{order?.status}</span></p>
          </div>
        </div>

        {callStatus && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold mb-4">Call Progress</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{callStatus.stats.total || 0}</p>
                <p className="text-gray-600">Total Calls</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{callStatus.stats.completed || 0}</p>
                <p className="text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{callStatus.stats.failed || 0}</p>
                <p className="text-gray-600">Failed</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          {order?.status === 'processing' && (
            <Button onClick={handleStartCalling} className="bg-green-500 hover:bg-green-600">
              <Play className="w-5 h-5 mr-2" /> Start Calling
            </Button>
          )}
          
          {order?.status === 'completed' && (
            <Button onClick={handleGenerateReport} className="bg-blue-500 hover:bg-blue-600">
              <Download className="w-5 h-5 mr-2" /> Generate Report
            </Button>
          )}
          
          <Button onClick={fetchOrderData} variant="outline">
            <RefreshCw className="w-5 h-5 mr-2" /> Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusPage;