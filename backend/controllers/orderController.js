const orderModel = require('../models/orderModel');
const { validationResult } = require('express-validator');

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

exports.createOrder = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { tableNumber, items } = req.body;
    const newOrder = await orderModel.createOrder(tableNumber, items);
    
    // Broadcast new order to all connected clients
    req.app.locals.broadcast({
      type: 'newOrder',
      payload: newOrder
    });

    res.status(201).json(newOrder);
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedOrder = await orderModel.updateOrderStatus(id, status);
    
    if (updatedOrder) {
      // Broadcast order update to all connected clients
      req.app.locals.broadcast({
        type: 'orderUpdate',
        payload: updatedOrder
      });
      
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { tableNumber, items } = req.body;
    const newOrder = await orderModel.createOrder(tableNumber, items);
    
    // Broadcast to all connected clients
    req.app.locals.broadcast({
      type: 'newOrder',
      payload: newOrder
    });

    res.status(201).json(newOrder);
  } catch (err) {
    next(err);
  }
};

// New method for handling order amendments
exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedOrder = await orderModel.updateOrder(id, updateData);
    
    if (updatedOrder) {
      // Broadcast order update to all connected clients
      req.app.locals.broadcast({
        type: 'orderUpdate',
        payload: updatedOrder
      });
      
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (err) {
    next(err);
  }
};