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

app.use(cors({
  origin: true, // allow all origins - restrict later after domain is confirmed
  credentials: true
}));
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

  // Phone must be numeric (Ethiopian format)
  const phoneClean = phone.toString().replace(/\s+/g, '');
  if (!/^\d{9,15}$/.test(phoneClean)) {
    return res.status(400).json({ error: 'Phone number must be numeric (9-15 digits)' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phoneClean);
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
  while (db.prepare('SELECT id FROM users WHERE invite_code = ?').get(inviteCode)) {
    inviteCode = generateInviteCode();
  }

  const insert = db.prepare(`
    INSERT INTO users (phone, password, balance, role, invite_code, referred_by, has_deposited)
    VALUES (?, ?, 0, 'user', ?, ?, 0)
  `);
  const result = insert.run(phoneClean, hashedPassword, inviteCode, referredBy);

  const token = jwt.sign({ id: result.lastInsertRowid, phone: phoneClean, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: result.lastInsertRowid, phone: phoneClean, balance: 0, role: 'user', invite_code: inviteCode, has_deposited: 0 }
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  const phoneClean = phone ? phone.toString().replace(/\s+/g, '') : '';
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phoneClean);
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
      bank_account: user.bank_account,
      has_deposited: user.has_deposited || 0
    }
  });
});

// Get Current User Profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, phone, balance, role, invite_code, telebirr_account, bank_name, bank_account, created_at, has_deposited FROM users WHERE id = ?').get(req.user.id);
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
  const user = db.prepare('SELECT id, balance, referred_by, has_deposited FROM users WHERE id = ?').get(req.user.id);
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(productId);

  if (!product) return res.status(404).json({ error: 'VIP Product not found' });

  // Require deposit before buying
  if (!user.has_deposited) {
    return res.status(400).json({ error: 'You must make a deposit before purchasing a VIP plan.' });
  }

  if (user.balance < product.price) {
    return res.status(400).json({ error: `Insufficient balance. Need ETB ${product.price}, your balance is ETB ${user.balance}` });
  }

  const buyTx = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(product.price, user.id);
    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, product_id, product_name, price, daily_income, validity_days)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(user.id, product.id, product.name, product.price, product.daily_income, product.validity_days);

    // Distribute 3-Level Referral Commission
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
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(commissionAmount, refUser.id);
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
    minimumDeposit: 800,
    depositBonus: 100
  });
});

// Test / Parse Transaction SMS Preview
app.post('/api/deposits/parse-preview', (req, res) => {
  const { rawSms } = req.body;
  const parsed = parseTransactionSMS(rawSms);
  res.json(parsed);
});

