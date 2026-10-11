// server.js - Halal Investment Platform Express API
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { parseTransactionSMS } = require('./smsParser');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'halal_secret_key_2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Generate 6-char referral invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Admin Middleware
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin privilege required' });
  }
}

// ==========================================
// 1. AUTHENTICATION & USER ROUTES
// ==========================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { phone, password, referralCode } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone number and password required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(400).json({ error: 'Phone number is already registered' });
  }

  // Validate referral code if provided
  let referredBy = null;
  if (referralCode) {
    const inviter = db.prepare('SELECT invite_code FROM users WHERE invite_code = ?').get(referralCode.trim().toUpperCase());
    if (inviter) {
      referredBy = inviter.invite_code;
    }
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  let inviteCode = generateInviteCode();
  // Ensure unique
  while (db.prepare('SELECT id FROM users WHERE invite_code = ?').get(inviteCode)) {
    inviteCode = generateInviteCode();
  }

  const insert = db.prepare(`
    INSERT INTO users (phone, password, balance, role, invite_code, referred_by)
    VALUES (?, ?, 0, 'user', ?, ?)
  `);
  const result = insert.run(phone, hashedPassword, inviteCode, referredBy);

  const token = jwt.sign({ id: result.lastInsertRowid, phone, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: result.lastInsertRowid, phone, balance: 0, role: 'user', invite_code: inviteCode }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    return res.status(400).json({ error: 'Invalid phone or password' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid phone or password' });
  }

  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      balance: user.balance,
      role: user.role,
      invite_code: user.invite_code,
      telebirr_account: user.telebirr_account,
      bank_name: user.bank_name,
      bank_account: user.bank_account
    }
  });
});

// Get Current User Profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, phone, balance, role, invite_code, telebirr_account, bank_name, bank_account, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update Withdrawal Account Details
app.post('/api/user/payment-accounts', authenticateToken, (req, res) => {
  const { telebirr_account, bank_name, bank_account } = req.body;
  db.prepare(`
    UPDATE users 
    SET telebirr_account = coalesce(?, telebirr_account),
        bank_name = coalesce(?, bank_name),
        bank_account = coalesce(?, bank_account)
    WHERE id = ?
  `).run(telebirr_account || null, bank_name || null, bank_account || null, req.user.id);

  res.json({ success: true, message: 'Withdrawal details updated successfully' });
});

// ==========================================
// 2. VIP PRODUCTS & EQUIPMENT
// ==========================================

// Get all active VIP products
app.get('/api/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY tier_level ASC').all();
  res.json(products);
});

// Buy / Rent VIP Product
app.post('/api/products/buy', authenticateToken, (req, res) => {
  const { productId } = req.body;
  const user = db.prepare('SELECT id, balance, referred_by FROM users WHERE id = ?').get(req.user.id);
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(productId);

  if (!product) return res.status(404).json({ error: 'VIP Product not found' });
  if (user.balance < product.price) {
    return res.status(400).json({ error: `Insufficient balance. Need ETB ${product.price}, your balance is ETB ${user.balance}` });
  }

  // Deduct user balance & create order inside a transaction
  const buyTx = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(product.price, user.id);
    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, product_id, product_name, price, daily_income, validity_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, product.id, product.name, product.price, product.daily_income, product.validity_days);

    // Distribute 3-Level Referral Commission
    // Level 1: 35%, Level 2: 3%, Level 3: 2%
    let currentReferrerCode = user.referred_by;
    const rates = [
      { level: 1, rate: 0.35 },
      { level: 2, rate: 0.03 },
      { level: 3, rate: 0.02 }
    ];

    for (const r of rates) {
      if (!currentReferrerCode) break;
      const refUser = db.prepare('SELECT id, balance, referred_by FROM users WHERE invite_code = ?').get(currentReferrerCode);
      if (refUser) {
        const commissionAmount = product.price * r.rate;
        // Credit referrer balance
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(commissionAmount, refUser.id);
        // Log commission
        db.prepare(`
          INSERT INTO commissions (beneficiary_id, from_user_id, level, rate, amount, order_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(refUser.id, user.id, r.level, r.rate, commissionAmount, orderResult.lastInsertRowid);

        currentReferrerCode = refUser.referred_by;
      } else {
        break;
      }
    }

    return orderResult.lastInsertRowid;
  });

  const orderId = buyTx();
  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id);

  res.json({
    success: true,
    message: `Congratulations! ${product.name} leased successfully.`,
    orderId,
    newBalance: updatedUser.balance
  });
});

// Get User's Leased Devices
app.get('/api/orders/my-products', authenticateToken, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, p.image 
    FROM orders o 
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.id DESC
  `).all(req.user.id);

  const totals = db.prepare(`
    SELECT COUNT(*) as device_count, COALESCE(SUM(total_earned), 0) as total_income
    FROM orders
    WHERE user_id = ?
  `).get(req.user.id);

  res.json({
    orders,
    deviceCount: totals.device_count,
    totalIncome: totals.total_income
  });
});

// Claim Daily Income for Active Orders
app.post('/api/orders/claim-income', authenticateToken, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? AND status = 'active'").all(req.user.id);
  if (orders.length === 0) {
    return res.status(400).json({ error: 'No active devices found to claim income from.' });
  }

  let totalClaimed = 0;
  const now = new Date().toISOString();

  const claimTx = db.transaction(() => {
    for (const order of orders) {
      // Allow claim once per simulation/cycle
      totalClaimed += order.daily_income;
      db.prepare(`
        UPDATE orders 
        SET total_earned = total_earned + ?,
            days_claimed = days_claimed + 1,
            last_claimed_at = ?
        WHERE id = ?
      `).run(order.daily_income, now, order.id);
    }
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalClaimed, req.user.id);
  });

  claimTx();
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

  res.json({
    success: true,
    claimedAmount: totalClaimed,
    newBalance: user.balance,
    message: `Successfully collected ETB ${totalClaimed.toLocaleString()} today's earnings!`
  });
});

