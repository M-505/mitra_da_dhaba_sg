// models/menuModel.js
const db = require('../config/database');

exports.getAllMenuItems = async () => {
    try {
      const [rows] = await db.query(`
        SELECT 
          id, 
          name, 
          description, 
          price, 
          category_id, 
          is_available, 
          image_url,
          is_spicy,
          is_recommended
        FROM menu_items 
        WHERE is_available = true
      `);
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

exports.createMenuItem = async (name, description, price, categoryId, imageUrl) => {
    try {
      const [result] = await db.query(
        'INSERT INTO menu_items (name, description, price, category_id, image_url, is_available) VALUES (?, ?, ?, ?, ?, true)',
        [name, description, price, categoryId, imageUrl]
      );
      const newMenuItem = { 
        id: result.insertId, 
        name, 
        description, 
        price, 
        category_id: categoryId,
        image_url: imageUrl 
      };
      return newMenuItem;
    } catch (err) {
      throw new Error('Failed to create menu item');
    }
  };

  exports.updateMenuItem = async (id, updateData) => {
    try {
      // Build the SQL query dynamically based on updateData
      const fields = Object.keys(updateData)
        .map(key => `${key} = ?`)
        .join(', ');
      const values = Object.values(updateData);
      
      // Add id to values array
      values.push(id);
  
      const query = `
        UPDATE menu_items 
        SET ${fields}
        WHERE id = ?
      `;
  
      console.log('Update query:', query, values);
  
      const [result] = await db.query(query, values);
      
      if (result.affectedRows === 0) {
        throw new Error('Menu item not found');
      }
  
      // Fetch and return the updated item
      const [updatedRows] = await db.query(
        'SELECT * FROM menu_items WHERE id = ?',
        [id]
      );
      
      return updatedRows[0];
    } catch (err) {
      console.error('Database error:', err);
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