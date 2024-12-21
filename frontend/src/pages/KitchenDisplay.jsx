// src/pages/KitchenDisplay.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Clock, CheckCircle } from 'lucide-react';

const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/orders/preparing');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const completeOrder = async (orderId) => {
    try {
      await axios.put(`http://localhost:3001/api/orders/${orderId}/status`, {
        status: 'completed'
      });
      fetchOrders();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  const getOrderAge = (timestamp) => {
    const orderTime = new Date(timestamp);
    const now = new Date();
    return Math.floor((now - orderTime) / 60000); // minutes
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Kitchen Display</h1>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map(order => {
          const age = getOrderAge(order.timestamp);
          const isUrgent = age > 15;

          return (
            <Card 
              key={order.id} 
              className={isUrgent ? 'border-red-500 border-2' : ''}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>Table {order.tableNumber}</CardTitle>
                  <span className={`text-sm px-2 py-1 rounded ${
                    isUrgent 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {age} mins
                  </span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <span className="font-bold">{item.quantity}x</span>{' '}
                        {item.name}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="success"
                  className="w-full mt-4"
                  onClick={() => completeOrder(order.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Order
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No active orders</p>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;