// routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const orderModel = require('../models/orderModel'); // If you need to call orderModel directly

// 1) GET all orders
router.get('/', orderController.getAllOrders);

// 2) GET a single order by ID
router.get('/:id', orderController.getOrderById);

// 3) CREATE a new order
//    Using async/await to catch errors
router.post('/', async (req, res, next) => {
  try {
    await orderController.createOrder(req, res);
  } catch (err) {
    next(err);
  }
});

// 4) PATCH order status by ID
router.patch('/:id/status', orderController.updateOrderStatus);

// 5) PATCH (update) the entire order by ID
router.patch('/:id', orderController.updateOrder);

// 6) POST to merge two orders
router.post('/:parentId/merge/:childId', orderController.mergeOrders);

// 7) GET mergeable orders by table number
router.get('/mergeable/:tableNumber', async (req, res, next) => {
  try {
    const { tableNumber } = req.params;
    const orders = await orderModel.getMergeableOrders(tableNumber);
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

module.exports = router;