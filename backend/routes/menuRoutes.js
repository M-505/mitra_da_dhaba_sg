const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const upload = require('../middleware/upload');

// Get all menu items
router.get('/', async (req, res, next) => {
  try {
    await menuController.getAllMenuItems(req, res);
  } catch (err) {
    next(err);
  }
});

// Get menu items by category
router.get('/category/:id', async (req, res, next) => {
  try {
    await menuController.getMenuItemsByCategory(req, res);
  } catch (err) {
    next(err);
  }
});

// Create a new menu item with image upload
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image upload required' });
    }
    await menuController.createMenuItem(req, res);
  } catch (err) {
    next(err);
  }
});

// Update a menu item with optional image upload
router.put('/:id', upload.single('image'), async (req, res, next) => {
  try {
    await menuController.updateMenuItem(req, res);
  } catch (err) {
    next(err);
  }
});

// Update menu item availability
router.patch('/:id/availability', async (req, res, next) => {
  try {
    await menuController.updateAvailability(req, res);
  } catch (err) {
    next(err);
  }
});

// Delete a menu item
router.delete('/:id', async (req, res, next) => {
  try {
    await menuController.deleteMenuItem(req, res);
  } catch (err) {
    next(err);
  }
});

// backend/routes/menuRoutes.js
// Add this new route for fetching ALL items
router.get('/all', async (req, res, next) => {
  try {
    await menuController.getAllMenuItemsAdmin(req, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;