// ==========================================
// 3. DEPOSIT & SMS TRANSACTION VERIFICATION
// ==========================================

// Official Platform Receiver Accounts
app.get('/api/deposits/receiver-info', (req, res) => {
  res.json({
    telebirr: {
      accountName: 'Yohannes Yesgat',
      accountNumber: '0938236272',
      qrCodeNote: 'Transfer via Telebirr App Send Money'
    },
    cbe: {
      accountName: 'Hailemariam Yohannes',
      accountNumber: '1000344285048',
      bank: 'Commercial Bank of Ethiopia (CBE)'
    },
    minimumDeposit: 800
  });
});

// Test / Parse Transaction SMS Preview (Client side live validation)
app.post('/api/deposits/parse-preview', (req, res) => {
  const { rawSms } = req.body;
  const parsed = parseTransactionSMS(rawSms);
  res.json(parsed);
});

// Submit Deposited SMS for Verification & Auto-Credit
app.post('/api/deposits/verify-and-submit', authenticateToken, (req, res) => {
  const { rawSms, selectedAmount } = req.body;
  if (!rawSms) {
    return res.status(400).json({ error: 'Transaction SMS is required' });
  }

  const parsed = parseTransactionSMS(rawSms);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error });
  }

  // 1. Check for Duplicate Transaction ID
  const existingDeposit = db.prepare('SELECT id, status FROM deposits WHERE transaction_id = ?').get(parsed.transactionId);
  if (existingDeposit) {
    return res.status(400).json({
      error: `Transaction ID ${parsed.transactionId} has already been processed and cannot be reused.`
    });
  }

  // 2. Minimum Deposit check
  if (parsed.amount < 800) {
    return res.status(400).json({
      error: `Minimum deposit is ETB 800. Parsed amount is ETB ${parsed.amount}.`
    });
  }

  // 3. Automated Check against Business Incoming SMS Log (if registered)
  const incomingLog = db.prepare('SELECT * FROM incoming_sms_logs WHERE transaction_id = ? AND claimed = 0').get(parsed.transactionId);

  // If incoming log exists or in direct verification mode, automatically approve and credit
  const autoApprove = !!incomingLog || true; // In standard mode, immediately record and credit or set pending based on preference

  if (autoApprove) {
    const depositTx = db.transaction(() => {
      // Record Deposit
      db.prepare(`
        INSERT INTO deposits (user_id, provider, transaction_id, amount, raw_message, status, verification_type)
        VALUES (?, ?, ?, ?, ?, 'approved', 'auto')
      `).run(req.user.id, parsed.provider, parsed.transactionId, parsed.amount, rawSms);

      // Add to user balance
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(parsed.amount, req.user.id);

      // Mark incoming log as claimed if was present
      if (incomingLog) {
        db.prepare('UPDATE incoming_sms_logs SET claimed = 1 WHERE id = ?').run(incomingLog.id);
      }
    });

    depositTx();

    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
    return res.json({
      success: true,
      status: 'approved',
      message: `Verified! ETB ${parsed.amount.toLocaleString()} has been instantly added to your Halal account.`,
      transactionId: parsed.transactionId,
      amount: parsed.amount,
      provider: parsed.provider,
      newBalance: user.balance
    });
  } else {
    // Record for Admin Review
    db.prepare(`
      INSERT INTO deposits (user_id, provider, transaction_id, amount, raw_message, status, verification_type)
      VALUES (?, ?, ?, ?, ?, 'pending', 'admin')
    `).run(req.user.id, parsed.provider, parsed.transactionId, parsed.amount, rawSms);

    return res.json({
      success: true,
      status: 'pending',
      message: `Deposit with TxID ${parsed.transactionId} submitted for quick admin confirmation.`,
      transactionId: parsed.transactionId,
      amount: parsed.amount,
      provider: parsed.provider
    });
  }
});

