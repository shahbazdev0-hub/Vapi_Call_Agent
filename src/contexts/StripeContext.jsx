import React, { createContext, useContext, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const StripeContext = createContext();

export const StripeProvider = ({ children, publishableKey }) => {
  const stripePromise = useMemo(() => {
    if (publishableKey) {
      return loadStripe(publishableKey);
    }
    return null;
  }, [publishableKey]);

  return (
    <StripeContext.Provider value={{ stripePromise }}>
      {children}
    </StripeContext.Provider>
  );
};

export const useStripePromise = () => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripePromise must be used within a StripeProvider');
  }
  return context;
};