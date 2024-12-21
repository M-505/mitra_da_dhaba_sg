// src/pages/CashierDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Clock, DollarSign, XCircle, CheckCircle } from 'lucide-react';

const CashierDashboard = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const [pendingRes, confirmedRes] = await Promise.all([
        axios.get('http://localhost:3001/api/orders/pending'),
        axios.get('http://localhost:3001/api/orders/completed')
      ]);
      setPendingOrders(pendingRes.data);
      setConfirmedOrders(confirmedRes.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const confirmOrder = async (orderId) => {
    try {
      await axios.put(`http://localhost:3001/api/orders/${orderId}/status`, {
        status: 'preparing'
      });
      fetchOrders();
    } catch (error) {
      console.error('Error confirming order:', error);
    }
  };

  const rejectOrder = async (orderId) => {
    try {
      await axios.put(`http://localhost:3001/api/orders/${orderId}/status`, {
        status: 'cancelled'
      });
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
    }
  };

  const processPayment = async (orderId) => {
    try {
      await axios.put(`http://localhost:3001/api/orders/${orderId}/status`, {
        status: 'paid'
      });
      fetchOrders();
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Cashier Dashboard</h1>

      {/* New Orders Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">New Orders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingOrders.map(order => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>Table {order.tableNumber}</CardTitle>
                  <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Pending
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <span className="font-bold">{item.quantity}x</span>{' '}
                        {item.name}
                      </div>
                      <div>${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-bold flex justify-between">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="success"
                    className="flex-1"
                    onClick={() => confirmOrder(order.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => rejectOrder(order.id)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed Orders Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Ready for Payment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {confirmedOrders.map(order => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>Table {order.tableNumber}</CardTitle>
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    Ready
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 mb-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <span className="font-bold">{item.quantity}x</span>{' '}
                        {item.name}
                      </div>
                      <div>${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-bold flex justify-between">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => processPayment(order.id)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Process Payment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;