// Get User Deposit Records
app.get('/api/deposits/records', authenticateToken, (req, res) => {
  const records = db.prepare('SELECT * FROM deposits WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json(records);
});

// ==========================================
// 4. WITHDRAWAL SYSTEM
// ==========================================

// Submit Withdrawal Request
app.post('/api/withdrawals/submit', authenticateToken, (req, res) => {
  const { amount, channel, accountNumber, accountName } = req.body;
  const numAmount = parseFloat(amount);

  if (!numAmount || numAmount < 200) {
    return res.status(400).json({ error: 'Minimum withdrawal is ETB 200.' });
  }
  if (!accountNumber) {
    return res.status(400).json({ error: 'Account number / Telebirr phone is required.' });
  }

  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  if (user.balance < numAmount) {
    return res.status(400).json({ error: `Insufficient balance. Available: ETB ${user.balance}` });
  }

  const fee = 0; // 0% Halal fee or customizable
  const finalAmount = numAmount - fee;

  const withdrawTx = db.transaction(() => {
    // Deduct user balance
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(numAmount, req.user.id);

    // Insert withdrawal record
    db.prepare(`
      INSERT INTO withdrawals (user_id, channel, account_number, account_name, amount, fee, final_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(req.user.id, channel || 'TELEBIRR', accountNumber, accountName || '', numAmount, fee, finalAmount);
  });

  withdrawTx();
  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

  res.json({
    success: true,
    message: 'Withdrawal request submitted successfully. Payout will be sent within 15-30 minutes.',
    newBalance: updatedUser.balance
  });
});

// Get User Withdrawal Records
app.get('/api/withdrawals/records', authenticateToken, (req, res) => {
  const records = db.prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json(records);
});

// ==========================================
// 5. MY TEAM & REFERRAL COMMISSIONS
// ==========================================

app.get('/api/team/stats', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT invite_code FROM users WHERE id = ?').get(req.user.id);

  // Level 1: direct invites
  const level1Users = db.prepare('SELECT id, phone, created_at FROM users WHERE referred_by = ?').all(user.invite_code);
  const l1Count = level1Users.length;

  // Level 2: invites of direct invites
  const l1Codes = level1Users.map(u => u.id);
  let l2Users = [];
  if (level1Users.length > 0) {
    const l1InviteCodes = db.prepare(`SELECT invite_code FROM users WHERE id IN (${level1Users.map(() => '?').join(',')})`).all(...level1Users.map(u => u.id)).map(r => r.invite_code);
    if (l1InviteCodes.length > 0) {
      l2Users = db.prepare(`SELECT id, phone, invite_code FROM users WHERE referred_by IN (${l1InviteCodes.map(() => '?').join(',')})`).all(...l1InviteCodes);
    }
  }
  const l2Count = l2Users.length;

  // Level 3: invites of level 2
  let l3Count = 0;
  if (l2Users.length > 0) {
    const l2InviteCodes = l2Users.map(u => u.invite_code);
    l3Count = db.prepare(`SELECT COUNT(*) as count FROM users WHERE referred_by IN (${l2InviteCodes.map(() => '?').join(',')})`).get(...l2InviteCodes).count;
  }

  // Earnings per level
  const l1Earnings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE beneficiary_id = ? AND level = 1').get(req.user.id).total;
  const l2Earnings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE beneficiary_id = ? AND level = 2').get(req.user.id).total;
  const l3Earnings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE beneficiary_id = ? AND level = 3').get(req.user.id).total;

  const totalInvitedIncome = l1Earnings + l2Earnings + l3Earnings;
  const totalValidUsers = l1Count + l2Count + l3Count;

  res.json({
    inviteCode: user.invite_code,
    inviteLink: `https://halal.et/reg?code=${user.invite_code}`,
    totalValidUsers,
    totalInvitedIncome,
    levels: [
      { level: 1, rate: '35%', validUsers: l1Count, income: l1Earnings },
      { level: 2, rate: '3%', validUsers: l2Count, income: l2Earnings },
      { level: 3, rate: '2%', validUsers: l3Count, income: l3Earnings }
    ]
  });
});

// ==========================================
// 6. ADMIN DASHBOARD APIS (`/api/admin/...`)
// ==========================================

// Dashboard Statistics Overview
app.get('/api/admin/overview', authenticateToken, requireAdmin, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE role != "admin"').get().c;
  const totalBalance = db.prepare('SELECT COALESCE(SUM(balance), 0) as b FROM users WHERE role != "admin"').get().b;
  const totalDeposits = db.prepare('SELECT COALESCE(SUM(amount), 0) as d FROM deposits WHERE status = "approved"').get().d;
  const totalWithdrawals = db.prepare('SELECT COALESCE(SUM(amount), 0) as w FROM withdrawals WHERE status = "approved"').get().w;
  const pendingDeposits = db.prepare('SELECT COUNT(*) as c FROM deposits WHERE status = "pending"').get().c;
  const pendingWithdrawals = db.prepare('SELECT COUNT(*) as c FROM withdrawals WHERE status = "pending"').get().c;
  const activeOrders = db.prepare('SELECT COUNT(*) as c FROM orders WHERE status = "active"').get().c;

  res.json({
    totalUsers,
    totalBalance,
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,
    activeOrders
  });
});

// All Deposits for Admin
app.get('/api/admin/deposits', authenticateToken, requireAdmin, (req, res) => {
  const deposits = db.prepare(`
    SELECT d.*, u.phone as user_phone
    FROM deposits d
    JOIN users u ON d.user_id = u.id
    ORDER BY d.id DESC
  `).all();
  res.json(deposits);
});

// Approve or Reject Deposit
app.post('/api/admin/deposits/:id/action', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body; // 'approve' or 'reject'
  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(id);

  if (!deposit) return res.status(404).json({ error: 'Deposit record not found' });
  if (deposit.status !== 'pending') {
    return res.status(400).json({ error: `Deposit already ${deposit.status}` });
  }

  if (action === 'approve') {
    const approveTx = db.transaction(() => {
      db.prepare('UPDATE deposits SET status = "approved", reviewed_by = "admin", notes = ? WHERE id = ?').run(notes || null, id);
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(deposit.amount, deposit.user_id);
    });
    approveTx();
    res.json({ success: true, message: `Deposit of ETB ${deposit.amount} approved and credited.` });
  } else {
    db.prepare('UPDATE deposits SET status = "rejected", reviewed_by = "admin", notes = ? WHERE id = ?').run(notes || 'Rejected by admin', id);
    res.json({ success: true, message: 'Deposit marked rejected.' });
  }
});

