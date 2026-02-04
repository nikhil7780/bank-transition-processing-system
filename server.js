const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Serve frontend files

// --- C-Style Data Structures Implementation ---

// 1. Generic Linked List Node (struct Node)
class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

// 2. Hash Table (Simulating C-style Hashing with Chaining)
class HashTable {
    constructor(size = 100) {
        this.size = size;
        this.table = new Array(size).fill(null);
        this.count = 0;
    }

    _hash(key) {
        return key % this.size;
    }

    put(key, value) {
        const index = this._hash(key);
        if (!this.table[index]) {
            this.table[index] = new Node({ key, value });
            this.count++;
            return;
        }
        let current = this.table[index];
        while (current) {
            if (current.data.key === key) {
                current.data.value = value;
                return;
            }
            if (!current.next) break;
            current = current.next;
        }
        current.next = new Node({ key, value });
        this.count++;
    }

    get(key) {
        const index = this._hash(key);
        let current = this.table[index];
        while (current) {
            if (current.data.key === key) return current.data.value;
            current = current.next;
        }
        return null;
    }

    has(key) {
        return this.get(key) !== null;
    }

    getAllValues() {
        const values = [];
        for (let i = 0; i < this.size; i++) {
            let current = this.table[i];
            while (current) {
                values.push(current.data.value);
                current = current.next;
            }
        }
        return values;
    }

    clear() {
        this.table = new Array(this.size).fill(null);
        this.count = 0;
    }
}
const accounts = new HashTable(100);

// 3. Stack (LIFO) - Linked List Implementation
class Stack {
    constructor() {
        this.top = null;
        this.size = 0;
    }

    push(element) {
        const newNode = new Node(element);
        newNode.next = this.top;
        this.top = newNode;
        this.size++;
    }

    pop() {
        if (!this.top) return null;
        const data = this.top.data;
        this.top = this.top.next;
        this.size--;
        return data;
    }

    peek() {
        return this.top ? this.top.data : null;
    }

    isEmpty() {
        return this.top === null;
    }

    getAll() {
        const items = [];
        let current = this.top;
        while (current) {
            items.push(current.data);
            current = current.next;
        }
        return items;
    }

    clear() {
        this.top = null;
        this.size = 0;
    }
}
const globalParamsStack = new Stack();

// 4. Queue (FIFO) - Linked List Implementation
class Queue {
    constructor() {
        this.front = null;
        this.rear = null;
        this.size = 0;
    }

    enqueue(element) {
        const newNode = new Node(element);
        if (this.rear === null) {
            this.front = this.rear = newNode;
        } else {
            this.rear.next = newNode;
            this.rear = newNode;
        }
        this.size++;
    }

    dequeue() {
        if (this.front === null) return null;
        const data = this.front.data;
        this.front = this.front.next;
        if (this.front === null) {
            this.rear = null;
        }
        this.size--;
        return data;
    }

    isEmpty() {
        return this.front === null;
    }

    getAll() {
        const items = [];
        let current = this.front;
        while (current) {
            items.push(current.data);
            current = current.next;
        }
        return items;
    }

    clear() {
        this.front = null;
        this.rear = null;
        this.size = 0;
    }
}
const pendingQueue = new Queue();
const suspiciousQueue = new Queue();

// --- Helpers ---
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
}

// AI-Based Fraud Detection Logic
function detectFraud(account, amount, type, deviceId) {
    const risks = [];

    // Rule 1: High Amount (> $10,000)
    if (amount > 10000) {
        risks.push('High Value Transaction');
    }

    // Rule 2: Frequency Check (Multiple transactions within 1 min)
    // Only flag frequency if amount is significant (> $100) or high risk
    if (account.lastTransactionTime && amount > 100) {
        const timeDiff = Date.now() - account.lastTransactionTime;
        if (timeDiff < 60000) { // 60 seconds
            risks.push('Rapid Transaction Frequency');
        }
    }

    // Rule 3: Unrecognized Device
    // If deviceId is provided and NOT in knownDevices
    if (deviceId && account.knownDevices && !account.knownDevices.has(deviceId)) {
        risks.push('Unrecognized Device ID');
    }

    return risks.length > 0 ? risks : null;
}

// Global History for Graph
const globalHistory = [];