// Submit Deposit (Now goes to admin for manual verification)
app.post('/api/deposits/submit', authenticateToken, (req, res) => {
  const { rawSms, amount, provider } = req.body;

  if (!rawSms && !amount) {
    return res.status(400).json({ error: 'Transaction message or amount is required' });
  }

  let depositAmount = parseFloat(amount) || 0;
  let depositProvider = provider || 'TELEBIRR';
  let transactionId = `TXN_${Date.now()}_${req.user.id}`;
  let parsedData = null;

  // Try to parse SMS if provided
  if (rawSms) {
    parsedData = parseTransactionSMS(rawSms);
    if (parsedData.success) {
      depositAmount = parsedData.amount || depositAmount;
      depositProvider = parsedData.provider || depositProvider;
      transactionId = parsedData.transactionId || transactionId;
    }
  }

  // Minimum deposit check
  if (depositAmount < 800) {
    return res.status(400).json({ error: 'Minimum deposit is ETB 800.' });
  }

  // Check for duplicate transaction ID (only for auto-parsed ones)
  if (parsedData && parsedData.success && parsedData.transactionId) {
    const existingDeposit = db.prepare('SELECT id FROM deposits WHERE transaction_id = ?').get(parsedData.transactionId);
    if (existingDeposit) {
      return res.status(400).json({ error: `Transaction ID already submitted. Cannot reuse transaction.` });
    }
    transactionId = parsedData.transactionId;
  } else {
    // Generate unique ID for manual submissions
    transactionId = `MANUAL_${Date.now()}_${req.user.id}`;
  }

  // Insert as PENDING for admin approval
  db.prepare(`
    INSERT INTO deposits (user_id, provider, transaction_id, amount, raw_message, status, verification_type)
    VALUES (?, ?, ?, ?, ?, 'pending', 'admin')
  `).run(req.user.id, depositProvider, transactionId, depositAmount, rawSms || `Manual deposit of ETB ${depositAmount}`);

  return res.json({
    success: true,
    status: 'pending',
    message: `Deposit request of ETB ${depositAmount.toLocaleString()} submitted. Waiting for admin verification.`,
    transactionId,
    amount: depositAmount,
    provider: depositProvider
  });
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

  if (!numAmount || numAmount < 100) {
    return res.status(400).json({ error: 'Minimum withdrawal is ETB 100.' });
  }
  if (!accountNumber) {
    return res.status(400).json({ error: 'Account number / Telebirr phone is required.' });
  }

  // Check if user has ever made a deposit
  const user = db.prepare('SELECT balance, has_deposited FROM users WHERE id = ?').get(req.user.id);
  if (!user.has_deposited) {
    return res.status(400).json({ error: 'You must make a deposit before withdrawing.' });
  }

  if (user.balance < numAmount) {
    return res.status(400).json({ error: `Insufficient balance. Available: ETB ${user.balance.toFixed(2)}` });
  }

  const fee = 0;
  const finalAmount = numAmount - fee;

  const withdrawTx = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(numAmount, req.user.id);
    db.prepare(`
      INSERT INTO withdrawals (user_id, channel, account_number, account_name, amount, fee, final_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(req.user.id, channel || 'TELEBIRR', accountNumber, accountName || '', numAmount, fee, finalAmount);
  });

  withdrawTx();
  const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);

  res.json({
    success: true,
    message: 'Withdrawal request submitted. Admin will process within 30 minutes.',
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

  // Level 2
  let l2Users = [];
  if (level1Users.length > 0) {
    const l1InviteCodes = db.prepare(`SELECT invite_code FROM users WHERE id IN (${level1Users.map(() => '?').join(',')})`).all(...level1Users.map(u => u.id)).map(r => r.invite_code);
    if (l1InviteCodes.length > 0) {
      l2Users = db.prepare(`SELECT id, phone, invite_code FROM users WHERE referred_by IN (${l1InviteCodes.map(() => '?').join(',')})`).all(...l1InviteCodes);
    }
  }
  const l2Count = l2Users.length;

  // Level 3
  let l3Count = 0;
  if (l2Users.length > 0) {
    const l2InviteCodes = l2Users.map(u => u.invite_code);
    l3Count = db.prepare(`SELECT COUNT(*) as count FROM users WHERE referred_by IN (${l2InviteCodes.map(() => '?').join(',')})`).get(...l2InviteCodes).count;
  }

  const l1Earnings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE beneficiary_id = ? AND level = 1').get(req.user.id).total;
  const l2Earnings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE beneficiary_id = ? AND level = 2').get(req.user.id).total;
  const l3Earnings = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM commissions WHERE beneficiary_id = ? AND level = 3').get(req.user.id).total;

  const totalInvitedIncome = l1Earnings + l2Earnings + l3Earnings;
  const totalValidUsers = l1Count + l2Count + l3Count;

  res.json({
    inviteCode: user.invite_code,
    inviteLink: `https://halal-invest.com/register?ref=${user.invite_code}`,
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
// 6. ADMIN DASHBOARD APIS
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

// All Deposits for Admin (pending first)
app.get('/api/admin/deposits', authenticateToken, requireAdmin, (req, res) => {
  const deposits = db.prepare(`
    SELECT d.*, u.phone as user_phone
    FROM deposits d
    JOIN users u ON d.user_id = u.id
    ORDER BY CASE d.status WHEN 'pending' THEN 0 ELSE 1 END, d.id DESC
  `).all();
  res.json(deposits);
});

// Approve or Reject Deposit (with 100 ETB bonus on first deposit)
app.post('/api/admin/deposits/:id/action', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body;
  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(id);

  if (!deposit) return res.status(404).json({ error: 'Deposit record not found' });
  if (deposit.status !== 'pending') {
    return res.status(400).json({ error: `Deposit already ${deposit.status}` });
  }

  if (action === 'approve') {
    const approveTx = db.transaction(() => {
      db.prepare('UPDATE deposits SET status = "approved", reviewed_by = "admin", notes = ? WHERE id = ?').run(notes || null, id);

      // Check if user has deposited before
      const user = db.prepare('SELECT has_deposited FROM users WHERE id = ?').get(deposit.user_id);
      let totalCredit = deposit.amount;
      let bonusApplied = false;

      // Give 100 ETB bonus on first deposit
      if (!user.has_deposited) {
        totalCredit += 100;
        bonusApplied = true;
        db.prepare('UPDATE users SET has_deposited = 1 WHERE id = ?').run(deposit.user_id);
      }

      // Credit user balance
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(totalCredit, deposit.user_id);
    });
    approveTx();
    const dep = db.prepare('SELECT * FROM deposits WHERE id = ?').get(id);
    const userChk = db.prepare('SELECT has_deposited FROM users WHERE id = ?').get(deposit.user_id);
    res.json({ success: true, message: `Deposit of ETB ${deposit.amount} approved and credited.` });
  } else {
    db.prepare('UPDATE deposits SET status = "rejected", reviewed_by = "admin", notes = ? WHERE id = ?').run(notes || 'Rejected by admin', id);
    res.json({ success: true, message: 'Deposit marked rejected.' });
  }
});

// All Withdrawals for Admin (pending first)
app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, (req, res) => {
  const withdrawals = db.prepare(`
    SELECT w.*, u.phone as user_phone, u.balance as current_balance
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    ORDER BY CASE w.status WHEN 'pending' THEN 0 ELSE 1 END, w.id DESC
  `).all();
  res.json(withdrawals);
});

// Process Withdrawal
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
  const users = db.prepare('SELECT id, phone, balance, role, invite_code, referred_by, has_deposited, created_at FROM users ORDER BY id DESC').all();
  res.json(users);
});

// Update User Balance by Admin
app.post('/api/admin/users/:id/adjust-balance', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { deltaAmount } = req.body;
  const amt = parseFloat(deltaAmount);
  if (isNaN(amt)) return res.status(400).json({ error: 'Invalid delta amount' });

  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amt, id);
  const updated = db.prepare('SELECT balance FROM users WHERE id = ?').get(id);
  res.json({ success: true, newBalance: updated.balance });
});

// Update user role (promote/demote admin)
app.post('/api/admin/users/:id/set-role', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  res.json({ success: true });
});

// SMS Forwarder Webhook
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
