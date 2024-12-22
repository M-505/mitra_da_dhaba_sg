// models/orderModel.js
const db = require('../config/database');

exports.getAllOrders = async () => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id, 
        o.table_number, 
        o.total_amount, 
        o.status,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'menu_item_id', mi.id,
            'name', mi.name,
            'quantity', oi.quantity,
            'price', oi.price_at_time
          )
        ) as items,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', child.id,
              'table_number', child.table_number,
              'total_amount', child.total_amount,
              'status', child.status,
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
        ) as childOrders
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.parent_order_id IS NULL -- Fetch only parent orders
      GROUP BY o.id
      ORDER BY o.id DESC
    `);

    return rows;
  } catch (err) {
    throw new Error('Failed to retrieve orders');
  }
};
  
exports.getOrderById = async (id) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id, 
        o.table_number, 
        o.total_amount, 
        o.status,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,           -- order_items id
            'menu_item_id', mi.id, -- menu_items id
            'name', mi.name,
            'quantity', oi.quantity,
            'price', oi.price_at_time
          )
        ) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = ? OR o.parent_order_id = ? -- Include parent and child orders
      GROUP BY o.id
    `, [id, id]);
    return rows[0] || null;
  } catch (err) {
    throw new Error('Failed to retrieve order');
  }
};


  exports.createOrder = async (tableNumber, items) => {
    let totalAmount = 0;

    try {
        // Create the order
        const [orderResult] = await db.query(
            'INSERT INTO orders (table_number, total_amount, status) VALUES (?, ?, ?)',
            [tableNumber, totalAmount, 'pending']
        );
        const orderId = orderResult.insertId;

        // Insert order items
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

        // Update total amount
        await db.query(
            'UPDATE orders SET total_amount = ? WHERE id = ?',
            [totalAmount, orderId]
        );

        // Fetch the complete order with proper item details
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
            ) as items
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

exports.mergeOrders = async (parentId, childId) => {
  try {
    await db.query('START TRANSACTION');

    // Get parent and child orders
    const [parentOrder] = await db.query('SELECT * FROM orders WHERE id = ?', [parentId]);
    const [childOrder] = await db.query('SELECT * FROM orders WHERE id = ?', [childId]);

    // Validate orders
    if (!parentOrder[0] || !childOrder[0]) {
      throw new Error('Order not found');
    }

    if (parentOrder[0].status !== 'confirmed') {
      throw new Error('Parent order must be confirmed');
    }

    if (childOrder[0].status !== 'pending') {
      throw new Error('Can only merge pending orders');
    }

    if (parentOrder[0].table_number !== childOrder[0].table_number) {
      throw new Error('Can only merge orders from the same table');
    }

    // Update child order
    await db.query(
      'UPDATE orders SET parent_order_id = ?, status = ? WHERE id = ?',
      [parentId, 'merged', childId]
    );

    // Update parent order total
    const [items] = await db.query(`
      SELECT SUM(oi.quantity * oi.price_at_time) as total
      FROM order_items oi
      WHERE oi.order_id IN (
        SELECT id FROM orders 
        WHERE id = ? OR parent_order_id = ?
      )
    `, [parentId, parentId]);

    await db.query(
      'UPDATE orders SET total_amount = ? WHERE id = ?',
      [items[0].total, parentId]
    );

    await db.query('COMMIT');
    return true;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
};

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