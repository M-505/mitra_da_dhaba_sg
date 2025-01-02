const orderModel = require('../models/orderModel');
const { validationResult } = require('express-validator');
const db = require('../config/database');

// Helper function for WebSocket broadcasting
const broadcastToClients = (data) => {
  if (global.wss) {
    global.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(data));
      }
    });
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderModel.getAllOrders();
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderModel.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    const { table_number, items } = req.body;

    // Calculate total_amount
    const total_amount = items.reduce((sum, item) => {
      const price = parseFloat(item.unit_price);
      const quantity = parseInt(item.quantity);
      return sum + (price * quantity);
    }, 0);

    console.log('Order details:', {
      table_number,
      total_amount,
      items
    });

    // Create the order
    const [orderResult] = await conn.query(
      `INSERT INTO orders (table_number, status, total_amount) 
       VALUES (?, ?, ?)`,
      [table_number, 'pending', total_amount]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_time) 
         VALUES (?, ?, ?, ?)`,
        [
          orderId,
          item.menu_item_id,
          item.quantity,
          item.unit_price
        ]
      );
    }

    await conn.commit();

    // Broadcast new order to connected clients
    broadcastToClients({
      type: 'NEW_ORDER',
      order: {
        id: orderId,
        table_number,
        total_amount,
        status: 'pending'
      }
    });

    res.status(201).json({
      success: true,
      orderId: orderId,
      total_amount: total_amount,
      message: 'Order created successfully'
    });

  } catch (err) {
    await conn.rollback();
    console.error('Order creation error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: err.message
    });
  } finally {
    conn.release();
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedOrder = await orderModel.updateOrderStatus(id, status);
    
    if (updatedOrder) {
      // Broadcast order update
      broadcastToClients({
        type: 'ORDER_STATUS_UPDATED',
        orderId: id,
        status: status,
        order: updatedOrder
      });
      
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    next(err);
  }
};

exports.mergeOrders = async (req, res, next) => {
  try {
    const { parentId, childId } = req.params;
    
    // Log the incoming request
    console.log('Attempting to merge orders:', { parentId, childId });

    // First check orders status
    const [orders] = await db.query(
      'SELECT id, status, table_number FROM orders WHERE id IN (?, ?)',
      [parentId, childId]
    );

    console.log('Found orders:', orders);

    if (orders.length !== 2) {
      return res.status(404).json({
        success: false,
        message: 'One or both orders not found'
      });
    }

    const parentOrder = orders.find(o => o.id === parseInt(parentId));
    const childOrder = orders.find(o => o.id === parseInt(childId));

    console.log('Parent order:', parentOrder);
    console.log('Child order:', childOrder);

    if (parentOrder.status !== 'pending' || childOrder.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only merge pending orders',
        parentStatus: parentOrder.status,
        childStatus: childOrder.status
      });
    }

    const mergedOrder = await orderModel.mergeOrders(parentId, childId);
    
    // Broadcast merge update
    broadcastToClients({
      type: 'ORDERS_MERGED',
      parentOrderId: parentId,
      childOrderId: childId,
      updatedOrder: mergedOrder
    });

    res.json({
      success: true,
      message: 'Orders merged successfully',
      order: mergedOrder
    });

  } catch (err) {
    console.error('Order merge error:', err);
    res.status(500).json({
      success: false,
      message: err.message,
      error: err
    });
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedOrder = await orderModel.updateOrder(id, updateData);
    
    if (updatedOrder) {
      // Broadcast order update
      broadcastToClients({
        type: 'ORDER_UPDATED',
        orderId: id,
        order: updatedOrder
      });
      
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    next(err);
  }
};