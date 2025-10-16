-- Fintech Demo Database Schema for SQLite with camelCase column names

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    balance REAL DEFAULT 0.00,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    isLocked INTEGER DEFAULT 0,
    failedLoginAttempts INTEGER DEFAULT 0,
    lastFailedLogin TEXT NULL,
    mfaEnabled INTEGER DEFAULT 0,
    mfaSecret TEXT NULL,
    encryptedData TEXT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUserId INTEGER REFERENCES users(id),
    toUserId INTEGER REFERENCES users(id),
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('transfer', 'deposit', 'withdraw')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    description TEXT NULL,
    encryptedDetails TEXT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Logs table
CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT NULL,
    ipAddress TEXT NULL,
    userAgent TEXT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_transactions_fromUserId ON transactions(fromUserId);
CREATE INDEX idx_transactions_toUserId ON transactions(toUserId);
CREATE INDEX idx_logs_userId ON logs(userId);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
