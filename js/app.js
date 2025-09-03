// app.js - MiniBank demo frontend logic
// Data persistence is simulated using localStorage for demo purposes

(() => {
  // Helpers for password hashing (simple simulation)
  function hashPassword(password) {
    // Simple hash simulation, DO NOT use in real apps
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Utility to format currency output
  function formatCurrency(amount) {
    return amount.toFixed(2);
  }

  // Utility for escaping single quotes in SQL strings
  function escapeSQL(str) {
    return String(str).replace(/'/g, "''");
  }

  // DOM Elements
  const authSection = document.getElementById('auth-section');
  const registrationForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const dashboard = document.getElementById('dashboard');
  const displayUsername = document.getElementById('displayUsername');
  const logoutBtn = document.getElementById('logoutBtn');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const showRegisterBtn = document.getElementById('showRegisterBtn');

  const accountList = document.getElementById('accountList');
  const addAccountBtn = document.getElementById('addAccountBtn');

  const accountDetailsSection = document.getElementById('accountDetailsSection');
  const selectedAccountName = document.getElementById('selectedAccountName');
  const selectedAccountBalance = document.getElementById('selectedAccountBalance');
  const topUpBtn = document.getElementById('topUpBtn');

  const transferForm = document.getElementById('transferForm');
  const transferToAccount = document.getElementById('transferToAccount');
  const transferAmount = document.getElementById('transferAmount');
  const transferNote = document.getElementById('transferNote');

  const transactionsTableBody = document.querySelector('#transactionsTable tbody');
  
  const exportExcelBtnFull = document.getElementById('exportExcelBtnFull');

  // LocalStorage keys
  const LS_USERS = 'minibank_users';
  const LS_ACCOUNTS = 'minibank_accounts';
  const LS_TRANSACTIONS = 'minibank_transactions';
  const LS_LOGGED_IN = 'minibank_logged_in';

  // State variables
  let currentUser = null;
  let accounts = [];
  let transactions = [];
  let selectedAccountId = null;

  // Load data from localStorage or initialize demo data
  function loadData() {
    let users = JSON.parse(localStorage.getItem(LS_USERS));
    if (!users) {
      // Initialize demo user
      users = [{
        id: 1,
        username: 'demo_user',
        password_hash: hashPassword('password123')
      }];
      localStorage.setItem(LS_USERS, JSON.stringify(users));
    }

    accounts = JSON.parse(localStorage.getItem(LS_ACCOUNTS));
    if (!accounts) {
      // Initialize demo accounts for demo_user
      accounts = [
        { id: 1, user_id: 1, account_name: 'Primary Account', balance: 1000.0 },
        { id: 2, user_id: 1, account_name: 'Savings Account', balance: 5000.0 }
      ];
      localStorage.setItem(LS_ACCOUNTS, JSON.stringify(accounts));
    }

    transactions = JSON.parse(localStorage.getItem(LS_TRANSACTIONS));
    if (!transactions) {
      // Initialize demo transactions
      transactions = [
        { id: 1, from_account_id: null, to_account_id: 1, amount: 1000.0, type: 'top-up', note: 'Initial balance', created_at: new Date().toISOString() },
        { id: 2, from_account_id: 1, to_account_id: 2, amount: 200.0, type: 'transfer', note: 'Transfer to savings', created_at: new Date().toISOString() }
      ];
      localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
    }

    let loggedIn = JSON.parse(localStorage.getItem(LS_LOGGED_IN));
    if (loggedIn) {
      currentUser = loggedIn;
      showDashboard();
    } else {
      showLoginForm();
    }
  }

  // Save data helpers
  function saveUsers(users) {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }
  function saveAccounts() {
    localStorage.setItem(LS_ACCOUNTS, JSON.stringify(accounts));
  }
  function saveTransactions() {
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
  }
  function saveLoggedIn(user) {
    if (user) {
      localStorage.setItem(LS_LOGGED_IN, JSON.stringify(user));
    } else {
      localStorage.removeItem(LS_LOGGED_IN);
    }
  }

  // User registration
  registrationForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = registrationForm.regUsername.value.trim();
    const password = registrationForm.regPassword.value;
    const confirmPassword = registrationForm.regPasswordConfirm.value;

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (username.length < 3 || password.length < 6) {
      alert('Username must be at least 3 characters and password at least 6 characters.');
      return;
    }

    let users = JSON.parse(localStorage.getItem(LS_USERS)) || [];

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      alert('Username already exists.');
      return;
    }

    const newUser = {
      id: users.length ? users[users.length - 1].id + 1 : 1,
      username,
      password_hash: hashPassword(password)
    };

    users.push(newUser);
    saveUsers(users);
    alert('Registration successful! Please login.');
    showLoginForm();
  });

  // User login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = loginForm.loginUsername.value.trim();
    const password = loginForm.loginPassword.value;

    let users = JSON.parse(localStorage.getItem(LS_USERS)) || [];

    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password_hash === hashPassword(password));

    if (!user) {
      alert('Invalid username or password.');
      return;
    }

    currentUser = { id: user.id, username: user.username };
    saveLoggedIn(currentUser);
    showDashboard();
  });

  // Show forms toggle
  showLoginBtn.addEventListener('click', showLoginForm);
  showRegisterBtn.addEventListener('click', showRegisterForm);

  function showLoginForm() {
    document.getElementById('registration-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  }

  function showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('registration-form').classList.remove('hidden');
  }

  // Logout
  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    selectedAccountId = null;
    saveLoggedIn(null);
    dashboard.classList.add('hidden');
    authSection.classList.remove('hidden');
    showLoginForm();
  });

  // Show dashboard for logged in user
  function showDashboard() {
    authSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    displayUsername.textContent = currentUser.username;
    renderAccountsList();
    selectedAccountId = null;
    hideAccountDetails();
  }

  // Render user's accounts in list
  function renderAccountsList() {
    accountList.innerHTML = '';
    const userAccounts = accounts.filter(acc => acc.user_id === currentUser.id);
    if (!userAccounts.length) {
      accountList.innerHTML = '<li>No accounts found. Click "Add Account" to create one.</li>';
      return;
    }
    userAccounts.forEach(acc => {
      const li = document.createElement('li');
      li.textContent = `${acc.account_name} - $${formatCurrency(acc.balance)}`;
      li.dataset.accountId = acc.id;
      li.classList.toggle('selected', acc.id === selectedAccountId);
      li.addEventListener('click', () => {
        selectAccount(acc.id);
      });
      accountList.appendChild(li);
    });
  }

  // Add new account
  addAccountBtn.addEventListener('click', () => {
    let accountName = prompt('Enter new account name:', 'New Account');
    if (!accountName || !accountName.trim()) {
      alert('Account name cannot be empty.');
      return;
    }
    accountName = accountName.trim();

    const userAccounts = accounts.filter(acc => acc.user_id === currentUser.id);
    if (userAccounts.find(acc => acc.account_name.toLowerCase() === accountName.toLowerCase())) {
      alert('Account name already exists.');
      return;
    }

    const newAccount = {
      id: accounts.length ? accounts[accounts.length - 1].id + 1 : 1,
      user_id: currentUser.id,
      account_name: accountName,
      balance: 0.0
    };
    accounts.push(newAccount);
    saveAccounts();
    renderAccountsList();

    // Select new account and show details immediately
    selectedAccountId = newAccount.id;
    showAccountDetails(selectedAccountId);
  });

  // Select an account and show details
  function selectAccount(accountId) {
    selectedAccountId = accountId;
    renderAccountsList();
    showAccountDetails(accountId);
  }

  // Show account details section populated for selected account
  function showAccountDetails(accountId) {
    const acc = accounts.find(a => a.id === accountId && a.user_id === currentUser.id);
    if (!acc) {
      alert('Account not found.');
      return;
    }
    selectedAccountName.textContent = acc.account_name;
    selectedAccountBalance.textContent = formatCurrency(acc.balance);

    // Populate transfer dropdown with user's other accounts
    transferToAccount.innerHTML = '';
    const userAccounts = accounts.filter(a => a.user_id === currentUser.id && a.id !== acc.id);
    userAccounts.forEach(a => {
      const option = document.createElement('option');
      option.value = a.id;
      option.textContent = a.account_name;
      transferToAccount.appendChild(option);
    });

    accountDetailsSection.classList.remove('hidden');

    renderTransactions(acc.id);
  }

  function hideAccountDetails() {
    accountDetailsSection.classList.add('hidden');
  }

  // Top-up button adds $100 to the selected account
  topUpBtn.addEventListener('click', () => {
    if (!selectedAccountId) return;
    let acc = accounts.find(a => a.id === selectedAccountId && a.user_id === currentUser.id);
    if (!acc) return;

    acc.balance += 100;
    saveAccounts();

    const newTransId = transactions.length ? transactions[transactions.length - 1].id + 1 : 1;
    transactions.push({
      id: newTransId,
      from_account_id: null,
      to_account_id: acc.id,
      amount: 100,
      type: 'top-up',
      note: 'Demo top-up $100',
      created_at: new Date().toISOString()
    });
    saveTransactions();

    selectedAccountBalance.textContent = formatCurrency(acc.balance);
    renderTransactions(acc.id);
    renderAccountsList();
  });

  // Transfer form submission
  transferForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    const fromAcc = accounts.find(a => a.id === selectedAccountId && a.user_id === currentUser.id);
    const toAccId = parseInt(transferToAccount.value);
    const toAcc = accounts.find(a => a.id === toAccId && a.user_id === currentUser.id);
    const amount = parseFloat(transferAmount.value);
    const note = transferNote.value.trim();

    if (!toAcc) {
      alert('Invalid recipient account selected.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert('Enter a valid positive amount.');
      return;
    }
    if (fromAcc.balance < amount) {
      alert('Insufficient balance.');
      return;
    }

    fromAcc.balance -= amount;
    toAcc.balance += amount;
    saveAccounts();

    const newTransId = transactions.length ? transactions[transactions.length - 1].id + 1 : 1;
    transactions.push({
      id: newTransId,
      from_account_id: fromAcc.id,
      to_account_id: toAcc.id,
      amount,
      type: 'transfer',
      note: note || 'Transfer',
      created_at: new Date().toISOString()
    });
    saveTransactions();

    selectedAccountBalance.textContent = formatCurrency(fromAcc.balance);
    transferAmount.value = '';
    transferNote.value = '';
    renderTransactions(fromAcc.id);
    renderAccountsList();
    alert('Transfer successful!');
  });

  // Render transactions for selected account
  function renderTransactions(accountId) {
    const filtered = transactions.filter(t =>
      t.from_account_id === accountId || t.to_account_id === accountId
    );

    transactionsTableBody.innerHTML = '';

    if (!filtered.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" style="text-align:center;">No transactions found.</td>';
      transactionsTableBody.appendChild(tr);
      return;
    }

    const userAccounts = accounts.filter(acc => acc.user_id === currentUser.id);

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    filtered.forEach(t => {
      const tr = document.createElement('tr');

      const date = new Date(t.created_at).toLocaleString();

      const fromAccName = t.from_account_id ? (userAccounts.find(a => a.id === t.from_account_id) || {}).account_name || 'External' : 'External';
      const toAccName = t.to_account_id ? (userAccounts.find(a => a.id === t.to_account_id) || {}).account_name || 'External' : 'External';

      tr.innerHTML = `
        <td>${date}</td>
        <td>${t.type}</td>
        <td>$${formatCurrency(t.amount)}</td>
        <td>${fromAccName}</td>
        <td>${toAccName}</td>
        <td>${t.note || ''}</td>
      `;

      transactionsTableBody.appendChild(tr);
    });
  }
  
  // MODIFIED: Export to Excel functionality
  if (exportExcelBtnFull) {
    exportExcelBtnFull.addEventListener('click', () => {
      // Check if an account is selected
      if (!selectedAccountId) {
        alert('Please select an account to export its transaction history.');
        return;
      }

      // Find the selected account name
      const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);
      if (!selectedAccount) return; // Should not happen if an ID is set

      // 1. Get ONLY the transactions for the selected account
      const accountTransactions = transactions.filter(t =>
        t.from_account_id === selectedAccountId || t.to_account_id === selectedAccountId
      );
      
      if (accountTransactions.length === 0) {
        alert('No transactions to export for this account.');
        return;
      }

      // Get all of the current user's accounts to look up names
      const userAccounts = accounts.filter(acc => acc.user_id === currentUser.id);

      // 2. Format the data specifically for export
      const exportData = accountTransactions.map(t => {
        const fromAccountName = t.from_account_id
          ? (userAccounts.find(a => a.id === t.from_account_id) || {}).account_name || 'External'
          : 'Top-up';
        const toAccountName = t.to_account_id
          ? (userAccounts.find(a => a.id === t.to_account_id) || {}).account_name || 'External'
          : 'External';
          
        return {
          Date: new Date(t.created_at).toLocaleString(),
          Type: t.type,
          Amount: t.amount,
          From: fromAccountName,
          To: toAccountName,
          Note: t.note || ''
        };
      });

      // 3. Create the Excel sheet from the formatted data
      let wb = XLSX.utils.book_new();
      let ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set the worksheet name to the account name
      const sheetName = selectedAccount.account_name.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize sheet name
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // 4. Trigger the download
      const fileName = `${sheetName}_transactions.xlsx`;
      XLSX.writeFile(wb, fileName);
    });
  }

  // Initialization
  loadData();

})();