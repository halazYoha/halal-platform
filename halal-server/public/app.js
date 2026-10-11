// app.js - Full Interactive Frontend for Halal Platform
let state = {
  currentTab: 'product',
  user: null,
  token: localStorage.getItem('halal_token') || null,
  products: [],
  myOrders: [],
  myStats: { deviceCount: 0, totalIncome: 0 },
  teamStats: null,
  receiverInfo: null,
  depositChannel: 'TELEBIRR',
  selectedDepositAmount: 1500,
  parsedSmsResult: null,
  currentBanner: 0,
  showAuthModal: false,
  authMode: 'login' // 'login' or 'register'
};

// API Helper
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  try {
    const res = await fetch(`/api${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server request failed');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.className = `fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-2xl transition-all duration-300 opacity-100 max-w-xs text-center ${
    type === 'error' ? 'bg-red-600 text-white' : type === 'success' ? 'bg-[#00C853] text-black' : 'bg-gray-800 text-white'
  }`;
  setTimeout(() => {
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg text-xs font-medium shadow-xl transition-all duration-300 opacity-0 pointer-events-none max-w-xs text-center';
  }, 3500);
}

// Authentication Check
async function checkAuth() {
  if (state.token) {
    try {
      state.user = await api('/user/profile');
    } catch {
      state.token = null;
      localStorage.removeItem('halal_token');
      state.user = null;
    }
  }
}

// Tab Switching
function switchTab(tab) {
  state.currentTab = tab;
  ['product', 'my-product', 'my-team', 'mine'].forEach(t => {
    const el = document.getElementById(`nav-${t}`);
    if (el) {
      if (t === tab) {
        el.className = 'flex flex-col items-center flex-1 py-1 text-[#00C853] transition-colors';
      } else {
        el.className = 'flex flex-col items-center flex-1 py-1 text-gray-400 hover:text-gray-200 transition-colors';
      }
    }
  });
  render();
}

// Initialize
async function init() {
  await checkAuth();
  state.products = await api('/products').catch(() => []);
  state.receiverInfo = await api('/deposits/receiver-info').catch(() => null);
  render();
}

// ==========================================
// RENDERERS
// ==========================================

function render() {
  const container = document.getElementById('main-view');
  if (state.currentTab === 'product') {
    container.innerHTML = renderProductTab();
  } else if (state.currentTab === 'my-product') {
    renderMyProductTab(container);
  } else if (state.currentTab === 'my-team') {
    renderMyTeamTab(container);
  } else if (state.currentTab === 'mine') {
    container.innerHTML = renderMineTab();
  } else if (state.currentTab === 'payment') {
    container.innerHTML = renderPaymentPage();
  } else if (state.currentTab === 'withdrawal') {
    container.innerHTML = renderWithdrawalPage();
  } else if (state.currentTab === 'records') {
    renderRecordsPage(container);
  }
  lucide.createIcons();
}

// 1. PRODUCT TAB (Exact UI match to Screenshot 1)
function renderProductTab() {
  return `
    <div class="p-3 space-y-3">
      <!-- HALAL BRAND HEADER -->
      <div class="flex items-center justify-between py-1">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00C853] to-emerald-400 flex items-center justify-center shadow-lg shadow-[#00C853]/20">
            <span class="text-black font-extrabold text-lg">H</span>
          </div>
          <span class="text-xl font-black tracking-wider text-white">HALAL</span>
        </div>
        <div class="flex items-center space-x-2">
          ${state.user ? `
            <span class="text-xs bg-emerald-950/80 border border-emerald-500/30 text-[#00C853] px-2.5 py-1 rounded-full font-semibold">ETB ${state.user.balance?.toLocaleString() || '0'}</span>
          ` : `
            <button onclick="openAuthModal('login')" class="text-xs bg-[#00C853] hover:bg-[#009624] text-black font-extrabold px-3 py-1 rounded-full shadow transition">
              Login / Sign Up
            </button>
          `}
        </div>
      </div>

      <!-- DYNAMIC COMPANY WORK SHOWCASE BANNERS -->
      <div class="relative w-full h-48 rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-950/90 via-[#161a24] to-black border border-emerald-500/20 shadow-xl flex items-center p-4">
        ${getBannerContent(state.currentBanner)}
        <!-- Carousel Dots Indicator -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 z-20">
          <button onclick="setBannerIndex(0)" class="w-2 h-2 rounded-full transition-all ${state.currentBanner === 0 ? 'bg-[#00C853] w-5' : 'bg-gray-600'}"></button>
          <button onclick="setBannerIndex(1)" class="w-2 h-2 rounded-full transition-all ${state.currentBanner === 1 ? 'bg-[#00C853] w-5' : 'bg-gray-600'}"></button>
          <button onclick="setBannerIndex(2)" class="w-2 h-2 rounded-full transition-all ${state.currentBanner === 2 ? 'bg-[#00C853] w-5' : 'bg-gray-600'}"></button>
        </div>
      </div>

      <!-- HOT RECHARGE MARQUEE (Matches screenshot) -->
      <div class="bg-[#191b22] border border-[#2a2d39] rounded-xl px-3 py-2 flex items-center space-x-2 overflow-hidden shadow-inner">
        <span class="text-[#00C853] font-bold text-xs uppercase shrink-0">Hot</span>
        <div class="overflow-hidden flex-1 relative whitespace-nowrap">
          <div class="animate-marquee text-xs text-gray-300">
            Recharge ETB 1,500 • ******8445 Recharge ETB 50,000 • ******2910 Recharge ETB 800 • ******9382 Rent VIP2 • ******1029 Withdraw ETB 3,500
          </div>
        </div>
        <i data-lucide="bell" class="w-4 h-4 text-[#00C853] shrink-0"></i>
      </div>

      <!-- 3 TOP QUICK ACTIONS (Matches screenshot 1) -->
      <div class="grid grid-cols-3 gap-2.5">
        <button onclick="goToPayment()" class="bg-[#1a1c24] hover:bg-[#222530] border border-[#2b2e3b] p-3 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow-md">
          <div class="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1.5">
            <i data-lucide="dollar-sign" class="w-5 h-5 text-[#00C853]"></i>
          </div>
          <span class="text-xs font-semibold text-gray-200">Payment</span>
        </button>

        <button onclick="goToWithdrawal()" class="bg-[#1a1c24] hover:bg-[#222530] border border-[#2b2e3b] p-3 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow-md">
          <div class="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center mb-1.5">
            <i data-lucide="coins" class="w-5 h-5 text-yellow-400"></i>
          </div>
          <span class="text-xs font-semibold text-gray-200">Withdrawal</span>
        </button>

        <button onclick="showCustomerService()" class="bg-[#1a1c24] hover:bg-[#222530] border border-[#2b2e3b] p-3 rounded-xl flex flex-col items-center justify-center transition active:scale-95 shadow-md">
          <div class="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center mb-1.5">
            <i data-lucide="file-text" class="w-5 h-5 text-emerald-400"></i>
          </div>
          <span class="text-xs font-semibold text-gray-200">Customer service</span>
        </button>
      </div>

      <!-- VIP EQUIPMENT PRODUCT GRID (Matches screenshot 1) -->
      <div class="grid grid-cols-2 gap-3 pt-1">
        ${state.products.map(p => `
          <div class="bg-[#171920] border border-[#262936] rounded-2xl p-3 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div class="text-center pb-2">
              <span class="text-sm font-bold text-gray-100 tracking-wide">${p.name}</span>
            </div>

            <!-- Device Image Box -->
            <div class="w-full h-32 bg-[#101217] rounded-xl flex items-center justify-center p-2 mb-3 border border-[#222531]">
              <img src="${p.image}" alt="${p.name}" class="h-28 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300">
            </div>

            <!-- Spec list -->
            <div class="space-y-1 text-[11px] text-gray-400 mb-3 leading-snug">
              <div class="flex justify-between">
                <span>Daily income:</span>
                <span class="font-bold text-gray-200">ETB ${p.daily_income.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span>Total income:</span>
                <span class="font-bold text-gray-200">ETB ${p.total_income.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span>Validity period:</span>
                <span class="font-bold text-gray-200">${p.validity_days} days</span>
              </div>
            </div>

            <!-- Price & Buy button -->
            <div class="space-y-2 mt-auto">
              <div class="text-base font-extrabold text-white text-center">
                ETB ${p.price.toLocaleString()}
              </div>
              <button onclick="confirmBuyProduct(${p.id}, '${p.name}', ${p.price})" class="w-full py-2 bg-[#00C853] hover:bg-[#009624] text-black font-extrabold text-xs rounded-xl transition shadow-md shadow-[#00C853]/20 active:scale-95">
                Buy
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 2. MY PRODUCT TAB (Exact UI match to Screenshot 4)
async function renderMyProductTab(container) {
  container.innerHTML = `
    <div class="p-4 flex items-center justify-center min-h-[50vh]">
      <div class="animate-spin w-8 h-8 border-4 border-[#00C853] border-t-transparent rounded-full"></div>
    </div>
  `;
  try {
    const res = await api('/orders/my-products');
    state.myOrders = res.orders;
    state.myStats = { deviceCount: res.deviceCount, totalIncome: res.totalIncome };

    container.innerHTML = `
      <div class="p-3 space-y-4">
        <!-- TOP SHOWCASE BANNER -->
        <div class="w-full h-44 rounded-2xl overflow-hidden bg-gradient-to-b from-[#252835] to-[#161821] border border-[#313647] p-4 flex flex-col justify-end relative shadow-xl">
          <img src="https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=60" class="absolute inset-0 w-full h-full object-cover opacity-35" alt="Hardware fleet">
          <div class="absolute inset-0 bg-gradient-to-t from-[#14161f] via-transparent to-transparent"></div>
          
          <div class="relative z-10 grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-gray-400 font-medium">My device</div>
              <div class="text-2xl font-black text-white">${state.myStats.deviceCount}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 font-medium">My income</div>
              <div class="text-2xl font-black text-[#00C853]">ETB ${state.myStats.totalIncome.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <!-- CLAIM DAILY REWARD ACTION -->
        ${state.myOrders.length > 0 ? `
          <button onclick="claimIncome()" class="w-full py-3 bg-gradient-to-r from-[#00C853] to-emerald-400 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-[#00C853]/25 flex items-center justify-center space-x-2 active:scale-95 transition">
            <i data-lucide="zap" class="w-4 h-4"></i>
            <span>Collect Today's Halal Income</span>
          </button>
        ` : ''}

        <!-- LEASED DEVICES LIST -->
        <div class="space-y-3">
          <h3 class="text-xs uppercase font-bold tracking-wider text-gray-400">Active Machinery</h3>
          ${state.myOrders.length === 0 ? `
            <div class="bg-[#171920] border border-[#252835] rounded-2xl p-8 text-center space-y-3">
              <i data-lucide="box" class="w-12 h-12 text-gray-600 mx-auto"></i>
              <div class="text-sm font-semibold text-gray-300">No active equipment leased yet</div>
              <button onclick="switchTab('product')" class="px-5 py-2 bg-[#00C853] text-black text-xs font-bold rounded-xl shadow">Explore Equipment</button>
            </div>
          ` : state.myOrders.map(order => `
            <div class="bg-[#171920] border border-[#272b38] rounded-2xl p-3 flex space-x-3 shadow-md">
              <div class="w-24 h-24 bg-[#101217] rounded-xl flex items-center justify-center p-1.5 border border-[#222531] shrink-0">
                <img src="${order.image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'}" class="h-20 object-contain">
              </div>

              <div class="flex-1 flex flex-col justify-between py-0.5">
                <div class="flex justify-between items-start">
                  <h4 class="text-sm font-bold text-white">${order.product_name}</h4>
                  <span class="text-[10px] bg-emerald-500/10 text-[#00C853] px-2 py-0.5 rounded font-bold uppercase tracking-wider">RUNNING</span>
                </div>

                <div class="space-y-0.5 text-[11px] text-gray-400">
                  <div class="flex justify-between">
                    <span>Daily income:</span>
                    <span class="font-bold text-white">ETB ${order.daily_income.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Total earned:</span>
                    <span class="font-bold text-[#00C853]">ETB ${order.total_earned.toLocaleString()}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Validity period:</span>
                    <span class="font-bold text-white">${order.validity_days} days</span>
                  </div>
                </div>

                <div class="text-[10px] text-gray-500 pt-1">
                  Started: ${new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-red-400 text-sm">${err.message}</div>`;
  }
}

// 3. MY TEAM TAB (Exact UI match to Screenshot 3)
async function renderMyTeamTab(container) {
  container.innerHTML = `
    <div class="p-4 flex items-center justify-center min-h-[50vh]">
      <div class="animate-spin w-8 h-8 border-4 border-[#00C853] border-t-transparent rounded-full"></div>
    </div>
  `;
  try {
    const stats = await api('/team/stats');
    state.teamStats = stats;

    container.innerHTML = `
      <div class="p-3 space-y-3.5">
        <!-- INVITATION CODE & LINK (Matches screenshot 3) -->
        <div class="bg-[#171922] border border-[#272b38] rounded-2xl p-4 space-y-3 shadow-lg">
          <!-- Invite Code -->
          <div class="flex items-center justify-between">
            <div>
              <div class="text-[#00C853] font-black text-lg tracking-wider">${stats.inviteCode}</div>
              <div class="text-xs text-gray-400">Invitation code</div>
            </div>
            <button onclick="copyText('${stats.inviteCode}', 'Invitation code copied!')" class="px-5 py-2 bg-[#00C853] hover:bg-[#009624] text-black font-extrabold text-xs rounded-full shadow-md active:scale-95 transition">
              Copy
            </button>
          </div>

          <div class="h-px bg-[#262936]"></div>

          <!-- Invite Link -->
          <div class="flex items-center justify-between">
            <div class="max-w-[70%]">
              <div class="text-xs text-emerald-400 truncate font-mono">${stats.inviteLink}</div>
              <div class="text-xs text-gray-400">Invitation link</div>
            </div>
            <button onclick="copyText('${stats.inviteLink}', 'Invitation link copied!')" class="px-5 py-2 bg-[#00C853] hover:bg-[#009624] text-black font-extrabold text-xs rounded-full shadow-md active:scale-95 transition">
              Copy
            </button>
          </div>
        </div>

        <!-- MY TEAM SECTION HEADER -->
        <div class="bg-[#1c1e29] border border-[#2c303f] rounded-xl py-3 px-4 flex items-center justify-between cursor-pointer">
          <span class="text-sm font-bold text-gray-200">My team &gt;</span>
        </div>

        <!-- COMMISSION BREAKDOWN TABLE (Matches screenshot 3) -->
        <div class="bg-[#171922] border border-[#272b38] rounded-2xl overflow-hidden shadow-lg">
          <div class="grid grid-cols-3 bg-[#111318] py-2.5 px-3 border-b border-[#252835] text-[11px] font-bold text-gray-400">
            <div>Commission rate</div>
            <div class="text-center">Valid users</div>
            <div class="text-right">Income</div>
          </div>

          <div class="divide-y divide-[#232634] text-xs">
            ${stats.levels.map(l => `
              <div class="grid grid-cols-3 py-3 px-3 items-center">
                <div class="font-bold text-gray-200">Level ${l.level} Team ${l.rate}</div>
                <div class="text-center font-semibold text-gray-300">${l.validUsers}</div>
                <div class="text-right font-extrabold text-[#00C853]">ETB ${l.income.toLocaleString()}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SUMMARY STATS -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-[#171922] border border-[#272b38] rounded-xl p-3.5 text-center">
            <div class="text-lg font-black text-white">${stats.totalValidUsers}</div>
            <div class="text-[11px] text-gray-400">Valid users</div>
          </div>
          <div class="bg-[#171922] border border-[#272b38] rounded-xl p-3.5 text-center">
            <div class="text-lg font-black text-[#00C853]">ETB ${stats.totalInvitedIncome.toLocaleString()}</div>
            <div class="text-[11px] text-gray-400">Invited income</div>
          </div>
        </div>

        <!-- REWARD RULES EXPLANATION (Matches screenshot 3 text) -->
        <div class="bg-[#161820] border border-[#252836] rounded-2xl p-4 text-[11px] text-gray-400 space-y-2 leading-relaxed">
          <p>When a friend you invite signs up and leases equipment, you immediately receive a cash reward of 35% of their leased amount.</p>
          <p>When members of your Level 2 team invest, you receive a 3% cash bonus.</p>
          <p>When members of your Level 3 team invest, you receive a 2% cash bonus.</p>
          <p class="text-gray-300">Once a team member invests, the cash bonus is instantly credited to your Halal wallet and you can withdraw it immediately.</p>
        </div>
      </div>
    `;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="p-6 text-center text-red-400 text-sm">${err.message}</div>`;
  }
}

// 4. MINE TAB (Exact UI match to Screenshot 2)
function renderMineTab() {
  return `
    <div class="space-y-3 pb-4">
      <!-- HEADER WALLET HERO -->
      <div class="relative w-full h-44 bg-gradient-to-b from-[#242738] to-[#151720] border-b border-[#292d3c] p-4 flex flex-col justify-between overflow-hidden shadow-xl">
        <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600" class="absolute right-0 top-0 h-full w-48 object-cover opacity-30" alt="Tech">
        
        <div class="relative z-10">
          <div class="text-xs text-gray-400 font-medium">Account balance</div>
          <div class="text-3xl font-black text-[#00C853]">ETB ${state.user?.balance?.toLocaleString() || '0'}</div>
        </div>

        <div class="relative z-10 flex items-center justify-between">
          <div>
            <div class="text-base font-bold text-white tracking-wider">${state.user?.phone || 'Guest User'}</div>
            <div class="text-xs text-gray-400">Phone number</div>
          </div>
          ${!state.user ? `
            <button onclick="openAuthModal('login')" class="px-4 py-1.5 bg-[#00C853] text-black font-extrabold text-xs rounded-xl shadow active:scale-95">
              Sign In
            </button>
          ` : ''}
        </div>
      </div>

      <div class="p-3 space-y-3">
        <!-- 2 TOP QUICK BUTTONS -->
        <div class="grid grid-cols-2 gap-3">
          <button onclick="goToPayment()" class="py-3 bg-[#191b24] hover:bg-[#222532] border border-[#2b2e3e] text-white font-bold text-sm rounded-xl transition shadow active:scale-95">
            Payment
          </button>
          <button onclick="goToWithdrawal()" class="py-3 bg-[#191b24] hover:bg-[#222532] border border-[#2b2e3e] text-white font-bold text-sm rounded-xl transition shadow active:scale-95">
            Withdrawal
          </button>
        </div>

        <!-- MENU SECTION 1 -->
        <div class="bg-[#171922] border border-[#262936] rounded-2xl overflow-hidden shadow-lg divide-y divide-[#232634]">
          <div onclick="goToRecords('all')" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="bar-chart-2" class="w-5 h-5 text-gray-400"></i>
              <span class="text-xs font-semibold text-gray-200">Account details</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>

          <div onclick="goToRecords('deposit')" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="file-edit" class="w-5 h-5 text-gray-400"></i>
              <span class="text-xs font-semibold text-gray-200">Payment records</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>

          <div onclick="goToRecords('withdrawal')" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="file-text" class="w-5 h-5 text-gray-400"></i>
              <span class="text-xs font-semibold text-gray-200">Withdrawal records</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>

          <div onclick="editWithdrawalAccount()" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="credit-card" class="w-5 h-5 text-gray-400"></i>
              <span class="text-xs font-semibold text-gray-200">Withdrawal Account</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>
        </div>

        <!-- MENU SECTION 2 -->
        <div class="bg-[#171922] border border-[#262936] rounded-2xl overflow-hidden shadow-lg divide-y divide-[#232634]">
          <div onclick="showAboutUs()" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="info" class="w-5 h-5 text-gray-400"></i>
              <span class="text-xs font-semibold text-gray-200">About Us</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>

          <div onclick="showRules()" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="play-circle" class="w-5 h-5 text-gray-400"></i>
              <span class="text-xs font-semibold text-gray-200">Platform rules</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>

          <div onclick="showCustomerService()" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="headphones" class="w-5 h-5 text-gray-400"></i>
              <span class="text-xs font-semibold text-gray-200">Customer service</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>

          <div onclick="logoutUser()" class="flex items-center justify-between p-3.5 hover:bg-[#1e202c] cursor-pointer">
            <div class="flex items-center space-x-3">
              <i data-lucide="power" class="w-5 h-5 text-red-400"></i>
              <span class="text-xs font-semibold text-red-400">Secure exit</span>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-500"></i>
          </div>
        </div>

        <!-- LINK TO ADMIN DASHBOARD FOR DEMO -->
        <div class="pt-2">
          <a href="/admin.html" class="block w-full text-center py-2.5 bg-[#232736] hover:bg-[#2b3042] text-xs font-bold text-[#00C853] rounded-xl border border-emerald-500/20">
            Open Admin Management Desk ➔
          </a>
        </div>
      </div>
    </div>
  `;
}

// 5. PAYMENT / DEPOSIT PAGE WITH SMS VERIFICATION (Matches Screenshot 5 + Custom Parser)
function renderPaymentPage() {
  const amounts = [800, 1500, 3000, 5000, 8000, 13000, 25000, 50000, 100000];
  const receiver = state.receiverInfo || { telebirr: {}, cbe: {} };

  return `
    <div class="p-3 space-y-4 pb-8">
      <!-- TOP NAV -->
      <div class="flex items-center justify-between py-1">
        <button onclick="switchTab('mine')" class="p-1 text-gray-400 hover:text-white">
          <i data-lucide="chevron-left" class="w-6 h-6"></i>
        </button>
        <h2 class="text-sm font-bold text-white">Payment (Recharge)</h2>
        <i data-lucide="info" class="w-5 h-5 text-gray-500"></i>
      </div>

      <!-- AMOUNT SELECTION GRID (Matches screenshot 5) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white">Payment amount</span>
          <span class="text-[11px] text-gray-400">(Minimum ETB 800)</span>
        </div>

        <div class="grid grid-cols-4 gap-2">
          ${amounts.map(amt => `
            <button onclick="setDepositAmount(${amt})" class="py-2.5 rounded-xl text-xs font-bold transition border ${
              state.selectedDepositAmount === amt
                ? 'bg-[#00C853] text-black border-[#00C853] shadow-md shadow-[#00C853]/25'
                : 'bg-[#1b1d26] text-gray-300 border-[#2b2e3e] hover:bg-[#242735]'
            }">
              ${amt}
            </button>
          `).join('')}
        </div>

        <!-- Custom Amount input -->
        <div class="flex items-center bg-[#171922] border border-[#2a2e3e] rounded-xl p-2.5 space-x-2">
          <span class="text-xs font-bold text-gray-400">ETB</span>
          <input type="number" id="custom-amount-input" value="${state.selectedDepositAmount}" oninput="state.selectedDepositAmount = parseFloat(this.value) || 0" placeholder="Please enter the payment amount" class="bg-transparent text-sm font-bold text-white outline-none w-full">
        </div>
      </div>

      <!-- OFFICIAL RECEIVER ACCOUNT INFO -->
      <div class="bg-gradient-to-r from-emerald-950/60 to-[#191c26] border border-emerald-500/30 rounded-2xl p-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold text-[#00C853] uppercase tracking-wider">Official Halal Deposit Account</span>
          <span class="text-[10px] bg-emerald-500/20 text-[#00C853] px-2 py-0.5 rounded font-mono font-bold">${state.depositChannel}</span>
        </div>

        ${state.depositChannel === 'TELEBIRR' ? `
          <div class="bg-[#12141c] p-3 rounded-xl space-y-1.5 border border-[#272b3a]">
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">Telebirr Account:</span>
              <span class="font-bold text-white select-all">0938236272</span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">Account Name:</span>
              <span class="font-bold text-[#00C853]">Yohannes Yesgat</span>
            </div>
            <button onclick="copyText('0938236272', 'Telebirr number copied!')" class="w-full mt-1 py-1.5 bg-[#252a3b] hover:bg-[#2f3549] text-[11px] font-bold text-gray-200 rounded-lg">
              Copy Telebirr Number
            </button>
          </div>
        ` : `
          <div class="bg-[#12141c] p-3 rounded-xl space-y-1.5 border border-[#272b3a]">
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">CBE Account Number:</span>
              <span class="font-bold text-white select-all">1000344285048</span>
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">Account Name:</span>
              <span class="font-bold text-[#00C853]">Hailemariam Yohannes</span>
            </div>
            <button onclick="copyText('1000344285048', 'CBE Account Number copied!')" class="w-full mt-1 py-1.5 bg-[#252a3b] hover:bg-[#2f3549] text-[11px] font-bold text-gray-200 rounded-lg">
              Copy CBE Account
            </button>
          </div>
        `}
      </div>

      <!-- PAYMENT CHANNEL SELECTOR -->
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-white">Payment channels</label>
        <div class="grid grid-cols-2 gap-2">
          <button onclick="setDepositChannel('TELEBIRR')" class="py-2.5 rounded-xl text-xs font-bold border transition ${
            state.depositChannel === 'TELEBIRR'
              ? 'bg-[#1e2333] border-[#00C853] text-[#00C853]'
              : 'bg-[#181a24] border-[#292c3c] text-gray-400'
          }">
            Telebirr Channel
          </button>
          <button onclick="setDepositChannel('CBE')" class="py-2.5 rounded-xl text-xs font-bold border transition ${
            state.depositChannel === 'CBE'
              ? 'bg-[#1e2333] border-[#00C853] text-[#00C853]'
              : 'bg-[#181a24] border-[#292c3c] text-gray-400'
          }">
            CBE Bank Channel
          </button>
        </div>
      </div>

      <!-- COPY/PASTE SMS VERIFICATION ENGINE BOX (KEY FEATURE REQUESTED) -->
      <div class="bg-[#171922] border border-[#282c3c] rounded-2xl p-3.5 space-y-2.5 shadow-lg">
        <div class="flex items-center justify-between">
          <label class="text-xs font-bold text-white flex items-center space-x-1.5">
            <i data-lucide="message-square" class="w-4 h-4 text-[#00C853]"></i>
            <span>Paste Transaction SMS / Message</span>
          </label>
          <button onclick="pasteFromClipboard()" class="text-[11px] text-[#00C853] font-bold hover:underline">
            Paste from Clipboard
          </button>
        </div>

        <textarea id="raw-sms-input" oninput="onSmsInputChange(this.value)" rows="3" placeholder="Paste full Telebirr or CBE confirmation SMS here (e.g. 'You have transferred ETB 1,500.00 to ... Transaction ID: CR9284719283')" class="w-full bg-[#111319] border border-[#252835] rounded-xl p-2.5 text-xs text-gray-200 outline-none focus:border-[#00C853] transition font-mono"></textarea>

        <!-- LIVE PARSER PREVIEW STATUS -->
        <div id="sms-parse-preview" class="hidden bg-[#101218] border border-[#222533] rounded-xl p-2.5 text-[11px] space-y-1"></div>

        <!-- DEMO SAMPLE SMS QUICK-PASTE BUTTON FOR IMMEDIATE USER TESTING -->
        <div class="pt-1 flex space-x-2">
          <button onclick="injectDemoSms('telebirr')" class="flex-1 py-1.5 bg-[#202433] hover:bg-[#282d3f] text-[10px] text-gray-300 rounded-lg border border-[#2b3042]">
            Use Demo Telebirr SMS
          </button>
          <button onclick="injectDemoSms('cbe')" class="flex-1 py-1.5 bg-[#202433] hover:bg-[#282d3f] text-[10px] text-gray-300 rounded-lg border border-[#2b3042]">
            Use Demo CBE SMS
          </button>
        </div>
      </div>

      <!-- SUBMIT BUTTON -->
      <button onclick="submitDepositVerification()" id="btn-pay-now" class="w-full py-3.5 bg-[#00C853] hover:bg-[#009624] text-black font-extrabold text-sm rounded-xl shadow-lg shadow-[#00C853]/25 active:scale-95 transition flex items-center justify-center space-x-2">
        <i data-lucide="check-circle" class="w-4 h-4"></i>
        <span>Verify & Pay Now</span>
      </button>

      <!-- RULES LIST (Matches screenshot 5 French / English text) -->
      <div class="bg-[#151720] border border-[#232635] rounded-2xl p-3.5 text-[11px] text-gray-400 space-y-1.5 leading-relaxed">
        <p>1. The minimum deposit is 800 ETB. Deposits below this amount cannot be credited to your account.</p>
        <p>2. Please use the most updated account information when making each deposit.</p>
        <p>3. The deposited amount in your SMS must correspond to the chosen payment value.</p>
        <p>4. If your deposit is not credited automatically within 10 minutes, contact customer service with your Transaction ID.</p>
      </div>
    </div>
  `;
}

// 6. WITHDRAWAL PAGE
function renderWithdrawalPage() {
  return `
    <div class="p-3 space-y-4 pb-8">
      <div class="flex items-center justify-between py-1">
        <button onclick="switchTab('mine')" class="p-1 text-gray-400 hover:text-white">
          <i data-lucide="chevron-left" class="w-6 h-6"></i>
        </button>
        <h2 class="text-sm font-bold text-white">Withdrawal</h2>
        <i data-lucide="info" class="w-5 h-5 text-gray-500"></i>
      </div>

      <!-- Balance Card -->
      <div class="bg-[#171922] border border-[#272b38] rounded-2xl p-4 flex justify-between items-center">
        <div>
          <div class="text-xs text-gray-400">Available to Withdraw</div>
          <div class="text-2xl font-black text-[#00C853]">ETB ${state.user?.balance?.toLocaleString() || '0'}</div>
        </div>
        <button onclick="setWithdrawAll()" class="text-xs font-bold text-gray-300 bg-[#242838] px-3 py-1.5 rounded-lg border border-[#2e3346]">
          All
        </button>
      </div>

      <!-- Amount input -->
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-white">Withdrawal amount</label>
        <div class="flex items-center bg-[#171922] border border-[#2a2e3e] rounded-xl p-2.5 space-x-2">
          <span class="text-xs font-bold text-gray-400">ETB</span>
          <input type="number" id="withdraw-amount-input" placeholder="Enter amount (min ETB 200)" class="bg-transparent text-sm font-bold text-white outline-none w-full">
        </div>
      </div>

      <!-- Channel & Account Info -->
      <div class="space-y-2">
        <label class="text-xs font-bold text-white">Select Payout Method</label>
        <div class="grid grid-cols-2 gap-2">
          <button id="withdraw-btn-telebirr" onclick="setWithdrawChannel('TELEBIRR')" class="py-2.5 rounded-xl text-xs font-bold border bg-[#1e2333] border-[#00C853] text-[#00C853]">
            Telebirr
          </button>
          <button id="withdraw-btn-cbe" onclick="setWithdrawChannel('CBE')" class="py-2.5 rounded-xl text-xs font-bold border bg-[#181a24] border-[#292c3c] text-gray-400">
            CBE Bank
          </button>
        </div>

        <div class="space-y-1.5 pt-1">
          <label class="text-xs font-bold text-white">Account Number / Phone</label>
          <input type="text" id="withdraw-acc-input" value="${state.user?.telebirr_account || state.user?.phone || ''}" placeholder="Enter your Telebirr phone or CBE account" class="w-full bg-[#171922] border border-[#2a2e3e] rounded-xl p-2.5 text-xs text-white outline-none">
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-bold text-white">Account Holder Full Name</label>
          <input type="text" id="withdraw-name-input" placeholder="e.g. Abebe Bikila" class="w-full bg-[#171922] border border-[#2a2e3e] rounded-xl p-2.5 text-xs text-white outline-none">
        </div>
      </div>

      <!-- Submit Withdrawal -->
      <button onclick="submitWithdrawal()" class="w-full py-3.5 bg-[#00C853] hover:bg-[#009624] text-black font-extrabold text-sm rounded-xl shadow-lg shadow-[#00C853]/25 active:scale-95 transition">
        Submit Withdrawal Request
      </button>

      <!-- Terms -->
      <div class="bg-[#151720] border border-[#232635] rounded-2xl p-3.5 text-[11px] text-gray-400 space-y-1">
        <p>• Withdrawals are processed daily between 09:00 - 18:00.</p>
        <p>• Minimum withdrawal is ETB 200.</p>
        <p>• Payout is sent directly to your registered Telebirr or CBE account.</p>
      </div>
    </div>
  `;
}

let currentRecordsFilter = 'all';

function goToRecords(filter = 'all') {
  currentRecordsFilter = filter;
  state.currentTab = 'records';
  render();
}

async function renderRecordsPage(container) {
  container.innerHTML = `
    <div class="p-4 flex items-center justify-center min-h-[50vh]">
      <div class="animate-spin w-8 h-8 border-4 border-[#00C853] border-t-transparent rounded-full"></div>
    </div>
  `;
  try {
    const deposits = await api('/deposits/records');
    const withdrawals = await api('/withdrawals/records');

    container.innerHTML = `
      <div class="p-3 space-y-3 pb-8">
        <div class="flex items-center justify-between py-1">
          <button onclick="switchTab('mine')" class="p-1 text-gray-400 hover:text-white">
            <i data-lucide="chevron-left" class="w-6 h-6"></i>
          </button>
          <h2 class="text-sm font-bold text-white">Financial Details & History</h2>
          <div class="w-6"></div>
        </div>

        <!-- FILTER TABS -->
        <div class="flex bg-[#161822] p-1 rounded-xl border border-[#262a38] text-xs font-bold">
          <button onclick="goToRecords('all')" class="flex-1 py-1.5 rounded-lg transition ${currentRecordsFilter === 'all' ? 'bg-[#00C853] text-black shadow' : 'text-gray-400 hover:text-white'}">
            All Records
          </button>
          <button onclick="goToRecords('deposit')" class="flex-1 py-1.5 rounded-lg transition ${currentRecordsFilter === 'deposit' ? 'bg-[#00C853] text-black shadow' : 'text-gray-400 hover:text-white'}">
            Payments
          </button>
          <button onclick="goToRecords('withdrawal')" class="flex-1 py-1.5 rounded-lg transition ${currentRecordsFilter === 'withdrawal' ? 'bg-[#00C853] text-black shadow' : 'text-gray-400 hover:text-white'}">
            Withdrawals
          </button>
        </div>

        <!-- DEPOSITS -->
        ${(currentRecordsFilter === 'all' || currentRecordsFilter === 'deposit') ? `
          <div class="space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Deposits</h3>
            ${deposits.length === 0 ? `<div class="bg-[#171922] p-4 text-center text-xs text-gray-500 rounded-xl">No deposits yet</div>` : deposits.map(d => `
              <div class="bg-[#171922] border border-[#262a39] p-3 rounded-xl flex justify-between items-center">
                <div>
                  <div class="font-bold text-white text-xs">${d.provider} - Ref: ${d.transaction_id}</div>
                  <div class="text-[10px] text-gray-400">${new Date(d.created_at).toLocaleString()}</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-[#00C853] text-sm">+ETB ${d.amount.toLocaleString()}</div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded ${d.status === 'approved' ? 'bg-emerald-500/10 text-[#00C853]' : 'bg-yellow-500/10 text-yellow-400'}">${d.status.toUpperCase()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- WITHDRAWALS -->
        ${(currentRecordsFilter === 'all' || currentRecordsFilter === 'withdrawal') ? `
          <div class="space-y-2 pt-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-400">Cash Withdrawals</h3>
            ${withdrawals.length === 0 ? `<div class="bg-[#171922] p-4 text-center text-xs text-gray-500 rounded-xl">No withdrawals yet</div>` : withdrawals.map(w => `
              <div class="bg-[#171922] border border-[#262a39] p-3 rounded-xl flex justify-between items-center">
                <div>
                  <div class="font-bold text-white text-xs">${w.channel} to ${w.account_number}</div>
                  <div class="text-[10px] text-gray-400">${new Date(w.created_at).toLocaleString()}</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-red-400 text-sm">-ETB ${w.amount.toLocaleString()}</div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded ${w.status === 'approved' ? 'bg-emerald-500/10 text-[#00C853]' : 'bg-yellow-500/10 text-yellow-400'}">${w.status.toUpperCase()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
    lucide.createIcons();
  } catch (e) {
    container.innerHTML = `<div class="p-6 text-center text-red-400 text-xs">${e.message}</div>`;
  }
}

function setDepositAmount(amt) {
  state.selectedDepositAmount = amt;
  render();
}

function setDepositChannel(ch) {
  state.depositChannel = ch;
  render();
}

let activeWithdrawChannel = 'TELEBIRR';
function setWithdrawChannel(ch) {
  activeWithdrawChannel = ch;
  const tBtn = document.getElementById('withdraw-btn-telebirr');
  const cBtn = document.getElementById('withdraw-btn-cbe');
  if (ch === 'TELEBIRR') {
    tBtn.className = 'py-2.5 rounded-xl text-xs font-bold border bg-[#1e2333] border-[#00C853] text-[#00C853]';
    cBtn.className = 'py-2.5 rounded-xl text-xs font-bold border bg-[#181a24] border-[#292c3c] text-gray-400';
  } else {
    cBtn.className = 'py-2.5 rounded-xl text-xs font-bold border bg-[#1e2333] border-[#00C853] text-[#00C853]';
    tBtn.className = 'py-2.5 rounded-xl text-xs font-bold border bg-[#181a24] border-[#292c3c] text-gray-400';
  }
}

function setWithdrawAll() {
  const el = document.getElementById('withdraw-amount-input');
  if (el && state.user) {
    el.value = state.user.balance;
  }
}

// Live SMS Parser Preview on Typing / Pasting
async function onSmsInputChange(text) {
  const previewEl = document.getElementById('sms-parse-preview');
  if (!text || text.trim().length < 10) {
    previewEl.classList.add('hidden');
    return;
  }

  try {
    const res = await api('/deposits/parse-preview', {
      method: 'POST',
      body: JSON.stringify({ rawSms: text })
    });

    previewEl.classList.remove('hidden');
    if (res.success) {
      state.parsedSmsResult = res;
      previewEl.innerHTML = `
        <div class="text-[#00C853] font-bold flex items-center space-x-1">
          <i data-lucide="check" class="w-3.5 h-3.5"></i>
          <span>Valid ${res.provider} Message Detected</span>
        </div>
        <div class="flex justify-between text-gray-300">
          <span>Detected Amount:</span>
          <span class="font-bold text-white">ETB ${res.amount.toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-gray-300">
          <span>Transaction ID:</span>
          <span class="font-bold text-[#00C853] font-mono">${res.transactionId}</span>
        </div>
      `;
    } else {
      state.parsedSmsResult = null;
      previewEl.innerHTML = `
        <div class="text-yellow-400 font-semibold flex items-center space-x-1">
          <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
          <span>${res.error}</span>
        </div>
      `;
    }
    lucide.createIcons();
  } catch (err) {
    console.error(err);
  }
}

// Quick Sample Inserter for immediate demonstration
function injectDemoSms(type) {
  const txRandom = Math.floor(10000000 + Math.random() * 90000000);
  let text = '';
  if (type === 'telebirr') {
    text = `You have transferred ETB ${state.selectedDepositAmount}.00 to HALAL TECH & FABRICATION (0938236272) on ${new Date().toLocaleDateString()}. Transaction ID: CR${txRandom}.`;
  } else {
    text = `Dear Customer, ETB ${state.selectedDepositAmount}.00 debited from account 1000... to HALAL TECH ETHIOPIA. Txn Ref: FT${txRandom}.`;
  }
  const input = document.getElementById('raw-sms-input');
  if (input) {
    input.value = text;
    onSmsInputChange(text);
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById('raw-sms-input');
    if (input) {
      input.value = text;
      onSmsInputChange(text);
    }
  } catch {
    showToast('Please paste manually using tap and hold', 'info');
  }
}

// Submit Verification & Credit Wallet
async function submitDepositVerification() {
  const input = document.getElementById('raw-sms-input');
  const rawSms = input ? input.value.trim() : '';

  if (!rawSms) {
    showToast('Please paste the confirmation SMS message first', 'error');
    return;
  }

  const btn = document.getElementById('btn-pay-now');
  if (btn) btn.disabled = true;

  try {
    const res = await api('/deposits/verify-and-submit', {
      method: 'POST',
      body: JSON.stringify({
        rawSms,
        selectedAmount: state.selectedDepositAmount
      })
    });

    state.user.balance = res.newBalance;
    showToast(res.message, 'success');
    setTimeout(() => {
      switchTab('product');
    }, 1800);
  } catch (err) {
    // Handled in api()
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Submit Withdrawal
async function submitWithdrawal() {
  const amtInput = document.getElementById('withdraw-amount-input');
  const accInput = document.getElementById('withdraw-acc-input');
  const nameInput = document.getElementById('withdraw-name-input');

  const amount = parseFloat(amtInput?.value);
  const accountNumber = accInput?.value?.trim();
  const accountName = nameInput?.value?.trim();

  if (!amount || amount < 200) {
    showToast('Minimum withdrawal is ETB 200', 'error');
    return;
  }
  if (!accountNumber) {
    showToast('Please enter your account number or phone', 'error');
    return;
  }

  try {
    const res = await api('/withdrawals/submit', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        channel: activeWithdrawChannel,
        accountNumber,
        accountName
      })
    });

    state.user.balance = res.newBalance;
    showToast(res.message, 'success');
    setTimeout(() => {
      goToRecords();
    }, 1500);
  } catch (e) {
    // Handled
  }
}

// Buy Equipment
async function confirmBuyProduct(productId, name, price) {
  if (!state.user || state.user.balance < price) {
    showToast(`Insufficient balance for ${name}. Please recharge first!`, 'error');
    setTimeout(() => goToPayment(), 1200);
    return;
  }

  if (confirm(`Rent ${name} for ETB ${price.toLocaleString()}? Daily returns will start immediately.`)) {
    try {
      const res = await api('/products/buy', {
        method: 'POST',
        body: JSON.stringify({ productId })
      });
      state.user.balance = res.newBalance;
      showToast(res.message, 'success');
      setTimeout(() => switchTab('my-product'), 1200);
    } catch (e) {}
  }
}

// Claim Daily Income
async function claimIncome() {
  try {
    const res = await api('/orders/claim-income', { method: 'POST' });
    state.user.balance = res.newBalance;
    showToast(res.message, 'success');
    render();
  } catch (e) {}
}

// Edit Withdrawal details with sleek modal
function editWithdrawalAccount() {
  showAppModal('Withdrawal Account Settings', `
    <div class="space-y-3">
      <div>
        <label class="text-[11px] font-bold text-gray-400">Telebirr Payout Phone</label>
        <input type="text" id="modal-telebirr-input" value="${state.user?.telebirr_account || state.user?.phone || ''}" placeholder="09XXXXXXXX" class="w-full bg-[#101218] border border-[#252838] rounded-xl px-3 py-2 text-xs text-white outline-none">
      </div>
      <div>
        <label class="text-[11px] font-bold text-gray-400">CBE Bank Account Number</label>
        <input type="text" id="modal-cbe-input" value="${state.user?.bank_account || ''}" placeholder="1000XXXXXXXX" class="w-full bg-[#101218] border border-[#252838] rounded-xl px-3 py-2 text-xs text-white outline-none">
      </div>
      <button onclick="saveWithdrawalAccountDetails()" class="w-full py-2.5 bg-[#00C853] text-black font-extrabold text-xs rounded-xl shadow-md">
        Save Payout Account
      </button>
    </div>
  `);
}

async function saveWithdrawalAccountDetails() {
  const telebirr = document.getElementById('modal-telebirr-input').value.trim();
  const cbe = document.getElementById('modal-cbe-input').value.trim();
  await api('/user/payment-accounts', {
    method: 'POST',
    body: JSON.stringify({ telebirr_account: telebirr, bank_account: cbe })
  });
  if (state.user) {
    state.user.telebirr_account = telebirr;
    state.user.bank_account = cbe;
  }
  closeAppModal();
  showToast('Payout details saved!', 'success');
}

function copyText(str, successMsg = 'Copied to clipboard!') {
  navigator.clipboard.writeText(str).then(() => {
    showToast(successMsg, 'success');
  }).catch(() => {
    prompt('Copy value:', str);
  });
}

function showCustomerService() {
  showAppModal('Halal Customer Support', `
    <div class="space-y-3 text-xs text-gray-300">
      <div class="flex items-center space-x-3 bg-[#111319] p-3 rounded-xl border border-[#232736]">
        <i data-lucide="send" class="w-5 h-5 text-[#00C853]"></i>
        <div>
          <div class="font-bold text-white">Telegram Support</div>
          <div class="text-emerald-400 font-mono">@HalalEthioSupport</div>
        </div>
      </div>
      <div class="flex items-center space-x-3 bg-[#111319] p-3 rounded-xl border border-[#232736]">
        <i data-lucide="phone-call" class="w-5 h-5 text-yellow-400"></i>
        <div>
          <div class="font-bold text-white">Direct Hotline</div>
          <div class="font-mono text-gray-200">+251 938 236 272</div>
        </div>
      </div>
      <div class="text-[11px] text-gray-400 text-center pt-1">
        Official Support Hours: 08:30 - 21:00 (Mon - Sun)
      </div>
    </div>
  `);
}

function showAboutUs() {
  showAppModal('About HALAL Platform', `
    <div class="space-y-3 text-xs text-gray-300 leading-relaxed">
      <p><strong class="text-white">HALAL Ethical Fabrication</strong> operates regional 3D manufacturing hubs in Ethiopia, producing high-demand replacement parts, medical casts, and specialized industrial components.</p>
      <p>Users lease certified digital hardware units and receive daily halal yield generated from real additive manufacturing operations.</p>
      <div class="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-[11px] text-emerald-300">
        ✓ 100% Asset-backed hardware leases.<br>
        ✓ Strictly zero interest (Riba-free) profit model.
      </div>
    </div>
  `);
}

function showRules() {
  showAppModal('Platform Rules & Guidelines', `
    <div class="space-y-2.5 text-xs text-gray-300 leading-relaxed">
      <div class="bg-[#111319] p-2.5 rounded-xl border border-[#232635]">
        <span class="text-[#00C853] font-bold">1. Daily Profit Accrual:</span>
        <p class="text-[11px] text-gray-400">Earnings generate every 24 hours and can be claimed directly from the 'My Product' tab.</p>
      </div>
      <div class="bg-[#111319] p-2.5 rounded-xl border border-[#232635]">
        <span class="text-[#00C853] font-bold">2. Payout Processing:</span>
        <p class="text-[11px] text-gray-400">Withdrawal requests to Telebirr or CBE are reviewed and dispatched within 15–30 minutes.</p>
      </div>
      <div class="bg-[#111319] p-2.5 rounded-xl border border-[#232635]">
        <span class="text-[#00C853] font-bold">3. 3-Tier Referral Commissions:</span>
        <p class="text-[11px] text-gray-400">Level 1 (35%), Level 2 (3%), Level 3 (2%) bonuses are credited immediately upon downline investment.</p>
      </div>
    </div>
  `);
}

function showAppModal(title, htmlContent) {
  let modal = document.getElementById('general-app-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'general-app-modal';
    document.body.appendChild(modal);
  }
  modal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-[#151722] border border-[#2b3044] rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl relative">
      <div class="flex items-center justify-between pb-2 border-b border-[#232736]">
        <h3 class="text-sm font-bold text-white">${title}</h3>
        <button onclick="closeAppModal()" class="text-gray-400 hover:text-white">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
      ${htmlContent}
    </div>
  `;
  lucide.createIcons();
}

function closeAppModal() {
  const modal = document.getElementById('general-app-modal');
  if (modal) modal.remove();
}

// Banner Content Slides showing the company's work
const COMPANY_BANNERS = [
  {
    tag: 'ETHICAL 3D FABRICATION',
    title: 'Industrial 3D Printing Fleets in Ethiopia',
    desc: 'Halal-certified additive manufacturing hubs creating precision tools, medical components, and architectural models.',
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60'
  },
  {
    tag: 'PROFIT SHARING LEASE',
    title: 'Direct Hardware Asset Backed Income',
    desc: 'Each VIP device leased is physically deployed in our regional production centers with daily halal profit payouts.',
    image: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=60'
  },
  {
    tag: 'LOCAL IMPACT & JOBS',
    title: 'Empowering Ethiopian Engineers & Youth',
    desc: 'Partnered with university tech institutes across Addis Ababa and Hawassa to manufacture spare parts locally.',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60'
  }
];

function getBannerContent(index) {
  const b = COMPANY_BANNERS[index] || COMPANY_BANNERS[0];
  return `
    <div class="z-10 max-w-[65%] space-y-1.5 transition-all duration-500">
      <span class="text-[9px] uppercase font-bold tracking-widest text-[#00C853] bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">${b.tag}</span>
      <h2 class="text-sm sm:text-base font-bold leading-tight text-white">${b.title}</h2>
      <p class="text-[10px] text-gray-400 leading-snug line-clamp-2">${b.desc}</p>
    </div>
    <div class="absolute right-0 top-0 bottom-0 w-44 flex items-center justify-center opacity-85">
      <img src="${b.image}" alt="${b.title}" class="object-cover h-36 rounded-xl shadow-lg border border-emerald-500/30">
    </div>
  `;
}

function setBannerIndex(idx) {
  state.currentBanner = idx;
  render();
}

// Auto rotate banners every 6 seconds
setInterval(() => {
  if (state.currentTab === 'product') {
    state.currentBanner = (state.currentBanner + 1) % COMPANY_BANNERS.length;
    render();
  }
}, 6000);

// AUTHENTICATION MODAL (LOGIN & REGISTRATION)
function openAuthModal(mode = 'login') {
  state.authMode = mode;
  state.showAuthModal = true;
  renderAuthModal();
}

function closeAuthModal() {
  state.showAuthModal = false;
  const modal = document.getElementById('auth-modal-overlay');
  if (modal) modal.remove();
}

function renderAuthModal() {
  let modal = document.getElementById('auth-modal-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal-overlay';
    document.body.appendChild(modal);
  }

  modal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
  modal.innerHTML = `
    <div class="bg-[#151722] border border-[#2b3044] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative">
      <button onclick="closeAuthModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <div class="text-center space-y-1">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C853] to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-black font-extrabold text-xl mx-auto">H</div>
        <h3 class="text-lg font-bold text-white tracking-wide">${state.authMode === 'login' ? 'Welcome Back' : 'Create Halal Account'}</h3>
        <p class="text-xs text-gray-400">${state.authMode === 'login' ? 'Login with your Ethiopian phone number' : 'Enter phone and password to get started'}</p>
      </div>

      <!-- TABS -->
      <div class="flex bg-[#101218] rounded-xl p-1 border border-[#232635]">
        <button onclick="state.authMode = 'login'; renderAuthModal()" class="flex-1 py-2 text-xs font-bold rounded-lg transition ${state.authMode === 'login' ? 'bg-[#00C853] text-black shadow' : 'text-gray-400 hover:text-white'}">
          Sign In
        </button>
        <button onclick="state.authMode = 'register'; renderAuthModal()" class="flex-1 py-2 text-xs font-bold rounded-lg transition ${state.authMode === 'register' ? 'bg-[#00C853] text-black shadow' : 'text-gray-400 hover:text-white'}">
          Register
        </button>
      </div>

      <!-- FORM -->
      <div class="space-y-3">
        <div class="space-y-1">
          <label class="text-[11px] font-bold text-gray-300">Phone Number</label>
          <div class="flex items-center bg-[#101219] border border-[#252838] rounded-xl px-3 py-2.5">
            <span class="text-xs font-bold text-[#00C853] mr-2">+251</span>
            <input type="tel" id="auth-phone" placeholder="9XXXXXXXX" class="bg-transparent text-xs text-white outline-none w-full font-mono">
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-[11px] font-bold text-gray-300">Password</label>
          <div class="flex items-center bg-[#101219] border border-[#252838] rounded-xl px-3 py-2.5">
            <input type="password" id="auth-password" placeholder="Enter password" class="bg-transparent text-xs text-white outline-none w-full">
          </div>
        </div>

        ${state.authMode === 'register' ? `
          <div class="space-y-1">
            <label class="text-[11px] font-bold text-gray-300">Invitation Code (Optional)</label>
            <div class="flex items-center bg-[#101219] border border-[#252838] rounded-xl px-3 py-2.5">
              <input type="text" id="auth-referral" placeholder="e.g. ERI777" class="bg-transparent text-xs text-white outline-none w-full uppercase font-mono">
            </div>
          </div>
        ` : ''}

        <button onclick="handleAuthSubmit()" id="auth-submit-btn" class="w-full py-3 bg-[#00C853] hover:bg-[#009624] text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition mt-2">
          ${state.authMode === 'login' ? 'Sign In Now' : 'Create Account'}
        </button>

        ${state.authMode === 'login' ? `
          <button onclick="useQuickDemoLogin()" class="w-full py-2 bg-[#1d212e] hover:bg-[#252b3d] text-gray-300 text-[11px] font-bold rounded-xl border border-[#292e40] transition">
            Use Demo Account (251 938236272)
          </button>
        ` : ''}
      </div>
    </div>
  `;
  lucide.createIcons();
}

async function handleAuthSubmit() {
  const phoneRaw = document.getElementById('auth-phone')?.value?.trim();
  const password = document.getElementById('auth-password')?.value?.trim();
  const referral = document.getElementById('auth-referral')?.value?.trim();

  if (!phoneRaw || !password) {
    showToast('Please enter both phone number and password', 'error');
    return;
  }

  // Format Ethiopian phone
  let phone = phoneRaw;
  if (!phone.startsWith('251')) {
    phone = phone.startsWith('0') ? '251' + phone.substring(1) : '251' + phone;
  }

  const endpoint = state.authMode === 'login' ? '/auth/login' : '/auth/register';
  const body = { phone, password };
  if (state.authMode === 'register' && referral) body.referralCode = referral;

  const btn = document.getElementById('auth-submit-btn');
  if (btn) btn.disabled = true;

  try {
    const res = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('halal_token', res.token);
    closeAuthModal();
    showToast(`Welcome! Logged in as ${res.user.phone}`, 'success');
    render();
  } catch (e) {
    // handled in api()
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function useQuickDemoLogin() {
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone: '251938236272', password: '123' })
    });
    state.token = res.token;
    state.user = res.user;
    localStorage.setItem('halal_token', res.token);
    closeAuthModal();
    showToast('Logged in to Demo Account', 'success');
    render();
  } catch (e) {}
}

function logoutUser() {
  localStorage.removeItem('halal_token');
  state.token = null;
  state.user = null;
  showToast('Logged out successfully', 'info');
  openAuthModal('login');
  render();
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