function logTransaction(accountId, type, amount, status = 'Success') {
    const acc = accounts.get(Number(accountId));
    if (acc) {
        const transRecord = {
            date: new Date().toLocaleString(),
            timestamp: Date.now(),
            type,
            amount: parseFloat(amount),
            status,
            balanceAfter: acc.balance,
            accountId: acc.id
        };

        // Add to account specific history
        acc.transactions.unshift(transRecord);
        acc.lastTransactionTime = Date.now();

        // Add to global history
        globalHistory.unshift(transRecord);
    }
}

// --- API Routes ---

// Get Global History
app.get('/api/history', (req, res) => {
    res.json(globalHistory);
});

// Get Dashboard Stats
app.get('/api/stats', (req, res) => {
    // Traverse Hash Table manually
    let totalBalance = 0;
    let totalTrans = 0;

    // Use new C-style getAllValues() method
    const allAccounts = accounts.getAllValues();

    for (const acc of allAccounts) {
        totalBalance += acc.balance;
        totalTrans += acc.transactions.length;
    }

    res.json({
        totalAccounts: allAccounts.length,
        totalBalance: totalBalance,
        pendingCount: pendingQueue.size + suspiciousQueue.size, // Use .size for Linked List Queue
        totalTransactions: totalTrans,
        rollbackAvailable: !globalParamsStack.isEmpty()
    });
});

// Create Account
app.post('/api/accounts', (req, res) => {
    const { id, balance } = req.body;
    const accId = Number(id);
    const initBal = parseFloat(balance);

    if (accounts.has(accId)) {
        return res.status(400).json({ error: 'Account ID already exists' });
    }

    const newAccount = {
        id: accId,
        balance: initBal,
        transactions: [], // History specific to this account
        knownDevices: new Set(['web_client']), // Default trusted device
        lastTransactionTime: null
    };

    accounts.put(accId, newAccount); // Use put() instead of set()
    logTransaction(accId, 'INIT', initBal);

    res.json({ message: 'Account created successfully', account: accounts.get(accId) });
});

// Get Account Details
app.get('/api/accounts/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!accounts.has(id)) {
        return res.status(404).json({ error: 'Account not found' });
    }
    res.json(accounts.get(id));
});

// List All Accounts (Simplified)
app.get('/api/accounts', (req, res) => {
    const list = accounts.getAllValues().map(a => ({ id: a.id, balance: a.balance }));
    // Search filter
    const query = req.query.q;
    if (query) {
        const filtered = list.filter(a => a.id.toString().includes(query));
        return res.json(filtered);
    }
    res.json(list);
});

// Add Pending Transaction (Queue with Fraud Check)
app.post('/api/pending', (req, res) => {
    const { accountId, type, amount, deviceId } = req.body;
    const accId = Number(accountId);

    if (!accounts.has(accId)) {
        return res.status(404).json({ error: 'Account not found' });
    }

    const acc = accounts.get(accId);
    const amt = parseFloat(amount);

    // AI Fraud Detection Check
    const risks = detectFraud(acc, amt, type, deviceId);

    const transaction = {
        id: Date.now(),
        accountId: accId,
        type, // 'D' or 'W'
        amount: amt,
        date: new Date().toLocaleString(),
        deviceId: deviceId || 'unknown',
        risks: risks || null // If risks exist, it's suspicious
    };

    if (risks) {
        // High Priority - Add to Suspicious Queue
        suspiciousQueue.enqueue(transaction);
        res.json({
            message: 'Transaction flagged as Suspicious! Added to Priority Queue.',
            position: suspiciousQueue.size,
            risks
        });
    } else {
        // Normal Priority
        pendingQueue.enqueue(transaction);
        res.json({
            message: 'Transaction added to normal queue',
            position: pendingQueue.size
        });
    }
});

// Get Pending List (Merged: Suspicious First)
app.get('/api/pending', (req, res) => {
    const suspicious = suspiciousQueue.getAll().map(t => ({ ...t, isSuspicious: true }));
    const normal = pendingQueue.getAll().map(t => ({ ...t, isSuspicious: false }));
    res.json([...suspicious, ...normal]);
});

