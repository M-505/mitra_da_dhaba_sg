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

// models/orderModel.js
exports.getMergeableOrders = async (tableNumber) => {
  try {
    const [orders] = await db.query(`
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
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.table_number = ? 
      AND o.parent_order_id IS NULL
      AND o.status IN ('pending', 'confirmed')
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [tableNumber]);

    return orders;
  } catch (err) {
    throw new Error('Failed to retrieve mergeable orders');
  }
};

exports.mergeOrders = async (parentId, childId) => {
  const conn = await db.getConnection();
  
  try {
    await conn.beginTransaction();

    // Get parent and child orders
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE id IN (?, ?)',
      [parentId, childId]
    );

    if (orders.length !== 2) {
      throw new Error('One or both orders not found');
    }

    const parentOrder = orders.find(o => o.id === parseInt(parentId));
    const childOrder = orders.find(o => o.id === parseInt(childId));

    // Validate table numbers match
    if (parentOrder.table_number !== childOrder.table_number) {
      throw new Error('Can only merge orders from the same table');
    }

    // Allow confirmed parent order with pending child order
    if (!(
      (parentOrder.status === 'confirmed' && childOrder.status === 'pending') ||
      (parentOrder.status === 'pending' && childOrder.status === 'pending')
    )) {
      throw new Error('Can only merge: (1) two pending orders, or (2) a pending order into a confirmed order');
    }

    // Get all items from both orders
    const [items] = await conn.query(
      `SELECT oi.*, mi.name 
       FROM order_items oi 
       JOIN menu_items mi ON oi.menu_item_id = mi.id 
       WHERE oi.order_id IN (?, ?)`,
      [parentId, childId]
    );

    // Calculate new total
    const total_amount = items.reduce((sum, item) => 
      sum + (parseFloat(item.price_at_time) * parseInt(item.quantity)), 0
    );

    // Update parent order's total
    await conn.query(
      'UPDATE orders SET total_amount = ? WHERE id = ?',
      [total_amount, parentId]
    );

    // Move items from child to parent
    await conn.query(
      'UPDATE order_items SET order_id = ? WHERE order_id = ?',
      [parentId, childId]
    );

    // Mark child order as merged
    await conn.query(
      'UPDATE orders SET status = ?, parent_order_id = ? WHERE id = ?',
      ['merged', parentId, childId]
    );

    await conn.commit();

    // Return updated parent order
    const [updatedOrder] = await conn.query(`
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
        ) as items
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