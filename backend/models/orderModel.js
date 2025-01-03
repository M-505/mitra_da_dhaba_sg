// models/orderModel.js

const db = require('../config/database');

/**
 * Get all parent orders (where `parent_order_id` is NULL).
 * Includes childOrders, items, and more in JSON form.
 */
exports.getAllOrders = async () => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id, 
        o.table_number, 
        o.total_amount, 
        o.status,
        o.created_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'menu_item_id', mi.id,
            'name', mi.name,
            'quantity', oi.quantity,
            'price', oi.price_at_time
          )
        ) AS items,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', child.id,
              'table_number', child.table_number,
              'total_amount', child.total_amount,
              'status', child.status,
              'created_at', child.created_at,
              'items', (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'id', coi.id,
                    'menu_item_id', cmi.id,
                    'name', cmi.name,
                    'quantity', coi.quantity,
                    'price', coi.price_at_time
                  )
                )
                FROM order_items coi
                JOIN menu_items cmi ON coi.menu_item_id = cmi.id
                WHERE coi.order_id = child.id
              )
            )
          )
          FROM orders child
          WHERE child.parent_order_id = o.id
        ) AS childOrders
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.parent_order_id IS NULL
      GROUP BY o.id
      ORDER BY o.id DESC
    `);

    return rows;
  } catch (err) {
    throw new Error('Failed to retrieve orders');
  }
};

/**
 * Get a single order (plus items), or if it’s a parent, also get child order data.
 */
exports.getOrderById = async (id) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id, 
        o.table_number, 
        o.total_amount, 
        o.status,
        o.created_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,           -- order_items id
            'menu_item_id', mi.id, -- menu_items id
            'name', mi.name,
            'quantity', oi.quantity,
            'price', oi.price_at_time
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = ? OR o.parent_order_id = ?
      GROUP BY o.id
    `, [id, id]);

    return rows[0] || null;
  } catch (err) {
    throw new Error('Failed to retrieve order');
  }
};

/**
 * Create a new order (with items).
 */
exports.createOrder = async (tableNumber, items) => {
  let totalAmount = 0;

  try {
    const [result] = await db.query(
      'INSERT INTO orders (table_number, status, total_amount, created_at) VALUES (?, ?, ?, ?)',
      [tableNumber, 'pending', 0, new Date().toISOString()]
    );
    const orderId = result.insertId;

    // Insert items
    for (const item of items) {
      const [menuItem] = await db.query(
        'SELECT id, name, price FROM menu_items WHERE id = ?',
        [item.id]
      );
      if (!menuItem[0]) {
        throw new Error(`Menu item ${item.id} not found`);
      }

      const itemTotal = menuItem[0].price * item.quantity;
      totalAmount += itemTotal;

      await db.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_time) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, menuItem[0].price]
      );
    }

    // Update total amount on the new order
    await db.query(
      'UPDATE orders SET total_amount = ? WHERE id = ?',
      [totalAmount, orderId]
    );

    // Return the complete order with items
    const [orderWithItems] = await db.query(`
      SELECT o.id, o.table_number, o.total_amount, o.status,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', oi.id,
          'menu_item_id', mi.id,
          'name', mi.name,
          'quantity', oi.quantity,
          'price', oi.price_at_time
        )
      ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = ?
      GROUP BY o.id
    `, [orderId]);

    return orderWithItems;
  } catch (err) {
    throw new Error('Failed to create order: ' + err.message);
  }
};

/**
 * Update only the status of an existing order by ID.
 */
exports.updateOrderStatus = async (id, status) => {
  try {
    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  } catch (err) {
    throw new Error('Failed to update order status');
  }
};

/**
 * Merge one order (child) into another (parent).
 * Allows (pending+pending), (accepted+pending), or (accepted+accepted).
 */
