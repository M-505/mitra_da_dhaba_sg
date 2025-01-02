// controllers/menuController.js
const menuModel = require('../models/menuModel');
const { validationResult } = require('express-validator');

exports.getAllMenuItems = async (req, res, next) => {
    try {
        const menuItems = await menuModel.getAllMenuItems();
        res.json(menuItems);
    } catch (err) {
        next(err);
    }
};

exports.getMenuItemsByCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const menuItems = await menuModel.getMenuItemsByCategory(id);
        res.json(menuItems);
    } catch (err) {
        next(err);
    }
};

exports.createMenuItem = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, description, price, category_id, is_spicy, is_recommended } = req.body;
    
    // Log the file information to debug
    console.log('Uploaded file:', req.file);
    
    // Create the image URL - make sure this path matches your frontend public directory
    const imageUrl = req.file ? `/menu-images/${req.file.filename}` : null;

    const newMenuItem = await menuModel.createMenuItem(
      name,
      description,
      price,
      category_id,
      imageUrl,
      is_spicy === 'true',
      is_recommended === 'true'
    );

    res.status(201).json(newMenuItem);
  } catch (err) {
    console.error('Error creating menu item:', err);
    next(err);
  }
};

  // backend/controllers/menuController.js
exports.updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, is_spicy, is_recommended } = req.body;
    
    // Debug logging
    console.log('Update Request:', {
      id,
      body: req.body,
      file: req.file
    });

    // Handle image URL
    let imageUrl = undefined;  // Don't update image if no new file
    if (req.file) {
      imageUrl = `/menu-images/${req.file.filename}`;
    }

    // Build update data
    const updateData = {
      name,
      description,
      price,
      category_id,
      is_spicy: is_spicy === 'true' || is_spicy === true ? 1 : 0,
      is_recommended: is_recommended === 'true' || is_recommended === true ? 1 : 0
    };

    // Only include image_url if there's a new image
    if (imageUrl) {
      updateData.image_url = imageUrl;
    }

    const updatedMenuItem = await menuModel.updateMenuItem(id, updateData);
    res.json(updatedMenuItem);
  } catch (err) {
    console.error('Update error:', err);
    next(err);
  }
};

exports.deleteMenuItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await menuModel.deleteMenuItem(id);
        if (success) {
            res.json({ message: 'Menu item deleted' });
        } else {
            res.status(404).json({ message: 'Menu item not found' });
        }
    } catch (err) {
        next(err);
    }
};