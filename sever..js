const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Simulated Database (Single JSON file)
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Helper to save order
const saveOrder = (order) => {
    let orders = [];
    if (fs.existsSync(ORDERS_FILE)) {
        const data = fs.readFileSync(ORDERS_FILE);
        orders = JSON.parse(data);
    }
    orders.push(order);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

// POST Route for Checkout
app.post('/api/checkout', (req, res) => {
    try {
        const { name, email, phone, address, city, zip, cart, total } = req.body;

        // Basic Selection/Sanitization Simulation
        if (!name || !email || !address) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Generate Unique Order ID
        const orderId = `MTX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newOrder = {
            orderId,
            customer: { name, email, phone, address, city, zip },
            items: cart,
            total,
            timestamp: new Date().toISOString()
        };

        // Simulate Database Save
        saveOrder(newOrder);

        console.log(`[Matrix] Order Processed: ${orderId}`);

        res.status(200).json({
            success: true,
            orderId,
            message: 'Order received in the Matrix.'
        });
    } catch (error) {
        console.error('[Matrix] Checkout Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`[Matrix] Server running on http://localhost:${PORT}`);
});
