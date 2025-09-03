-- minibank.sql
-- SQL schema for MiniBank demo project

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_name VARCHAR(50) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_account_id INTEGER,
    to_account_id INTEGER,
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id),
    FOREIGN KEY (to_account_id) REFERENCES accounts(id)
);

-- Insert a demo user and demo accounts
INSERT INTO users (username, password_hash) VALUES ('demo_user', 'demo_hash');
INSERT INTO accounts (user_id, account_name, balance) VALUES (1, 'Primary Account', 1000.00);
INSERT INTO accounts (user_id, account_name, balance) VALUES (1, 'Savings Account', 5000.00);

-- Insert sample transactions
INSERT INTO transactions (from_account_id, to_account_id, amount, type, note) 
VALUES (NULL, 1, 1000.00, 'top-up', 'Initial balance');
INSERT INTO transactions (from_account_id, to_account_id, amount, type, note) 
VALUES (1, 2, 200.00, 'transfer', 'Transfer to savings');
