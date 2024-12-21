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
        const { name, description, price, categoryId } = req.body;
        const newMenuItem = await menuModel.createMenuItem(name, description, price, categoryId);
        res.status(201).json(newMenuItem);
    } catch (err) {
        next(err);
    }
};

exports.updateMenuItem = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const { name, description, price, categoryId } = req.body;
        const updatedMenuItem = await menuModel.updateMenuItem(id, name, description, price, categoryId);
        res.json(updatedMenuItem);
    } catch (err) {
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