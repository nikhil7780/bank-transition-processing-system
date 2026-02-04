const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // --- Initial Load ---
    fetchStats();
    fetchAccountsList();
    fetchPending();
    fetchRollback();

    // --- Theme Toggle ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const icon = themeToggleBtn.querySelector('i');

    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');

        if (isDark) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
            localStorage.setItem('theme', 'dark');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
            localStorage.setItem('theme', 'light');
        }
        updateChartTheme(isDark);
    });

    // --- Navigation ---
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = link.getAttribute('data-section');
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                    if (targetId === 'accounts') fetchAccountsList();
                    if (targetId === 'pending') fetchPending();
                    if (targetId === 'rollback') fetchRollback();
                    if (targetId === 'history') fetchGlobalHistory();
                    if (targetId === 'dashboard') {
                        fetchStats();
                        fetchAccountsList(); // Update Pie Chart
                    }
                }
            });

            pageTitle.textContent = link.textContent.trim();
        });
    });

    // --- Functions & API Calls ---

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/stats`);
            const data = await res.json();

            document.getElementById('total-accounts').textContent = data.totalAccounts;
            document.getElementById('total-balance').textContent = `$${data.totalBalance.toFixed(2)}`;
            document.getElementById('pending-transactions').textContent = data.pendingCount;
            document.getElementById('total-transactions').textContent = data.totalTransactions;
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }

    // Add Account
    document.getElementById('add-account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('acc-id').value;
        const balance = document.getElementById('acc-balance').value;

        try {
            const res = await fetch(`${API_URL}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, balance })
            });
            const data = await res.json();

            if (res.ok) {
                showNotification('Account Created!', 'success');
                fetchAccountsList();
                e.target.reset();
            } else {
                showNotification(data.error, 'error');
            }
        } catch (err) {
            showNotification('Connection Error', 'error');
        }
    });

    // Lookup Account
    document.getElementById('lookup-account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('lookup-id').value;
        const display = document.getElementById('account-info-display');
        const historyDisplay = document.getElementById('account-history-display');

        try {
            const res = await fetch(`${API_URL}/accounts/${id}`);
            const data = await res.json();

            if (res.ok) {
                display.innerHTML = `
                    <p><strong>ID:</strong> ${data.id}</p>
                    <p><strong>Balance:</strong> $${data.balance.toFixed(2)}</p>
                `;

                // Show History
                if (data.transactions.length > 0) {
                    historyDisplay.innerHTML = data.transactions.map(t => `
                        <div class="data-item">
                            <span>${t.date}</span>
                            <span>${t.type}</span>
                            <span class="${t.type === 'Deposit' || t.type.includes('In') ? 'text-success' : 'text-danger'}">
                                ${t.type.includes('W') || t.type.includes('Out') ? '-' : '+'}$${t.amount.toFixed(2)}
                            </span>
                        </div>
                    `).join('');
                } else {
                    historyDisplay.innerHTML = '<p>No transactions.</p>';
                }
            } else {
                display.innerHTML = `<p class="text-danger">${data.error}</p>`;
                historyDisplay.innerHTML = '';
            }
        } catch (err) {
            showNotification('Error fetching account', 'error');
        }
    });

    // --- Search Logic ---

    // Accounts Search
    function handleAccountSearch() {
        const query = document.getElementById('search-accounts').value;
        fetchAccountsList(query);
    }

    document.getElementById('btn-search-accounts').addEventListener('click', handleAccountSearch);
    document.getElementById('search-accounts').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAccountSearch();
    });

    // History Search
    function handleHistorySearch() {
        const query = document.getElementById('search-history').value;
        fetchGlobalHistory(query);
    }

    document.getElementById('btn-search-history').addEventListener('click', handleHistorySearch);
    document.getElementById('search-history').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleHistorySearch();
    });

    async function fetchAccountsList(query = '') {
        let url = `${API_URL}/accounts`;
        if (query) {
            url += `?q=${encodeURIComponent(query)}`;
        }

        try {
            const res = await fetch(url);
            const data = await res.json();
            const container = document.getElementById('accounts-list');

            if (data.length === 0) {
                container.innerHTML = '<p style="padding:1rem;">No accounts found.</p>';
                // If search returns nothing, we might want to keep the chart as is or show empty
                // But for now, let's just update chart if we have data or if it's a full list
                return;
            }

            container.innerHTML = data.map(acc => `
                <div class="data-item">
                    <span><strong>ID:</strong> ${acc.id}</span>
                    <span>$${acc.balance.toFixed(2)}</span>
                </div>
            `).join('');

            // Only update chart if we are showing the full list (no query), otherwise chart might look weird showing only 1 user
            if (!query) updateChart(data);

        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    }

    async function fetchGlobalHistory(query = '') {
        try {
            const res = await fetch(`${API_URL}/history`);
            let data = await res.json();
            const list = document.getElementById('history-list');

            // Client-side filtering for history
            if (query) {
                const q = query.toLowerCase();
                data = data.filter(t =>
                    t.accountId.toString().includes(q) ||
                    t.type.toLowerCase().includes(q) ||
                    t.amount.toString().includes(q)
                );
            }

            if (data.length === 0) {
                list.innerHTML = '<p style="padding:1rem;">No matches found.</p>';
                return;
            }

            list.innerHTML = data.map(t => {
                let typeLabel = t.type;
                if (t.type === 'D') typeLabel = 'Deposit';
                if (t.type === 'W') typeLabel = 'Withdraw';

                return `
                <div class="data-item">
                    <span style="font-size:0.85em; color:var(--text-secondary);">${t.date}</span>
                    <span>User ${t.accountId}</span>
                    <span class="${t.type === 'D' || t.type.includes('In') ? 'text-success' : 'text-danger'}">
                        ${typeLabel} $${t.amount.toFixed(2)}
                    </span>
                </div>
            `}).join('');
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    }
    // Add Pending Transaction
    document.getElementById('add-transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const accountId = document.getElementById('trans-id').value;
        const deviceId = document.getElementById('trans-device').value;
        const type = document.getElementById('trans-type').value;
        const amount = document.getElementById('trans-amount').value;

        const res = await fetch(`${API_URL}/pending`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId, type, amount, deviceId })
        });

        const data = await res.json();

        if (res.ok) {
            if (data.risks) {
                showNotification('Warning: Transaction flagged as Suspicious!', 'warning');
            } else {
                showNotification('Added to Queue', 'success');
            }
            e.target.reset();
            fetchPending();
            fetchStats();
        } else {
            showNotification(data.error, 'error');
        }
    });

    // Transfer (No changes needed, logic remains same)
    document.getElementById('transfer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fromId = document.getElementById('from-id').value;
        const toId = document.getElementById('to-id').value;
        const amount = document.getElementById('transfer-amount').value;

        const res = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromId, toId, amount })
        });

        if (res.ok) {
            showNotification('Transfer Successful', 'success');
            e.target.reset();
            fetchStats();
        } else {
            const d = await res.json();
            showNotification(d.error, 'error');
        }
    });

    // Queue & Rollback Lists
    async function fetchPending() {
        const res = await fetch(`${API_URL}/pending`);
        const data = await res.json();
        const list = document.getElementById('pending-list');

        if (data.length === 0) {
            list.innerHTML = '<p style="padding:1rem;">Queue is empty</p>';
            return;
        }

        list.innerHTML = data.map((t, index) => {
            const suspiciousClass = t.isSuspicious ? 'suspicious-item' : '';
            const badge = t.isSuspicious
                ? `<span class="badge-danger">HIGH PRIORITY (RISK)</span>`
                : `<span class="badge">NORMAL PRIORITY</span> <span style="font-size:0.8em; color:var(--text-secondary);">#${index + 1}</span>`;

            const riskInfo = t.risks
                ? `<span class="risk-reason"><i class="fas fa-exclamation-triangle"></i> ${t.risks.join(', ')}</span>`
                : '';

            return `
            <div class="data-item ${suspiciousClass}">
                <div>
                    ${badge}
                    <span style="font-size:0.85em; color:var(--text-secondary); margin-left:8px;">
                        ${t.deviceId && t.deviceId !== 'unknown' ? `<i class="fas fa-mobile-alt"></i> ${t.deviceId}` : ''}
                    </span>
                    ${riskInfo}
                </div>
                <span>Acc: ${t.accountId}</span>
                <span>${t.type === 'D' ? 'Deposit' : 'Withdraw'} $${t.amount}</span>
            </div>
            `;
        }).join('');
    }

    async function fetchRollback() {
        const res = await fetch(`${API_URL}/rollback`);
        const data = await res.json(); // Returns stack
        const list = document.getElementById('rollback-list');

        if (data.length === 0) {
            list.innerHTML = '<p style="padding:1rem;">Stack is empty</p>';
            return;
        }

        list.innerHTML = data.map((item, index) => `
            <div class="data-item">
                <span style="color:var(--text-secondary); font-size:0.8em;">TOP ${index == 0 ? '(Last Action)' : ''}</span>
                <span>${item.type === 'RB_TRANSFER' ? 'Transfer' : (item.originalType === 'D' ? 'Deposit' : 'Withdraw')}</span>
                <span>$${item.amount}</span>
            </div>
        `).join('');
    }

    // Process Queue Button
    document.getElementById('process-transaction-btn').addEventListener('click', async () => {
        const res = await fetch(`${API_URL}/pending/process`, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showNotification('Processed item from Queue', 'success');
            fetchPending();
            fetchStats();
        } else {
            showNotification(data.error || 'Error processing', 'warning');
        }
    });

    // Rollback Button
    document.getElementById('rollback-transaction-btn').addEventListener('click', async () => {
        const res = await fetch(`${API_URL}/rollback`, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            showNotification('Rollback Successful', 'success');
            fetchRollback();
            fetchStats();
        } else {
            showNotification(data.error, 'warning');
        }
    });

    // Reset Data
    document.getElementById('reset-data-btn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete all data?')) {
            await fetch(`${API_URL}/reset`, { method: 'POST' });
            location.reload();
        }
    });

    // Notifications
    const notification = document.getElementById('notification');
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        setTimeout(() => notification.classList.remove('show'), 3000);
    }

    // Chart (Visual Only - Static for Demo, or could fetch history)
    // --- Charts Logic ---
    const ctxPie = document.getElementById('balance-chart').getContext('2d');
    const ctxLine = document.getElementById('activity-chart').getContext('2d');

    let balanceChart; // Pie
    let activityChart; // Line

    function initCharts() {
        const isDark = body.classList.contains('dark-mode');
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#334155' : '#e5e7eb';

        // 1. Pie Chart
        balanceChart = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    label: 'Account Balance',
                    data: [],
                    backgroundColor: [],
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: textColor } },
                    title: { display: true, text: 'Funds Distribution', color: textColor }
                }
            }
        });

        // 2. Line Chart (Transaction Pulse)
        activityChart = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: ['Start'],
                datasets: [{
                    label: 'Calculated Activity',
                    data: [0],
                    borderColor: '#10b981', // Emerald for Pulse
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } },
                    title: { display: true, text: 'Live Traffic', color: textColor }
                },
                scales: {
                    y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true },
                    x: { grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });
    }

    function updatePieChart(accounts) {
        if (!balanceChart) return;

        const labels = accounts.map(a => `User ${a.id}`);
        const data = accounts.map(a => a.balance);
        const colors = accounts.map((_, i) => generateColor(i, accounts.length));

        balanceChart.data.labels = labels;
        balanceChart.data.datasets[0].data = data;
        balanceChart.data.datasets[0].backgroundColor = colors;
        balanceChart.update();
    }

    // Update Pulse Chart (Activity)
    function updateActivityChart(totalTrans) {
        if (!activityChart) return;
        const now = new Date().toLocaleTimeString();

        activityChart.data.labels.push(now);
        activityChart.data.datasets[0].data.push(totalTrans);
        activityChart.update();
    }

    // Alias for existing call compatibility
    function updateChart(accounts) {
        updatePieChart(accounts);
    }

    async function fetchStats() {
        try {
            const res = await fetch(`${API_URL}/stats`);
            const data = await res.json();

            document.getElementById('total-accounts').textContent = data.totalAccounts;
            document.getElementById('total-balance').textContent = `$${data.totalBalance.toFixed(2)}`;
            document.getElementById('pending-transactions').textContent = data.pendingCount;
            document.getElementById('total-transactions').textContent = data.totalTransactions;

            updateActivityChart(data.totalTransactions);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }

    async function fetchGlobalHistory(query = '') {
        const list = document.getElementById('history-list');

        // 1. If no query, don't show history yet. Show prompt.
        if (!query) {
            list.innerHTML = '<p style="padding:1rem; text-align:center; color:var(--text-secondary);">Please enter an Account ID above and click Search to view history.</p>';
            return;
        }

        try {
            // 2. Fetch all history (or we could create a backend route /api/history/:id, but filtering is fine for this size)
            const res = await fetch(`${API_URL}/history`);
            let data = await res.json();

            // 3. Filter by User ID (Strict or convenient)
            // User asked for "enter user id", so filtering by AccountID is primary.
            const q = query.toLowerCase();
            // data = data.filter(t => t.accountId.toString() === q); // Strict ID match or includes? "includes" is safer for UX.
            // Let's stick to .includes() or exact match? User said "enter user id".
            // Let's use includes for flexibility but focus on ID.
            data = data.filter(t => t.accountId.toString().includes(q));


            if (data.length === 0) {
                list.innerHTML = '<p style="padding:1rem; text-align:center;">No transactions found for User ID: ' + query + '</p>';
                return;
            }

            list.innerHTML = data.map(t => `
                <div class="data-item">
                    <span style="font-size:0.85em; color:var(--text-secondary);">${t.date}</span>
                    <span>User ${t.accountId}</span>
                    <span class="${t.type === 'D' || t.type.includes('In') ? 'text-success' : 'text-danger'}">
                        ${t.type} $${t.amount.toFixed(2)}
                    </span>
                </div>
            `).join('');
        } catch (err) {
            console.error('Error fetching history:', err);
            list.innerHTML = '<p style="padding:1rem; color:var(--danger);">Error fetching data.</p>';
        }
    }

    function generateColor(index, total) {
        // Premium Indigo/Purple/Blue Palette
        const hueStart = 220;
        const hueEnd = 290;
        const hueRange = hueEnd - hueStart;
        const step = (index * 45) % hueRange;
        const hue = hueStart + step;
        const lightness = 60 + ((index % 3) * 8);
        return `hsla(${hue}, 85%, ${lightness}%, 0.7)`;
    }

    function updateChartTheme(isDark) {
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#334155' : '#e5e7eb';
        const borderColor = isDark ? '#1e293b' : '#ffffff';

        if (balanceChart) {
            balanceChart.options.plugins.legend.labels.color = textColor;
            balanceChart.options.plugins.title.color = textColor;
            balanceChart.data.datasets[0].borderColor = borderColor;
            balanceChart.update();
        }

        if (activityChart) {
            activityChart.options.plugins.legend.labels.color = textColor;
            activityChart.options.plugins.title.color = textColor;
            activityChart.options.scales.x.grid.color = gridColor;
            activityChart.options.scales.x.ticks.color = textColor;
            activityChart.options.scales.y.grid.color = gridColor;
            activityChart.options.scales.y.ticks.color = textColor;
            activityChart.update();
        }
    }

    // --- Manual Log Export ---
    document.getElementById('manual-log-btn').addEventListener('click', async () => {
        try {
            const res = await fetch(`${API_URL}/history`);
            const data = await res.json();

            if (!data || data.length === 0) {
                showNotification('No logs to export', 'warning');
                return;
            }

            // Convert to CSV
            const headers = ['Date', 'Timestamp', 'Account ID', 'Type', 'Amount', 'Status'];
            const csvRows = [headers.join(',')];

            data.forEach(row => {
                const values = [
                    `"${row.date}"`,
                    row.timestamp,
                    row.accountId,
                    row.type === 'D' ? 'Deposit' : 'Withdraw',
                    row.amount,
                    row.status
                ];
                csvRows.push(values.join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `bank_logs_${Date.now()}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showNotification('Logs exported successfully', 'success');

        } catch (err) {
            console.error('Export failed:', err);
            showNotification('Failed to export logs', 'error');
        }
    });

    initCharts();
});
