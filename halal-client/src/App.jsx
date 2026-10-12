import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import { useToast, ToastContainer } from './useToast.jsx';
import './index.css';

// ===================== AUTH PAGE =====================
function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toasts, success, error: toastError } = useToast();

  // Pre-fill referral from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('code');
    if (ref) { setReferralCode(ref.toUpperCase()); setMode('register'); }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone || !password) { setError('Phone and password are required.'); return; }
    if (!/^\d{9,15}$/.test(phone.replace(/\s/g, ''))) {
      setError('Phone number must be numeric (e.g. 0938236272 or 251938236272)');
      return;
    }
    if (mode === 'register' && password !== confirmPass) {
      setError('Passwords do not match.'); return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await api.login(phone, password);
      } else {
        result = await api.register(phone, password, referralCode);
      }
      localStorage.setItem('halal_token', result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <ToastContainer toasts={toasts} />
      <div className="auth-logo">
        <div className="auth-logo-icon">☪️</div>
        <h1>HALAL</h1>
        <p>Smart Equipment Investment Platform</p>
      </div>

      <div className="auth-card">
        <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        {error && <div className="error-msg">⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              id="auth-phone"
              className="form-input"
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 0938236272"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              autoComplete="tel"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              id="auth-password"
              className="form-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  id="auth-confirm"
                  className="form-input"
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Referral Code (Optional) 🎁</label>
                <input
                  id="auth-referral"
                  className="form-input"
                  type="text"
                  placeholder="Enter referral code"
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                />
              </div>
            </>
          )}
          <button id="auth-submit-btn" className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '⏳ Please wait...' : mode === 'login' ? '🔐 Login' : '🚀 Create Account'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <span onClick={() => { setMode('register'); setError(''); }}>Register</span></>
          ) : (
            <>Already have an account? <span onClick={() => { setMode('login'); setError(''); }}>Login</span></>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== MARQUEE BANNER =====================
// Fake realistic Ethiopian phone numbers (masked)
const HOT_TRANSACTIONS = [
  { phone: '09****2845', amount: '50,000', type: 'Recharge' },
  { phone: '07****1190', amount: '10,000', type: 'Recharge' },
  { phone: '09****7733', amount: '3,000',  type: 'Recharge' },
  { phone: '09****4412', amount: '25,000', type: 'Recharge' },
  { phone: '07****8821', amount: '5,000',  type: 'Recharge' },
  { phone: '09****6657', amount: '1,500',  type: 'Recharge' },
  { phone: '09****3309', amount: '800',    type: 'Recharge' },
  { phone: '07****5541', amount: '15,000', type: 'Recharge' },
  { phone: '09****0077', amount: '2,000',  type: 'Recharge' },
  { phone: '09****9923', amount: '8,000',  type: 'Recharge' },
  { phone: '07****1188', amount: '20,000', type: 'Withdrawal' },
  { phone: '09****4456', amount: '6,500',  type: 'Withdrawal' },
  { phone: '09****7712', amount: '1,200',  type: 'Income' },
  { phone: '07****3345', amount: '750',    type: 'Income' },
  { phone: '09****8890', amount: '4,500',  type: 'Income' },
];

function MarqueeBanner() {
  const doubled = [...HOT_TRANSACTIONS, ...HOT_TRANSACTIONS];
  return (
    <div className="marquee-banner">
      <div className="marquee-inner">
        {doubled.map((tx, i) => (
          <div key={i} className="marquee-item">
            <div className="marquee-dot" style={{
              background: tx.type === 'Withdrawal' ? 'var(--warning)'
                : tx.type === 'Income' ? '#00bfff'
                : 'var(--primary)'
            }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Hot:</span>
            <span style={{ color: 'white', fontWeight: 600 }}>{tx.phone}</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {tx.type === 'Withdrawal' ? 'Withdrew' : tx.type === 'Income' ? 'Earned' : 'Recharged'}
            </span>
            <span style={{ color: tx.type === 'Withdrawal' ? 'var(--warning)' : tx.type === 'Income' ? '#00bfff' : 'var(--primary)', fontWeight: 700 }}>
              ETB {tx.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== DEPOSIT MODAL =====================
function DepositModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState('TELEBIRR');
  const [smsText, setSmsText] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.getReceiverInfo().then(setReceiverInfo).catch(() => {});
  }, []);

  const handleParse = async () => {
    if (!smsText.trim()) return;
    try {
      const result = await api.parsePreview(smsText);
      setParsed(result);
    } catch {}
  };

  const handleSubmit = async () => {
    setError('');
    const amt = parseFloat(amount) || (parsed && parsed.amount) || 0;
    if (amt < 800) { setError('Minimum deposit is ETB 800.'); return; }
    setLoading(true);
    try {
      await api.submitDeposit({ rawSms: smsText, amount: amt, provider: channel });
      setSubmitted(true);
      onSuccess('Deposit submitted! Admin will verify and credit within 30 minutes.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
            <h3 style={{ color: 'white', fontSize: 20, marginBottom: 8 }}>Deposit Submitted!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              Your deposit is pending admin verification. It will be credited to your account within 30 minutes.
            </p>
            <div className="success-msg">✅ A 100 ETB bonus will be added on your first deposit!</div>
            <button id="deposit-done-btn" className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">💰 Deposit Funds</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        {step === 1 && (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              Select payment method, then transfer money and paste the SMS/transaction message.
            </p>
            <div className="channel-pick">
              <div className={`channel-card ${channel === 'TELEBIRR' ? 'selected' : ''}`} onClick={() => setChannel('TELEBIRR')}>
                <div style={{ fontSize: 32 }}>📱</div>
                <div className="channel-card-name">Telebirr</div>
                <div className="channel-card-sub">Mobile Money</div>
              </div>
              <div className={`channel-card ${channel === 'CBE' ? 'selected' : ''}`} onClick={() => setChannel('CBE')}>
                <div style={{ fontSize: 32 }}>🏦</div>
                <div className="channel-card-name">CBE Birr</div>
                <div className="channel-card-sub">Bank Transfer</div>
              </div>
            </div>

            {receiverInfo && (
              <div className="info-box">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                  {channel === 'TELEBIRR' ? '📱 Telebirr' : '🏦 CBE'} Transfer To:
                </div>
                {channel === 'TELEBIRR' ? (
                  <>
                    <div className="info-box-row">
                      <span className="info-label">Account Name</span>
                      <span className="info-value">{receiverInfo.telebirr.accountName}</span>
                    </div>
                    <div className="info-box-row">
                      <span className="info-label">Phone Number</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="info-value">{receiverInfo.telebirr.accountNumber}</span>
                        <button className="copy-btn" onClick={() => copyToClipboard(receiverInfo.telebirr.accountNumber)}>Copy</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="info-box-row">
                      <span className="info-label">Account Name</span>
                      <span className="info-value">{receiverInfo.cbe.accountName}</span>
                    </div>
                    <div className="info-box-row">
                      <span className="info-label">Account Number</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="info-value">{receiverInfo.cbe.accountNumber}</span>
                        <button className="copy-btn" onClick={() => copyToClipboard(receiverInfo.cbe.accountNumber)}>Copy</button>
                      </div>
                    </div>
                  </>
                )}
                <div className="info-box-row">
                  <span className="info-label">Minimum</span>
                  <span className="info-value" style={{ color: 'var(--primary)' }}>ETB 800</span>
                </div>
                <div className="info-box-row">
                  <span className="info-label">First Deposit Bonus</span>
                  <span className="info-value"><span className="bonus-badge">🎁 +100 ETB</span></span>
                </div>
              </div>
            )}
            <button id="deposit-next-btn" className="btn btn-primary" onClick={() => setStep(2)}>
              I've Made the Transfer →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
              Paste the SMS confirmation you received from {channel === 'TELEBIRR' ? 'Telebirr' : 'CBE'}, or manually enter the amount:
            </p>
            <div className="form-group">
              <label>Transaction SMS Message (recommended)</label>
              <textarea
                className="textarea-input"
                placeholder={`Paste your ${channel} transaction SMS here...\n\nExample: "You have sent ETB 800.00 to 0938236272..."`}
                value={smsText}
                onChange={e => { setSmsText(e.target.value); if (e.target.value) handleParse(); }}
              />
            </div>
            {parsed && parsed.success && (
              <div className="success-msg">
                ✅ Parsed: ETB {parsed.amount} via {parsed.provider} | TxID: {parsed.transactionId}
              </div>
            )}
            <div className="form-group">
              <label>Amount (ETB) — if SMS parse failed</label>
              <input
                id="deposit-amount-input"
                className="form-input"
                type="number"
                min="800"
                placeholder="e.g. 800"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button id="deposit-submit-btn" className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
                {loading ? '⏳ Submitting...' : '📤 Submit for Verification'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===================== WITHDRAW MODAL =====================
function WithdrawModal({ user, onClose, onSuccess }) {
  const [channel, setChannel] = useState('TELEBIRR');
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt < 100) { setError('Minimum withdrawal is ETB 100.'); return; }
    if (!accountNumber) { setError('Account number is required.'); return; }
    if (amt > user.balance) { setError(`Insufficient balance. Available: ETB ${user.balance.toFixed(2)}`); return; }
    setLoading(true);
    try {
      const result = await api.submitWithdrawal({ amount: amt, channel, accountNumber, accountName });
      onSuccess(result.message);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">💸 Withdraw Funds</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="error-msg">⚠️ {error}</div>}
        <div className="info-box" style={{ marginBottom: 16 }}>
          <div className="info-box-row">
            <span className="info-label">Available Balance</span>
            <span className="info-value" style={{ color: 'var(--primary)', fontSize: 18, fontWeight: 800 }}>
              ETB {user.balance.toFixed(2)}
            </span>
          </div>
          <div className="info-box-row">
            <span className="info-label">Minimum Withdrawal</span>
            <span className="info-value">ETB 100</span>
          </div>
        </div>
        <div className="channel-pick">
          <div className={`channel-card ${channel === 'TELEBIRR' ? 'selected' : ''}`} onClick={() => setChannel('TELEBIRR')}>
            <div style={{ fontSize: 28 }}>📱</div>
            <div className="channel-card-name">Telebirr</div>
          </div>
          <div className={`channel-card ${channel === 'CBE' ? 'selected' : ''}`} onClick={() => setChannel('CBE')}>
            <div style={{ fontSize: 28 }}>🏦</div>
            <div className="channel-card-name">CBE Birr</div>
          </div>
        </div>
        <div className="form-group">
          <label>Amount (ETB)</label>
          <input
            id="withdraw-amount-input"
            className="form-input"
            type="number"
            min="100"
            max={user.balance}
            placeholder="Minimum: 100"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>{channel === 'TELEBIRR' ? 'Telebirr Phone Number' : 'CBE Account Number'}</label>
          <input
            id="withdraw-account-input"
            className="form-input"
            type="text"
            placeholder={channel === 'TELEBIRR' ? 'e.g. 0938236272' : 'e.g. 1000XXXXXXXX'}
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Account Name</label>
          <input
            id="withdraw-name-input"
            className="form-input"
            type="text"
            placeholder="Your full name"
            value={accountName}
            onChange={e => setAccountName(e.target.value)}
          />
        </div>
        <button id="withdraw-submit-btn" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? '⏳ Submitting...' : '💸 Request Withdrawal'}
        </button>
      </div>
    </div>
  );
}

// ===================== HOME PAGE =====================
function HomePage({ user, onRefreshUser }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [buyingId, setBuyingId] = useState(null);
  const { toasts, success, error } = useToast();

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleBuy = async (product) => {
    if (!user.has_deposited) {
      error('You must make a deposit before purchasing a VIP plan.');
      return;
    }
    if (user.balance < product.price) {
      error(`Insufficient balance. You need ETB ${product.price.toLocaleString()}.`);
      return;
    }
    setBuyingId(product.id);
    try {
      const result = await api.buyProduct(product.id);
      success(result.message);
      onRefreshUser();
    } catch (err) {
      error(err.message);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="page">
      <ToastContainer toasts={toasts} />
      {showDeposit && (
        <DepositModal
          onClose={() => setShowDeposit(false)}
          onSuccess={(msg) => { success(msg); setShowDeposit(false); onRefreshUser(); }}
        />
      )}
      {showWithdraw && (
        <WithdrawModal
          user={user}
          onClose={() => setShowWithdraw(false)}
          onSuccess={(msg) => { success(msg); onRefreshUser(); }}
        />
      )}

      {/* Hero Card */}
      <div className="hero-card fade-in">
        <div className="hero-greeting">☪️ Peace be upon you, welcome back!</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>+251{user.phone?.slice(-9)}</div>
        <div className="hero-balance-label">Total Balance</div>
        <div className="hero-balance">ETB {(user.balance || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
        {!user.has_deposited && (
          <div style={{ marginTop: 10 }}>
            <span className="bonus-badge">🎁 Make your first deposit → Get 100 ETB bonus!</span>
          </div>
        )}
        <div className="hero-actions">
          <button id="home-deposit-btn" className="hero-action-btn" onClick={() => setShowDeposit(true)}>
            <div className="hero-action-icon" style={{ background: 'rgba(0,200,83,0.15)' }}>💰</div>
            Payment
          </button>
          <button id="home-withdraw-btn" className="hero-action-btn" onClick={() => setShowWithdraw(true)}>
            <div className="hero-action-icon" style={{ background: 'rgba(255,165,2,0.15)' }}>💸</div>
            Withdrawal
          </button>
          <button id="home-support-btn" className="hero-action-btn" onClick={() => window.open('https://t.me/HalalSupport', '_blank')}>
            <div className="hero-action-icon" style={{ background: 'rgba(0,136,255,0.15)' }}>💬</div>
            Service
          </button>
        </div>
      </div>

      {/* VIP Products */}
      <div className="section-header">
        <div className="section-title">VIP Equipment Plans</div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="products-grid">
          {products.map(product => {
            // Fast, tier-colored gradient placeholder instead of slow remote images
            const tierColors = [
              'linear-gradient(135deg,#1a472a,#2d6a4f)',
              'linear-gradient(135deg,#1b4f8a,#2874a6)',
              'linear-gradient(135deg,#512e7a,#7d3c98)',
              'linear-gradient(135deg,#7b2d00,#d35400)',
              'linear-gradient(135deg,#7d6608,#d4ac0d)',
              'linear-gradient(135deg,#1a252f,#2c3e50)',
            ];
            const tierEmojis = ['🖥️','💻','🏭','⚙️','🔬','🚀'];
            const bgColor = tierColors[(product.tier_level - 1) % tierColors.length];
            const emoji = tierEmojis[(product.tier_level - 1) % tierEmojis.length];
            return (
              <div key={product.id} className="product-card fade-in">
                <div className="product-card-header">
                  {/* Optimised image: tiny size param + lazy load. Falls back to gradient tile */}
                  <div className="product-img-wrap">
                    <img
                      className="product-img"
                      src={`${product.image?.split('?')[0]}?w=120&h=120&auto=format&fit=crop&q=50&fm=webp`}
                      alt={product.name}
                      loading="lazy"
                      width="64"
                      height="64"
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="product-img-fallback" style={{ background: bgColor }}>
                      {emoji}
                    </div>
                  </div>
                  <div className="product-info">
                    <div className="product-tier-badge">⭐ VIP{product.tier_level}</div>
                    <div className="product-name">{product.name}</div>
                    <div className="product-category">{product.category}</div>
                  </div>
                </div>
                <div className="product-card-body">
                  <div className="product-stat">
                    <div className="product-stat-label">Daily Income</div>
                    <div className="product-stat-value">ETB {product.daily_income.toLocaleString()}</div>
                  </div>
                  <div className="product-stat">
                    <div className="product-stat-label">Total Return</div>
                    <div className="product-stat-value">ETB {product.total_income.toLocaleString()}</div>
                  </div>
                  <div className="product-stat">
                    <div className="product-stat-label">Duration</div>
                    <div className="product-stat-value">{product.validity_days} Days</div>
                  </div>
                </div>
                <div className="product-card-footer">
                  <div className="product-price">
                    ETB {product.price.toLocaleString()}
                    <span> /lease</span>
                  </div>
                  <button
                    id={`buy-vip${product.tier_level}-btn`}
                    className="btn-buy"
                    onClick={() => handleBuy(product)}
                    disabled={buyingId === product.id}
                  >
                    {buyingId === product.id ? '...' : 'Lease Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===================== MY PRODUCTS PAGE =====================
function MyProductsPage({ onRefreshUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const { toasts, success, error } = useToast();

  const loadData = useCallback(() => {
    api.getMyProducts().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await api.claimIncome();
      success(result.message);
      loadData();
      onRefreshUser();
    } catch (err) {
      error(err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="page"><div className="loading-screen"><div className="loading-spinner" /></div></div>;

  const activeOrders = data?.orders?.filter(o => o.status === 'active') || [];

  return (
    <div className="page">
      <ToastContainer toasts={toasts} />
      {data && (
        <div className="stats-row" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Active Devices</div>
            <div className="stat-value">{data.deviceCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Earned</div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>ETB {(data.totalIncome || 0).toFixed(2)}</div>
          </div>
        </div>
      )}

      {activeOrders.length > 0 && (
        <button
          id="claim-income-btn"
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 16 }}
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming ? '⏳ Collecting...' : '🎯 Collect Today\'s Income'}
        </button>
      )}

      <div className="section-header">
        <div className="section-title">My Leased Devices</div>
      </div>

      {!data?.orders?.length ? (
        <div className="empty-state">
          <div className="empty-icon">🖥️</div>
          <h3>No Devices Yet</h3>
          <p>Go to Home and lease a VIP device to start earning daily income.</p>
        </div>
      ) : (
        data.orders.map(order => {
          const progress = order.validity_days > 0 ? Math.min((order.days_claimed / order.validity_days) * 100, 100) : 0;
          return (
            <div key={order.id} className="my-product-card fade-in">
              <div className="my-product-top">
                <div>
                  <div className="my-product-name">{order.product_name}</div>
                  <div className="my-product-date">Started: {new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`status-badge status-${order.status}`}>{order.status}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="my-product-stats">
                <div className="my-product-stat">
                  <div className="my-product-stat-label">Daily Income</div>
                  <div className="my-product-stat-value">ETB {order.daily_income.toFixed(0)}</div>
                </div>
                <div className="my-product-stat">
                  <div className="my-product-stat-label">Days Left</div>
                  <div className="my-product-stat-value">{Math.max(order.validity_days - order.days_claimed, 0)}</div>
                </div>
                <div className="my-product-stat">
                  <div className="my-product-stat-label">Total Earned</div>
                  <div className="my-product-stat-value" style={{ color: 'var(--primary)' }}>ETB {order.total_earned.toFixed(2)}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ===================== TEAM PAGE =====================
function TeamPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toasts, success } = useToast();

  useEffect(() => {
    api.getTeamStats().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const copyInviteLink = () => {
    if (data?.inviteLink) {
      navigator.clipboard.writeText(data.inviteLink).then(() => success('Invite link copied!')).catch(() => {});
    }
  };
  const copyCode = () => {
    if (data?.inviteCode) {
      navigator.clipboard.writeText(data.inviteCode).then(() => success('Invite code copied!')).catch(() => {});
    }
  };

  if (loading) return <div className="page"><div className="loading-screen"><div className="loading-spinner" /></div></div>;

  return (
    <div className="page">
      <ToastContainer toasts={toasts} />
      <div className="team-hero fade-in">
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your Invite Code</div>
        <div className="invite-code-display" onClick={copyCode} style={{ cursor: 'pointer' }}>
          {data?.inviteCode || '------'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Tap code to copy</div>
        <button id="copy-invite-btn" className="btn btn-primary" style={{ maxWidth: 200, margin: '0 auto' }} onClick={copyInviteLink}>
          🔗 Copy Invite Link
        </button>
        <div style={{ marginTop: 16, padding: '10px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
          {data?.inviteLink}
        </div>
      </div>

      <div className="stats-row" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Total Members</div>
          <div className="stat-value">{data?.totalValidUsers || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Commission</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>ETB {(data?.totalInvitedIncome || 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="section-header"><div className="section-title">Team Levels</div></div>

      {data?.levels?.map((level) => (
        <div key={level.level} className="level-card fade-in">
          <div className={`level-badge level-${level.level}`}>{level.level}</div>
          <div className="level-info">
            <div className="level-name">Level {level.level} Team</div>
            <div className="level-rate">Commission Rate: {level.rate}</div>
          </div>
          <div className="level-stats">
            <div className="level-users">{level.validUsers} Members</div>
            <div className="level-income">ETB {level.income.toFixed(2)}</div>
          </div>
        </div>
      ))}

      <div className="info-box" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 8 }}>🎁 Referral Rewards</div>
        <div className="info-box-row">
          <span className="info-label">Level 1 (Direct)</span>
          <span className="info-value" style={{ color: 'var(--gold)' }}>35% Commission</span>
        </div>
        <div className="info-box-row">
          <span className="info-label">Level 2 (Indirect)</span>
          <span className="info-value" style={{ color: '#c0c0c0' }}>3% Commission</span>
        </div>
        <div className="info-box-row">
          <span className="info-label">Level 3 (Network)</span>
          <span className="info-value" style={{ color: '#cd7f32' }}>2% Commission</span>
        </div>
      </div>
    </div>
  );
}

// ===================== HISTORY PAGE =====================
function HistoryPage() {
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [tab, setTab] = useState('deposits');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDepositRecords(), api.getWithdrawalRecords()])
      .then(([deps, wds]) => { setDeposits(deps); setWithdrawals(wds); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="loading-screen"><div className="loading-spinner" /></div></div>;

  const records = tab === 'deposits' ? deposits : withdrawals;

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`admin-tab ${tab === 'deposits' ? 'active' : ''}`} onClick={() => setTab('deposits')} id="history-deposits-tab">
          💰 Deposits ({deposits.length})
        </button>
        <button className={`admin-tab ${tab === 'withdrawals' ? 'active' : ''}`} onClick={() => setTab('withdrawals')} id="history-withdrawals-tab">
          💸 Withdrawals ({withdrawals.length})
        </button>
      </div>

      {!records.length ? (
        <div className="empty-state">
          <div className="empty-icon">{tab === 'deposits' ? '💰' : '💸'}</div>
          <h3>No {tab} yet</h3>
          <p>Your transaction history will appear here.</p>
        </div>
      ) : (
        records.map(tx => (
          <div key={tx.id} className="tx-item fade-in">
            <div className={`tx-icon ${tab === 'deposits' ? 'tx-icon-deposit' : 'tx-icon-withdraw'}`}>
              {tab === 'deposits' ? '⬇️' : '⬆️'}
            </div>
            <div className="tx-info">
              <div className="tx-type">{tab === 'deposits' ? 'Deposit' : 'Withdrawal'} — {tx.provider || tx.channel}</div>
              <div className="tx-date">{new Date(tx.created_at).toLocaleString()}</div>
              <div className="tx-msg">{tx.transaction_id || tx.account_number}</div>
            </div>
            <div className="tx-amount">
              <div className={`tx-amount-value ${tab === 'deposits' ? 'tx-amount-positive' : 'tx-amount-negative'}`}>
                {tab === 'deposits' ? '+' : '-'}ETB {tx.amount?.toFixed(2)}
              </div>
              <span className={`status-badge status-${tx.status}`}>{tx.status}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ===================== PROFILE PAGE =====================
function ProfilePage({ user, onLogout }) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [telebirr, setTelebirr] = useState(user.telebirr_account || '');
  const [bankName, setBankName] = useState(user.bank_name || '');
  const [bankAccount, setBankAccount] = useState(user.bank_account || '');
  const [saving, setSaving] = useState(false);
  const { toasts, success, error } = useToast();

  const handleSaveAccounts = async () => {
    setSaving(true);
    try {
      await api.updatePaymentAccounts({ telebirr_account: telebirr, bank_name: bankName, bank_account: bankAccount });
      success('Payment accounts updated!');
      setShowAccountForm(false);
    } catch (err) {
      error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <ToastContainer toasts={toasts} />
      <div className="profile-hero fade-in">
        <div className="profile-avatar">{user.phone?.charAt(0) || 'U'}</div>
        <div>
          <div className="profile-name">{user.phone}</div>
          <div className="profile-phone">Invite Code: {user.invite_code}</div>
          <div className={`profile-role ${user.role === 'admin' ? '' : ''}`}>
            {user.role === 'admin' ? '🛡️ Admin' : '👤 Member'}
          </div>
        </div>
      </div>

      <div className="info-box" style={{ marginBottom: 16 }}>
        <div className="info-box-row">
          <span className="info-label">Balance</span>
          <span className="info-value" style={{ color: 'var(--primary)', fontWeight: 800 }}>ETB {(user.balance || 0).toFixed(2)}</span>
        </div>
        <div className="info-box-row">
          <span className="info-label">Status</span>
          <span className="info-value">{user.has_deposited ? '✅ Active' : '⚠️ No Deposit Yet'}</span>
        </div>
      </div>

      <div className="menu-list">
        <button id="profile-payment-acc-btn" className="menu-item" onClick={() => setShowAccountForm(!showAccountForm)}>
          <div className="menu-item-icon">🏦</div>
          <span className="menu-item-text">Payment Accounts</span>
          <span className="menu-item-arrow">{showAccountForm ? '▲' : '▼'}</span>
        </button>

        {showAccountForm && (
          <div className="info-box fade-in" style={{ margin: '-4px 0 4px', borderRadius: '0 0 12px 12px', borderTop: 'none' }}>
            <div className="form-group">
              <label>Telebirr Phone</label>
              <input className="form-input" type="text" placeholder="e.g. 0938236272" value={telebirr} onChange={e => setTelebirr(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Bank Name</label>
              <input className="form-input" type="text" placeholder="e.g. CBE, Awash" value={bankName} onChange={e => setBankName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Bank Account Number</label>
              <input className="form-input" type="text" placeholder="Account number" value={bankAccount} onChange={e => setBankAccount(e.target.value)} />
            </div>
            <button id="save-accounts-btn" className="btn btn-primary" onClick={handleSaveAccounts} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save'}
            </button>
          </div>
        )}

        <a href="https://t.me/HalalSupport" target="_blank" rel="noreferrer" className="menu-item">
          <div className="menu-item-icon">💬</div>
          <span className="menu-item-text">Customer Service</span>
          <span className="menu-item-arrow">→</span>
        </a>

        <button className="menu-item" onClick={() => {}}>
          <div className="menu-item-icon">📜</div>
          <span className="menu-item-text">Terms & Conditions</span>
          <span className="menu-item-arrow">→</span>
        </button>

        <button className="menu-item" onClick={() => {}}>
          <div className="menu-item-icon">🔒</div>
          <span className="menu-item-text">Privacy Policy</span>
          <span className="menu-item-arrow">→</span>
        </button>

        <button id="logout-btn" className="menu-item logout-btn" onClick={onLogout}>
          <div className="menu-item-icon">🚪</div>
          <span className="menu-item-text">Logout</span>
          <span className="menu-item-arrow">→</span>
        </button>
      </div>
    </div>
  );
}

// ===================== ADMIN DASHBOARD =====================
function AdminDashboard({ onBack }) {
  const [overview, setOverview] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('deposits');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [adjustId, setAdjustId] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const { toasts, success, error } = useToast();

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.adminOverview(),
      api.adminGetDeposits(),
      api.adminGetWithdrawals(),
      api.adminGetUsers()
    ]).then(([ov, deps, wds, us]) => {
      setOverview(ov);
      setDeposits(deps);
      setWithdrawals(wds);
      setUsers(us);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDepositAction = async (id, action) => {
    setActionLoading(`dep-${id}-${action}`);
    try {
      const result = await api.adminDepositAction(id, action);
      success(result.message);
      loadAll();
    } catch (err) {
      error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdrawAction = async (id, action) => {
    setActionLoading(`wd-${id}-${action}`);
    try {
      const result = await api.adminWithdrawalAction(id, action);
      success(result.message);
      loadAll();
    } catch (err) {
      error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjust = async (userId) => {
    const amt = parseFloat(adjustAmount);
    if (!amt) { error('Enter valid amount'); return; }
    try {
      await api.adminAdjustBalance(userId, amt);
      success(`Balance adjusted by ETB ${amt}`);
      setAdjustId(null);
      setAdjustAmount('');
      loadAll();
    } catch (err) {
      error(err.message);
    }
  };

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} />
      <div className="admin-header">
        <h2 className="admin-title">🛡️ Admin Dashboard</h2>
        <button id="admin-back-btn" className="btn btn-outline btn-sm" onClick={onBack}>← Back</button>
      </div>

      {overview && (
        <div className="admin-stats">
          <div className="admin-stat">
            <div className="admin-stat-label">Total Users</div>
            <div className="admin-stat-value">{overview.totalUsers}</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Pending Deposits</div>
            <div className="admin-stat-value" style={{ color: overview.pendingDeposits > 0 ? 'var(--warning)' : 'white' }}>
              {overview.pendingDeposits}
            </div>
            <div className="admin-stat-sub">requires action</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Pending Withdrawals</div>
            <div className="admin-stat-value" style={{ color: overview.pendingWithdrawals > 0 ? 'var(--warning)' : 'white' }}>
              {overview.pendingWithdrawals}
            </div>
            <div className="admin-stat-sub">requires action</div>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-label">Total Deposited</div>
            <div className="admin-stat-value" style={{ color: 'var(--primary)', fontSize: 15 }}>
              ETB {(overview.totalDeposits || 0).toFixed(0)}
            </div>
          </div>
        </div>
      )}

      <div className="admin-tab-bar">
        <button id="admin-tab-deposits" className={`admin-tab ${tab === 'deposits' ? 'active' : ''}`} onClick={() => setTab('deposits')}>
          💰 Deposits {overview?.pendingDeposits > 0 && `(${overview.pendingDeposits})`}
        </button>
        <button id="admin-tab-withdrawals" className={`admin-tab ${tab === 'withdrawals' ? 'active' : ''}`} onClick={() => setTab('withdrawals')}>
          💸 Withdrawals {overview?.pendingWithdrawals > 0 && `(${overview.pendingWithdrawals})`}
        </button>
        <button id="admin-tab-users" className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          👥 Users
        </button>
      </div>

      {loading && <div className="empty-state"><div className="loading-spinner" style={{ margin: '0 auto' }} /></div>}

      {!loading && tab === 'deposits' && (
        <div className="admin-table-card">
          {!deposits.length && <div className="empty-state"><h3>No deposits</h3></div>}
          {deposits.map(dep => (
            <div key={dep.id} className="admin-table-row">
              <div className="admin-row-top">
                <div>
                  <div className="admin-row-phone">📱 {dep.user_phone}</div>
                  <div className="admin-row-meta">{new Date(dep.created_at).toLocaleString()} • {dep.provider}</div>
                  <div className="admin-row-meta" style={{ marginTop: 4, maxWidth: 280, wordBreak: 'break-all', color: 'var(--text)', fontSize: 12 }}>
                    {dep.raw_message?.substring(0, 120)}{dep.raw_message?.length > 120 ? '...' : ''}
                  </div>
                </div>
                <div>
                  <div className="admin-row-amount">ETB {dep.amount?.toFixed(2)}</div>
                  <span className={`status-badge status-${dep.status}`}>{dep.status}</span>
                </div>
              </div>
              {dep.status === 'pending' && (
                <div className="admin-row-actions" style={{ marginTop: 10 }}>
                  <button
                    id={`approve-deposit-${dep.id}`}
                    className="btn-approve"
                    disabled={actionLoading === `dep-${dep.id}-approve`}
                    onClick={() => handleDepositAction(dep.id, 'approve')}
                  >
                    {actionLoading === `dep-${dep.id}-approve` ? '...' : '✅ Approve (+100 bonus 1st time)'}
                  </button>
                  <button
                    id={`reject-deposit-${dep.id}`}
                    className="btn-reject"
                    disabled={actionLoading === `dep-${dep.id}-reject`}
                    onClick={() => handleDepositAction(dep.id, 'reject')}
                  >
                    {actionLoading === `dep-${dep.id}-reject` ? '...' : '❌ Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'withdrawals' && (
        <div className="admin-table-card">
          {!withdrawals.length && <div className="empty-state"><h3>No withdrawals</h3></div>}
          {withdrawals.map(wd => (
            <div key={wd.id} className="admin-table-row">
              <div className="admin-row-top">
                <div>
                  <div className="admin-row-phone">📱 {wd.user_phone}</div>
                  <div className="admin-row-meta">{new Date(wd.created_at).toLocaleString()} • {wd.channel}</div>
                  <div className="admin-row-meta">To: {wd.account_number} {wd.account_name ? `(${wd.account_name})` : ''}</div>
                </div>
                <div>
                  <div className="admin-row-amount">ETB {wd.amount?.toFixed(2)}</div>
                  <span className={`status-badge status-${wd.status}`}>{wd.status}</span>
                </div>
              </div>
              {wd.status === 'pending' && (
                <div className="admin-row-actions" style={{ marginTop: 10 }}>
                  <button
                    id={`approve-wd-${wd.id}`}
                    className="btn-approve"
                    disabled={actionLoading === `wd-${wd.id}-approve`}
                    onClick={() => handleWithdrawAction(wd.id, 'approve')}
                  >
                    {actionLoading === `wd-${wd.id}-approve` ? '...' : '✅ Mark Paid'}
                  </button>
                  <button
                    id={`reject-wd-${wd.id}`}
                    className="btn-reject"
                    disabled={actionLoading === `wd-${wd.id}-reject`}
                    onClick={() => handleWithdrawAction(wd.id, 'reject')}
                  >
                    {actionLoading === `wd-${wd.id}-reject` ? '...' : '↩️ Refund'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'users' && (
        <div className="admin-table-card">
          {!users.length && <div className="empty-state"><h3>No users</h3></div>}
          {users.map(u => (
            <div key={u.id} className="admin-table-row">
              <div className="admin-row-top">
                <div>
                  <div className="admin-row-phone">
                    {u.role === 'admin' ? '🛡️' : '👤'} {u.phone}
                  </div>
                  <div className="admin-row-meta">
                    Joined: {new Date(u.created_at).toLocaleDateString()} • Code: {u.invite_code}
                  </div>
                  <div className="admin-row-meta" style={{ color: u.has_deposited ? 'var(--primary)' : 'var(--warning)' }}>
                    {u.has_deposited ? '✅ Active' : '⚠️ No deposit'}
                  </div>
                </div>
                <div>
                  <div className="admin-row-amount">ETB {(u.balance || 0).toFixed(2)}</div>
                  <span className={`status-badge ${u.role === 'admin' ? 'status-active' : 'status-completed'}`}>{u.role}</span>
                </div>
              </div>
              {adjustId === u.id ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, padding: '7px 12px', fontSize: 13 }}
                    type="number"
                    placeholder="e.g. +500 or -200"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                  />
                  <button className="btn-approve" onClick={() => handleAdjust(u.id)}>Apply</button>
                  <button className="btn-reject" onClick={() => { setAdjustId(null); setAdjustAmount(''); }}>Cancel</button>
                </div>
              ) : (
                <div className="admin-row-actions" style={{ marginTop: 8 }}>
                  <button
                    id={`adjust-balance-${u.id}`}
                    className="btn-approve"
                    onClick={() => { setAdjustId(u.id); setAdjustAmount(''); }}
                  >
                    💰 Adjust Balance
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== MAIN APP =====================
function BottomNav({ active, onChange, isAdmin }) {
  const items = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'products', label: 'My Plans', icon: '📦' },
    { id: 'team', label: 'Team', icon: '👥' },
    { id: 'history', label: 'History', icon: '📋' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button
          key={item.id}
          id={`nav-${item.id}`}
          className={`nav-item ${active === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon" style={{ fontSize: 22 }}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('home');
  const [showAdmin, setShowAdmin] = useState(false);

  // Try to restore session
  useEffect(() => {
    const token = localStorage.getItem('halal_token');
    if (token) {
      api.getProfile().then(profile => {
        setUser(profile);
      }).catch(() => {
        localStorage.removeItem('halal_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('halal_token');
    setUser(null);
    setPage('home');
    setShowAdmin(false);
  };

  const refreshUser = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch {}
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading Halal Platform...</span>
      </div>
    );
  }

  if (!user) return <AuthPage onLogin={handleLogin} />;

  // Admin shortcut from Profile page
  if (showAdmin && user.role === 'admin') {
    return (
      <div className="app-container">
        <AdminDashboard onBack={() => setShowAdmin(false)} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">☪️</div>
          <h2>HALAL</h2>
        </div>
        <div className="header-right">
          <div className="balance-pill">ETB {(user.balance || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
          {user.role === 'admin' && (
            <button id="admin-panel-btn" className="btn btn-outline btn-sm" onClick={() => setShowAdmin(true)} style={{ padding: '5px 12px', fontSize: 12 }}>
              🛡️ Admin
            </button>
          )}
        </div>
      </header>

      <MarqueeBanner />

      {page === 'home' && <HomePage user={user} onRefreshUser={refreshUser} />}
      {page === 'products' && <MyProductsPage onRefreshUser={refreshUser} />}
      {page === 'team' && <TeamPage />}
      {page === 'history' && <HistoryPage />}
      {page === 'profile' && (
        <ProfilePage
          user={user}
          onLogout={handleLogout}
        />
      )}

      <BottomNav active={page} onChange={setPage} isAdmin={user.role === 'admin'} />
    </div>
  );
}
