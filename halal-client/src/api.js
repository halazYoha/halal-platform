// src/api.js - API utility for Halal Platform
const BASE_URL = import.meta.env.VITE_API_URL || '';

function getToken() {
  return localStorage.getItem('halal_token');
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

export const api = {
  // Auth
  login: (phone, password) => request('POST', '/api/auth/login', { phone, password }),
  register: (phone, password, referralCode) => request('POST', '/api/auth/register', { phone, password, referralCode }),
  getProfile: () => request('GET', '/api/user/profile'),
  updatePaymentAccounts: (data) => request('POST', '/api/user/payment-accounts', data),

  // Products
  getProducts: () => request('GET', '/api/products'),
  buyProduct: (productId) => request('POST', '/api/products/buy', { productId }),
  getMyProducts: () => request('GET', '/api/orders/my-products'),
  claimIncome: () => request('POST', '/api/orders/claim-income'),

  // Deposits
  getReceiverInfo: () => request('GET', '/api/deposits/receiver-info'),
  submitDeposit: (data) => request('POST', '/api/deposits/submit', data),
  parsePreview: (rawSms) => request('POST', '/api/deposits/parse-preview', { rawSms }),
  getDepositRecords: () => request('GET', '/api/deposits/records'),

  // Withdrawals
  submitWithdrawal: (data) => request('POST', '/api/withdrawals/submit', data),
  getWithdrawalRecords: () => request('GET', '/api/withdrawals/records'),

  // Team
  getTeamStats: () => request('GET', '/api/team/stats'),

  // Admin
  adminOverview: () => request('GET', '/api/admin/overview'),
  adminGetDeposits: () => request('GET', '/api/admin/deposits'),
  adminDepositAction: (id, action, notes) => request('POST', `/api/admin/deposits/${id}/action`, { action, notes }),
  adminGetWithdrawals: () => request('GET', '/api/admin/withdrawals'),
  adminWithdrawalAction: (id, action, admin_tx_id) => request('POST', `/api/admin/withdrawals/${id}/action`, { action, admin_tx_id }),
  adminGetUsers: () => request('GET', '/api/admin/users'),
  adminAdjustBalance: (id, deltaAmount) => request('POST', `/api/admin/users/${id}/adjust-balance`, { deltaAmount }),
  adminSetRole: (id, role) => request('POST', `/api/admin/users/${id}/set-role`, { role }),
};
