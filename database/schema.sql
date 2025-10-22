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

-- Credit card application tables
CREATE TABLE credit_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    fullName TEXT NOT NULL,
    dateOfBirth TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    nationalId TEXT NOT NULL,
    incomeLevel TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    riskNotes TEXT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    requestId INTEGER NOT NULL REFERENCES credit_requests(id),
    cardNumber TEXT NOT NULL,
    expiryMonth INTEGER NOT NULL,
    expiryYear INTEGER NOT NULL,
    cvv TEXT NOT NULL,
    creditLimit REAL NOT NULL DEFAULT 50000.0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'compromised')),
    leakedAt TEXT NULL,
    leakNotes TEXT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE otp_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    cardId INTEGER NOT NULL REFERENCES credit_cards(id),
    otpCode TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shared', 'consumed', 'expired')),
    attackerNote TEXT NULL,
    amountTarget REAL NULL,
    merchant TEXT NULL,
    expiresAt TEXT NOT NULL,
    userSharedAt TEXT NULL,
    consumedAt TEXT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fraud_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cardId INTEGER NOT NULL REFERENCES credit_cards(id),
    otpSessionId INTEGER NOT NULL REFERENCES otp_sessions(id),
    amount REAL NOT NULL,
    merchant TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    description TEXT NULL,
    executedAt TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_requests_userId ON credit_requests(userId);
CREATE INDEX idx_credit_cards_userId ON credit_cards(userId);
CREATE INDEX idx_credit_cards_requestId ON credit_cards(requestId);
CREATE INDEX idx_otp_sessions_cardId ON otp_sessions(cardId);
CREATE INDEX idx_fraud_transactions_cardId ON fraud_transactions(cardId);

CREATE TABLE card_unlock_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    cardId INTEGER NOT NULL REFERENCES credit_cards(id),
    fullName TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    nationalId TEXT NOT NULL,
    otpCode TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
    expiresAt TEXT NOT NULL,
    verifiedAt TEXT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_card_unlock_requests_cardId ON card_unlock_requests(cardId);
CREATE INDEX idx_card_unlock_requests_status ON card_unlock_requests(status);

CREATE TABLE phishing_captures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baitDomain TEXT NOT NULL,
    landingPath TEXT NULL,
    capturedUsername TEXT NOT NULL,
    capturedPassword TEXT NOT NULL,
    victimUserId INTEGER NULL REFERENCES users(id),
    victimMatched INTEGER NOT NULL DEFAULT 0,
    capturedAt TEXT NOT NULL,
    ipAddress TEXT NULL,
    userAgent TEXT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_phishing_captures_bait ON phishing_captures(baitDomain);
CREATE INDEX idx_phishing_captures_capturedAt ON phishing_captures(capturedAt);
