// models/orderModel.js
const db = require('../config/database');

exports.getAllOrders = async () => {
    try {
        const [rows] = await db.query(`
            SELECT o.id, o.table_number, o.total_amount, o.status, 
                   JSON_ARRAYAGG(
                       JSON_OBJECT(
                           'id', mi.id,
                           'name', mi.name,
                           'quantity', oi.quantity,
                           'price', oi.price_at_time
                       )
                   ) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            GROUP BY o.id
        `);
        return rows;
    } catch (err) {
        throw new Error('Failed to retrieve orders');
    }
};

exports.getOrderById = async (id) => {
    try {
        const [rows] = await db.query(`
            SELECT o.id, o.table_number, o.total_amount, o.status,
                   JSON_ARRAYAGG(
                       JSON_OBJECT(
                           'id', mi.id,
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
        `, [id]);
        return rows[0] || null;
    } catch (err) {
        throw new Error('Failed to retrieve order');
    }
};

exports.createOrder = async (tableNumber, items) => {
    let totalAmount = 0;

    try {
        const [orderResult] = await db.query(
            'INSERT INTO orders (table_number, total_amount, status) VALUES (?, ?, ?)',
            [tableNumber, totalAmount, 'pending']
        );
        const orderId = orderResult.insertId;

        for (const item of items) {
            const [menuItem] = await db.query(
                'SELECT price FROM menu_items WHERE id = ?',
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

        await db.query(
            'UPDATE orders SET total_amount = ? WHERE id = ?',
            [totalAmount, orderId]
        );

        return { id: orderId, tableNumber, totalAmount, status: 'pending', items };
    } catch (err) {
        throw new Error('Failed to create order');
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