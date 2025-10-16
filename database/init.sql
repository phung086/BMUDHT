-- Sample data for Fintech Demo

-- Insert admin user (password: admin123)
INSERT INTO users (username, email, password, balance, role, mfaEnabled) VALUES
('admin', 'admin@fintech.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 10000.00, 'admin', 1);

-- Insert sample users (password: user123)
INSERT INTO users (username, email, password, balance, role) VALUES
('user1', 'user1@fintech.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 500.00, 'user'),
('user2', 'user2@fintech.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 300.00, 'user'),
('user3', 'user3@fintech.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 200.00, 'user');

-- Insert sample transactions
INSERT INTO transactions (fromUserId, toUserId, amount, type, status, description) VALUES
(2, 3, 50.00, 'transfer', 'completed', 'Sample transfer'),
(3, 2, 25.00, 'transfer', 'completed', 'Return transfer'),
(1, 2, 100.00, 'deposit', 'completed', 'Admin deposit');

-- Insert sample logs
INSERT INTO logs (userId, action, details, ipAddress) VALUES
(2, 'login', 'Successful login', '127.0.0.1'),
(3, 'transfer', 'Transfer to user2', '127.0.0.1'),
(1, 'admin_action', 'Viewed logs', '127.0.0.1');
