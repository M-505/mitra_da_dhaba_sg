// models/menuModel.js
const db = require('../config/database');

exports.getAllMenuItems = async () => {
    try {
        const [rows] = await db.query('SELECT * FROM menu_items WHERE is_available = true');
        return rows;
    } catch (err) {
        throw new Error('Failed to retrieve menu items');
    }
};

exports.getMenuItemsByCategory = async (categoryId) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM menu_items WHERE category_id = ? AND is_available = true',
            [categoryId]
        );
        return rows;
    } catch (err) {
        throw new Error('Failed to retrieve menu items by category');
    }
};

exports.createMenuItem = async (name, description, price, categoryId) => {
    try {
        const [result] = await db.query(
            'INSERT INTO menu_items (name, description, price, category_id, is_available) VALUES (?, ?, ?, ?, true)',
            [name, description, price, categoryId]
        );
        const newMenuItem = { id: result.insertId, name, description, price, categoryId };
        return newMenuItem;
    } catch (err) {
        throw new Error('Failed to create menu item');
    }
};

exports.updateMenuItem = async (id, name, description, price, categoryId) => {
    try {
        await db.query(
            'UPDATE menu_items SET name = ?, description = ?, price = ?, category_id = ? WHERE id = ?',
            [name, description, price, categoryId, id]
        );
        return { id, name, description, price, categoryId };
    } catch (err) {
        throw new Error('Failed to update menu item');
    }
};

exports.deleteMenuItem = async (id) => {
    try {
        const [result] = await db.query('DELETE FROM menu_items WHERE id = ?', [id]);
        return result.affectedRows > 0;
    } catch (err) {
        throw new Error('Failed to delete menu item');
    }
};