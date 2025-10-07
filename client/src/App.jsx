import React, { useEffect, useContext } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { StripeProvider } from '@/contexts/StripeContext';
import { OrderContext } from '@/contexts/OrderContext';
import { useToast } from "@/components/ui/use-toast";

import HomePage from '@/pages/HomePage';
import UpsellPage from '@/pages/UpsellPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderStatusPage from '@/pages/OrderStatusPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';

function App() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = useContext(OrderContext);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const paymentStatus = urlParams.get('payment_status');
    const sessionId = urlParams.get('session_id');

    // ✅ REDIRECT TO SIGNUP after successful payment
    if (paymentStatus === 'success' && sessionId && orderId) {
      toast({
        title: "Payment Successful! 🎉",
        description: "Please create your account to continue...",
        duration: 2000,
      });
      
      // Get email from localStorage (saved during checkout)
      const email = localStorage.getItem('checkoutEmail') || '';
      
      // ✅ Redirect to SIGNUP page with orderId and email
      setTimeout(() => {
        navigate(`/signup?orderId=${orderId}&email=${encodeURIComponent(email)}`);
      }, 2000);
      
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was not processed. You can try again anytime.",
        variant: "destructive",
        duration: 5000,
      });
      window.history.replaceState(null, '', '/');
    }
  }, [toast, location.search, navigate, orderId]);

  const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
    'pk_test_51S5wBRLtHdMzEuoPpqhJ5VrJLtLxjJunlmRHIcguRJ2Z6rjNjg5sPpobEhq6hIUinbBT6vwwSWHQZU88JHgiIlgN00csuuUUzs';

  return (
    <>
      <Helmet>
        <title>Verifies.co - AI Pickup Rate Software</title>
        <meta name="description" content="Boost pickup rates by 2.5x-8x with our proprietary AI stack." />
        <meta property="og:title" content="Verifies.co - AI Pickup Rate Software" />
        <meta property="og:description" content="Boost pickup rates by 2.5x-8x with our proprietary AI stack." />
        <script src="https://player.vimeo.com/api/player.js"></script>
        <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script>
      </Helmet>
      
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upsell/:step" element={<UpsellPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-status/:orderId" element={<OrderStatusPage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </StripeProvider>
    </>
  );
}

export default App;