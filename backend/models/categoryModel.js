// models/categoryModel.js
const db = require('../config/database');

exports.getAllCategories = async () => {
    try {
        const [rows] = await db.query('SELECT * FROM categories ORDER BY display_order');
        return rows;
    } catch (err) {
        throw new Error('Failed to retrieve categories');
    }
};

exports.getCategoryById = async (id) => {
    try {
        const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
        return rows[0] || null;
    } catch (err) {
        throw new Error('Failed to retrieve category');
    }
};

exports.createCategory = async (name, displayOrder) => {
    try {
        const [result] = await db.query(
            'INSERT INTO categories (name, display_order) VALUES (?, ?)',
            [name, displayOrder]
        );
        const newCategory = { id: result.insertId, name, displayOrder };
        return newCategory;
    } catch (err) {
        throw new Error('Failed to create category');
    }
};

exports.updateCategory = async (id, name, displayOrder) => {
    try {
        await db.query(
            'UPDATE categories SET name = ?, display_order = ? WHERE id = ?',
            [name, displayOrder, id]
        );
        return { id, name, displayOrder };
    } catch (err) {
        throw new Error('Failed to update category');
    }
};

exports.deleteCategory = async (id) => {
    try {
        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
        return result.affectedRows > 0;
    } catch (err) {
        throw new Error('Failed to delete category');
    }
};