// Process Next Pending (Priority Logic)
app.post('/api/pending/process', (req, res) => {
    let trans;
    let isSuspicious = false;

    // Check Priority Queue First
    if (!suspiciousQueue.isEmpty()) {
        trans = suspiciousQueue.dequeue();
        isSuspicious = true;
    } else if (!pendingQueue.isEmpty()) {
        trans = pendingQueue.dequeue();
    } else {
        return res.status(400).json({ error: 'No pending transactions' });
    }

    const acc = accounts.get(trans.accountId);

    if (!acc) {
        return res.status(400).json({ error: 'Account no longer exists' });
    }

    // Process logic
    let success = false;
    let errorMsg = '';

    if (trans.type === 'D') {
        acc.balance += trans.amount;
        success = true;
    } else if (trans.type === 'W') {
        if (acc.balance >= trans.amount) {
            acc.balance -= trans.amount;
            success = true;
        } else {
            errorMsg = 'Insufficient funds';
        }
    }

    if (success) {
        // If successful, trust the device for future
        if (trans.deviceId && acc.knownDevices) {
            acc.knownDevices.add(trans.deviceId);
        }

        logTransaction(acc.id, trans.type === 'D' ? 'Deposit' : 'Withdraw', trans.amount);

        // Push inverse to Stack for Rollback
        globalParamsStack.push({
            type: 'RB',
            originalType: trans.type,
            accountId: acc.id,
            amount: trans.amount,
            timestamp: new Date().toLocaleTimeString()
        });

        res.json({
            message: isSuspicious ? 'Suspicious transaction APPROVED & Processed' : 'Processed successfully',
            transaction: trans
        });
    } else {
        // If failed (e.g. low funds), it's removed from queue anyway
        res.status(400).json({ error: errorMsg, transaction: trans });
    }
});

// Transfer
app.post('/api/transfer', (req, res) => {
    const { fromId, toId, amount } = req.body;
    const val = parseFloat(amount);

    if (!accounts.has(Number(fromId)) || !accounts.has(Number(toId))) {
        return res.status(404).json({ error: 'One or both accounts not found' });
    }

    const fromAcc = accounts.get(Number(fromId));
    const toAcc = accounts.get(Number(toId));

    if (fromAcc.balance < val) {
        return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Execute
    fromAcc.balance -= val;
    toAcc.balance += val;

    logTransaction(fromAcc.id, 'Transfer Out', val);
    logTransaction(toAcc.id, 'Transfer In', val);

    // Rollback Logic: Stack stores REVERSE operation
    // To undo: Take from To, Give back to From
    globalParamsStack.push({
        type: 'RB_TRANSFER',
        fromId: Number(fromId),
        toId: Number(toId),
        amount: val,
        timestamp: new Date().toLocaleTimeString()
    });

    res.json({ message: 'Transfer successful' });
});

// Get Rollback Stack
app.get('/api/rollback', (req, res) => {
    res.json(globalParamsStack.getAll());
});

// Execute Rollback (Pop)
app.post('/api/rollback', (req, res) => {
    if (globalParamsStack.isEmpty()) {
        return res.status(400).json({ error: 'Nothing to rollback' });
    }

    const action = globalParamsStack.pop();

    if (action.type === 'RB') {
        const acc = accounts.get(action.accountId);
        if (action.originalType === 'D') {
            // Undo Deposit -> Remove money
            acc.balance -= action.amount;
            logTransaction(acc.id, 'Rollback (Dep)', action.amount);
        } else {
            // Undo Withdraw -> Add money
            acc.balance += action.amount;
            logTransaction(acc.id, 'Rollback (Wth)', action.amount);
        }
    } else if (action.type === 'RB_TRANSFER') {
        // Undo Transfer: Reverse sender and receiver
        const fromAcc = accounts.get(action.fromId);
        const toAcc = accounts.get(action.toId);

        if (fromAcc && toAcc) {
            toAcc.balance -= action.amount;
            fromAcc.balance += action.amount;
            logTransaction(fromAcc.id, 'Rollback Refund', action.amount);
            logTransaction(toAcc.id, 'Rollback Revert', action.amount);
        }
    }

    res.json({ message: 'Rollback executed successfully', action });
});

// Reset (Clear all)
app.post('/api/reset', (req, res) => {
    accounts.clear();
    pendingQueue.clear();
    suspiciousQueue.clear();
    globalParamsStack.clear();
    globalHistory.length = 0; // Clear global history array

    res.json({ message: 'System reset completely' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
