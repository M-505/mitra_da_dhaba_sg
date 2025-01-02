const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
//router.post('/', orderController.createOrder);
router.patch('/:id/status', orderController.updateOrderStatus);
router.patch('/:id', orderController.updateOrder);  // New route for general updates
router.post('/:parentId/merge/:childId', orderController.mergeOrders);

router.post('/', async (req, res, next) => {
    try {
      await orderController.createOrder(req, res);
    } catch (err) {
      next(err);
    }
  });

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