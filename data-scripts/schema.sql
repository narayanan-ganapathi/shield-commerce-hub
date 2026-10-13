-- 1. Core Product Master Catalog Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
);

-- 2. Real-Time Stock Control Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
    product_id INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    available_stock INT NOT NULL CHECK (available_stock >= 0)
);

-- 3. High-Security Transactional Order Logs Table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    order_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Populate the Master Product Catalog
INSERT INTO products (id, name, description, price) VALUES 
(1, 'Enterprise Pro Laptop', '16-inch high-performance developer workstation', 1299.99),
(2, 'Wireless Noise-Canceling Headphones', 'Studio grade immersive audio gear', 249.50),
(3, 'UltraWide Ergonomic Monitor', '34-inch screen built for optimal visual workflows', 499.00),
(4, 'Mechanical Tactile Keyboard', 'Compact layout optimized for fast keystrokes', 89.99),
(5, 'Ergonomic Vertical Mouse', 'Wireless design targeted at wrist relief', 65.00);

-- Map Exact Corresponding Inventory Stock Allocations
INSERT INTO inventory (product_id, available_stock) VALUES 
(1, 15), -- Plenty of stock for normal tests
(2, 2),  -- Hyper-low stock allocation specifically to test checkout sell-out failures
(3, 8), 
(4, 0),  -- Instant out-of-stock validation asset
(5, 20);
