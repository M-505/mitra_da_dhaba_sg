// controllers/orderController.js

const orderModel = require('../models/orderModel');
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

// GET all orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderModel.getAllOrders();
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// GET a single order by ID
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

// CREATE a new order
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

    // Insert into 'orders'
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
      orderId,
      total_amount,
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

// UPDATE order status
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
        status,
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

// MERGE orders
// - No "pending only" check here; let model handle allowed status combos
exports.mergeOrders = async (req, res, next) => {
  try {
    const { parentId, childId } = req.params;
    console.log('Attempting to merge orders:', { parentId, childId });

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

// UPDATE an order (including items/total)
exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body; // items, total_amount, etc.

    // Call model to update order & items
    const updatedOrder = await orderModel.updateOrder(id, updateData);

    if (updatedOrder) {
      // Broadcast to WebSocket clients
      broadcastToClients({
        type: 'ORDER_UPDATED',
        orderId: id,
        order: updatedOrder
      });

      // Return the updated order as JSON
      return res.json(updatedOrder);
    } else {
      return res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    next(err);
  }
};