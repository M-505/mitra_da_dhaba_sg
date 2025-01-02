// routes/api.js
const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

// Get all categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await MenuItem.getCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get menu items by category
router.get('/menu/:categoryId', async (req, res) => {
    try {
        const items = await MenuItem.getAllByCategory(req.params.categoryId);
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new order
router.post('/orders', async (req, res) => {
    try {
        const { tableNumber, items } = req.body;
        const orderId = await Order.create(tableNumber, items);
        res.status(201).json({ orderId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get orders by status
router.get('/orders/:status', async (req, res) => {
    try {
        const orders = await Order.getByStatus(req.params.status);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const success = await Order.updateStatus(req.params.id, status);
        if (success) {
            res.json({ message: 'Order status updated' });
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// backend/routes/api.js
router.post('/notify', (req, res) => {
    const { type } = req.body;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type }));
      }
    });
    res.json({ success: true });
  });

router.use('/admin', require('./adminRoutes'));

module.exports = router;