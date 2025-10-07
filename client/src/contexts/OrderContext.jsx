import React, { createContext, useState, useMemo } from 'react';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orderId, setOrderId] = useState(null);
  const [initialOrder, setInitialOrder] = useState(null);
  const [upsells, setUpsells] = useState([]);

  const addUpsell = (upsell) => {
    setUpsells((prev) => [...prev, upsell]);
  };

  const resetOrder = () => {
    setOrderId(null);
    setInitialOrder(null);
    setUpsells([]);
  };

  const value = useMemo(() => ({
    orderId,
    setOrderId,
    initialOrder,
    setInitialOrder,
    upsells,
    addUpsell,
    resetOrder,
  }), [orderId, initialOrder, upsells]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};