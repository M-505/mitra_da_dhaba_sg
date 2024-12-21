// controllers/orderController.js
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
        res.status(201).json(newOrder);
    } catch (err) {
        next(err);
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const success = await orderModel.updateOrderStatus(id, status);
        if (success) {
            res.json({ message: 'Order status updated' });
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (err) {
        next(err);
    }
};