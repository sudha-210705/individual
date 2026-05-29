import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const OrderContext = createContext(null);

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState(null);
  const [riderCoords, setRiderCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    if (user && user.role === 'customer') {
      fetchOrders();
    }
  }, [user]);

  // Listen to order and rider updates
  useEffect(() => {
    if (!socket) return;

    const handleGlobalUpdate = () => {
      if (user && user.role === 'customer') {
        fetchOrders();
      }
    };

    socket.on('order:new_placed', handleGlobalUpdate);

    return () => {
      socket.off('order:new_placed', handleGlobalUpdate);
    };
  }, [socket, user]);

  useEffect(() => {
    if (!socket || !activeTrackingOrder) return;

    const orderId = activeTrackingOrder._id;
    socket.on(`order:${orderId}:update`, (data) => {
      setActiveTrackingOrder(prev => {
        if (!prev) return null;
        return { ...prev, ...data };
      });
      fetchOrders();
    });

    if (activeTrackingOrder.rider) {
      const riderId = activeTrackingOrder.rider._id || activeTrackingOrder.rider;
      socket.on(`rider:${riderId}:location`, (data) => {
        setRiderCoords(data.coordinates);
      });
    }

    return () => {
      socket.off(`order:${orderId}:update`);
      if (activeTrackingOrder.rider) {
        const riderId = activeTrackingOrder.rider._id || activeTrackingOrder.rider;
        socket.off(`rider:${riderId}:location`);
      }
    };
  }, [socket, activeTrackingOrder]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        
        // Auto-track the latest active order
        const active = data.orders.find(o => 
          ['placed', 'searching', 'assigned', 'pickup_arrived', 'picked_up', 'in_transit'].includes(o.status)
        );
        if (active) {
          setActiveTrackingOrder(active);
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEstimation = async (pickup, stops, weather = 'clear') => {
    try {
      const res = await fetch(`${API_URL}/api/orders/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, stops, weather })
      });
      return await res.json();
    } catch (err) {
      console.error('Estimation error:', err);
      return { success: false, message: 'Server communication error' };
    }
  };

  const placeOrder = async (orderData) => {
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (data.success) {
        setActiveTrackingOrder(data.order);
        fetchOrders();
        return { success: true, order: data.order };
      }
      return { success: false, message: data.message };
    } catch (err) {
      console.error('Order creation error:', err);
      return { success: false, message: 'Server connection error' };
    }
  };

  const cancelActiveOrder = async (orderId) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        if (activeTrackingOrder && activeTrackingOrder._id === orderId) {
          setActiveTrackingOrder(null);
          setRiderCoords(null);
        }
        fetchOrders();
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err) {
      console.error('Order cancellation error:', err);
      return { success: false, message: 'Server connection error' };
    }
  };

  return (
    <OrderContext.Provider value={{ orders, activeTrackingOrder, riderCoords, loading, getEstimation, placeOrder, cancelActiveOrder, setActiveTrackingOrder, fetchOrders }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => useContext(OrderContext);
export default OrderContext;