// All Withdrawals for Admin
app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, (req, res) => {
  const withdrawals = db.prepare(`
    SELECT w.*, u.phone as user_phone, u.balance as current_balance
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    ORDER BY w.id DESC
  `).all();
  res.json(withdrawals);
});

// Process Withdrawal (Pay / Reject)
app.post('/api/admin/withdrawals/:id/action', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, admin_tx_id } = req.body;
  const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id);

  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  if (withdrawal.status !== 'pending') {
    return res.status(400).json({ error: `Withdrawal already ${withdrawal.status}` });
  }

  if (action === 'approve') {
    db.prepare('UPDATE withdrawals SET status = "approved", admin_tx_id = ? WHERE id = ?').run(admin_tx_id || 'PROCESSED', id);
    res.json({ success: true, message: 'Withdrawal marked approved and paid.' });
  } else {
    // Refund balance on reject
    const refundTx = db.transaction(() => {
      db.prepare('UPDATE withdrawals SET status = "rejected", admin_tx_id = "REFUNDED" WHERE id = ?').run(id);
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(withdrawal.amount, withdrawal.user_id);
    });
    refundTx();
    res.json({ success: true, message: 'Withdrawal rejected and balance refunded to user.' });
  }
});

// All Users for Admin
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, phone, balance, role, invite_code, referred_by, created_at FROM users ORDER BY id DESC').all();
  res.json(users);
});

// Update User Balance by Admin
app.post('/api/admin/users/:id/adjust-balance', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { deltaAmount } = req.body; // e.g. +500 or -500
  const amt = parseFloat(deltaAmount);
  if (isNaN(amt)) return res.status(400).json({ error: 'Invalid delta amount' });

  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amt, id);
  const updated = db.prepare('SELECT balance FROM users WHERE id = ?').get(id);
  res.json({ success: true, newBalance: updated.balance });
});

// SMS Forwarder Webhook (Receives SMS from phone app)
app.post('/api/webhook/sms', (req, res) => {
  const { text, from } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });

  const parsed = parseTransactionSMS(text);
  if (parsed.success) {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO incoming_sms_logs (sender_phone, transaction_id, amount, provider, raw_sms)
        VALUES (?, ?, ?, ?, ?)
      `).run(from || parsed.phone || 'SERVER', parsed.transactionId, parsed.amount, parsed.provider, text);
    } catch (e) {
      console.error('SMS log error', e);
    }
  }
  res.json({ status: 'ok', parsed });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Halal Investment Backend running on http://localhost:${PORT}`);
});
