import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OrderContext } from '@/contexts/OrderContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, ShoppingCart, CheckCircle, ArrowRight } from 'lucide-react';
import DynamicBackground from '@/components/DynamicBackground';
import { createBackendOrder, uploadSpreadsheet } from '@/services/backendApi';

const CheckoutPage = () => {
  const { initialOrder, upsells, orderId, setOrderId, resetOrder } = useContext(OrderContext);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [backendOrderId, setBackendOrderId] = useState(null);

  useEffect(() => {
    if (!initialOrder) {
      navigate('/');
    } else if (!orderId) {
      createOrder();
    } else {
      setIsLoading(false);
    }
  }, [initialOrder, navigate, orderId]);

  const calculateTotals = () => {
    let subtotal = initialOrder.totalPrice;
    const lineItems = [{
      price_data: {
        currency: 'usd',
        product_data: { name: initialOrder.productName },
        unit_amount: Math.round(initialOrder.pricePerLead * 100),
      },
      quantity: initialOrder.leadCount,
    }];

    upsells.forEach(upsell => {
      let upsellPrice = 0;
      if (upsell.priceType === 'percentage') {
        upsellPrice = subtotal * upsell.price;
      } else {
        upsellPrice = upsell.price;
      }
      subtotal += upsellPrice;
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: upsell.title },
          unit_amount: Math.round(upsellPrice * 100),
        },
        quantity: 1,
      });
    });

    return { total: subtotal, lineItems };
  };

  const { total, lineItems } = initialOrder ? calculateTotals() : { total: 0, lineItems: [] };

  const createOrder = async () => {
    setIsLoading(true);
    
    try {
      // Store email for later use
      localStorage.setItem('checkoutEmail', initialOrder.email);
      
      // Create order in YOUR backend
      const backendOrderResponse = await createBackendOrder({
        customerName: initialOrder.metadata?.customer_name || initialOrder.email.split('@')[0],
        customerEmail: initialOrder.email, // ✅ Using customerEmail
        company: initialOrder.metadata?.company || '',
        customerPhone: initialOrder.metadata?.customer_phone || '',
      });
      
      console.log('Backend order created:', backendOrderResponse);
      setBackendOrderId(backendOrderResponse.order.id);
      
      // Use backend order ID as the main order ID
      setOrderId(backendOrderResponse.order.id);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Order creation error:', error);
      toast({ 
        title: "Backend Connection Error", 
        description: "Could not connect to calling backend. Check if backend is running on port 5000.", 
        variant: "destructive" 
      });
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    setIsRedirecting(true);
    try {
      // Store email for later use after payment
      localStorage.setItem('checkoutEmail', initialOrder.email);
      
      // Step 1: If file was uploaded, send it to YOUR backend
      if (initialOrder.orderType === 'enhanceExisting' && initialOrder.metadata?.file_path && backendOrderId) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('lead_files')
            .download(initialOrder.metadata.file_path);
          
          if (downloadError) throw downloadError;
          
          if (fileData) {
            const fileName = initialOrder.metadata.file_path.split('/').pop();
            const file = new File([fileData], fileName, { type: fileData.type });
            
            const uploadResult = await uploadSpreadsheet(backendOrderId, file);
            console.log('File uploaded to backend:', uploadResult);
            
            toast({
              title: "File Uploaded Successfully",
              description: "Your leads file has been processed by the backend.",
            });
          }
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          toast({
            title: "File Upload Warning",
            description: "Payment will proceed, but file upload to backend failed.",
            variant: "destructive",
          });
        }
      }
      
      // Step 2: Create Stripe checkout session
      // Don't pass successUrl/cancelUrl - let Stripe use default redirect
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: JSON.stringify({
          lineItems,
          email: initialOrder.email,
          orderId: backendOrderId,
          metadata: { 
            orderId: backendOrderId,
            customerEmail: initialOrder.email
          }
        }),
      });

      if (error) throw error;

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Could not retrieve checkout URL.");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({ 
        title: "Checkout Error", 
        description: error.message, 
        variant: "destructive" 
      });
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-4 relative overflow-hidden">
      <DynamicBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 md:p-12 border border-gray-200"
      >
        <div className="text-center mb-8">
          <ShoppingCart className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold text-navy-900">Review Your Order</h1>
          <p className="text-lg text-navy-700 mt-2">One final step to boost your sales pipeline!</p>
          
          {backendOrderId && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Order ID: <span className="font-mono font-bold">{backendOrderId}</span>
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-6 space-y-4 mb-8 border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="font-medium text-navy-800">{initialOrder.productName} (x{initialOrder.leadCount})</span>
            <span className="font-semibold text-navy-900">${initialOrder.totalPrice.toFixed(2)}</span>
          </div>
          {upsells.map((upsell, index) => {
            const price = upsell.priceType === 'percentage' ? initialOrder.totalPrice * upsell.price : upsell.price;
            return (
              <div key={index} className="flex justify-between items-center text-green-700">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  <span className="font-medium">{upsell.title}</span>
                </div>
                <span className="font-semibold">+${price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-dashed border-gray-300 pt-6 mb-8">
          <div className="flex justify-between items-center text-2xl font-bold text-navy-900">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          onClick={handleCheckout}
          disabled={isRedirecting}
          size="lg"
          className="w-full text-lg font-bold py-8 bg-gradient-to-br from-green-500 to-emerald-600 hover:opacity-90 transition-opacity duration-300"
        >
          {isRedirecting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              Proceed to Secure Payment <ArrowRight className="w-6 h-6 ml-2" />
            </>
          )}
        </Button>
        <Button 
          variant="link" 
          className="w-full mt-2 text-navy-600" 
          onClick={() => { resetOrder(); navigate('/'); }}
        >
          Cancel and Start Over
        </Button>
      </motion.div>
    </div>
  );
};

export default CheckoutPage;