exports.mergeOrders = async (parentId, childId) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    // 1) Grab parent & child
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE id IN (?, ?)',
      [parentId, childId]
    );
    if (orders.length !== 2) {
      throw new Error('One or both orders not found');
    }

    const parentOrder = orders.find(o => o.id === parseInt(parentId));
    const childOrder = orders.find(o => o.id === parseInt(childId));

    // 2) Validate same table
    if (parentOrder.table_number !== childOrder.table_number) {
      throw new Error('Can only merge orders from the same table');
    }

    // 3) Check status combos
    if (!(
      (parentOrder.status === 'pending' && childOrder.status === 'pending') ||
      (parentOrder.status === 'accepted' && childOrder.status === 'pending') ||
      (parentOrder.status === 'accepted' && childOrder.status === 'accepted')
    )) {
      throw new Error(
        'Can only merge if both are either pending or accepted. ' +
        'Allowed combos: (pending+pending), (accepted+pending), or (accepted+accepted).'
      );
    }

    // 4) Combine items from both orders
    const [items] = await conn.query(
      `SELECT oi.*, mi.name 
       FROM order_items oi 
       JOIN menu_items mi ON oi.menu_item_id = mi.id 
       WHERE oi.order_id IN (?, ?)`,
      [parentId, childId]
    );

    // Calculate new total for parent
    const total_amount = items.reduce((sum, item) => 
      sum + (parseFloat(item.price_at_time) * parseInt(item.quantity)), 0
    );

    // 5) Update parent's total
    await conn.query(
      'UPDATE orders SET total_amount = ? WHERE id = ?',
      [total_amount, parentId]
    );

    // 6) Reassign child's items to parent
    await conn.query(
      'UPDATE order_items SET order_id = ? WHERE order_id = ?',
      [parentId, childId]
    );

    // 7) Mark child as merged
    await conn.query(
      'UPDATE orders SET status = ?, parent_order_id = ? WHERE id = ?',
      ['merged', parentId, childId]
    );

    await conn.commit();

    // 8) Return updated parent
    const [updatedOrder] = await conn.query(`
      SELECT 
        o.id, 
        o.table_number, 
        o.total_amount, 
        o.status,
        o.created_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'menu_item_id', mi.id,
            'name', mi.name,
            'quantity', oi.quantity,
            'price', oi.price_at_time
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = ?
      GROUP BY o.id
    `, [parentId]);

    return updatedOrder[0];

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Get mergeable orders by table number (status in 'pending' or 'accepted',
 * and no parent_order_id).
 */
exports.getMergeableOrders = async (tableNumber) => {
  try {
    const [orders] = await db.query(`
      SELECT 
        o.id, 
        o.table_number, 
        o.total_amount, 
        o.status,
        o.created_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'menu_item_id', mi.id,
            'name', mi.name,
            'quantity', oi.quantity,
            'price', oi.price_at_time
          )
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.table_number = ?
        AND o.parent_order_id IS NULL
        AND o.status IN ('pending', 'accepted')
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [tableNumber]);

    return orders;
  } catch (err) {
    throw new Error('Failed to retrieve mergeable orders');
  }
};

/**
 * Update an existing order (replace items, recalc total).
 * If `items` is empty => delete this order entirely (so it won't appear in the dashboard).
 */
exports.updateOrder = async (id, { items }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // If no items -> remove this order entirely
    if (!items || items.length === 0) {
      await conn.query(`DELETE FROM order_items WHERE order_id = ?`, [id]);
      await conn.query(`DELETE FROM orders WHERE id = ?`, [id]);
      await conn.commit();
      return null; // Return null so the front end knows it's gone
    }

    // Otherwise, re-insert the updated items
    await conn.query(`DELETE FROM order_items WHERE order_id = ?`, [id]);

    let newTotal = 0;
    for (const item of items) {
      const quantity = parseInt(item.quantity) || 1;
      const price = parseFloat(item.price) || 0;
      newTotal += quantity * price;

      // If you don't have a 'note' column, remove it from the query below
      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_time, note)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          item.menu_item_id, // or item.id if that's how you're passing it
          quantity,
          price,
          item.note || null
        ]
      );
    }

    // Update orders table with the new total
    await conn.query(
      `UPDATE orders
       SET total_amount = ?
       WHERE id = ?`,
      [newTotal, id]
    );

    await conn.commit();

    // Return the updated order with new items
    const [rows] = await conn.query(`
      SELECT o.id, o.table_number, o.total_amount, o.status, o.created_at,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'name', mi.name,
          'quantity', oi.quantity,
          'price', oi.price_at_time,
          'note', oi.note
        )
      ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = ?
      GROUP BY o.id
    `, [id]);

    return rows[0] || null;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};