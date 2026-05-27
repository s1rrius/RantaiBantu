const API_URL = 'http://localhost:8000';
let ws = null;

const app = {
    state: {
        token: localStorage.getItem('token'),
        user: null,
        currentTxToSign: null,
        fundsChart: null
    },

    async init() {
        window.addEventListener('hashchange', this.router.bind(this));
        await this.fetchProfile();
        this.router();
        this.setupWebSocket();
    },

    async api(path, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.state.token) {
            headers['Authorization'] = `Bearer ${this.state.token}`;
        }
        try {
            const res = await fetch(`${API_URL}${path}`, { ...options, headers });
            const data = await res.json();
            if (!res.ok) {
                this.showToast(data.detail || 'API Error', 'error');
                if (res.status === 401) {
                    this.logout();
                }
                throw new Error(data.detail);
            }
            return data;
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    formatRole(role) {
        if (!role) return '';
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'error') { icon = '❌'; toast.style.borderLeftColor = 'var(--danger)'; }
        if (type === 'success') { icon = '✅'; toast.style.borderLeftColor = 'var(--success)'; }
        
        toast.innerHTML = `
            <div>${icon}</div>
            <div style="flex:1">${message}</div>
            <div class="toast-progress" style="animation-duration: 4s;"></div>
        `;
        
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    showSkeleton(containerId, count = 3, type = 'text') {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = `skeleton skeleton-${type}`;
            container.appendChild(el);
        }
    },

    setupWebSocket() {
        ws = new WebSocket('ws://localhost:8000/ws');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'transaction.created') {
                this.showToast(`New transaction ${data.transaction_id.substring(0,8)} submitted!`, 'info');
                if (location.hash === '#/pending' || location.hash === '#/dashboard') this.router();
            } else if (data.type === 'transaction.signed') {
                this.showToast(`Transaction ${data.transaction_id.substring(0,8)} signed`);
                if (location.hash === '#/pending' || location.hash === '#/dashboard') this.router();
            } else if (data.type === 'transaction.confirmed') {
                this.showToast(`Transaction ${data.transaction_id.substring(0,8)} confirmed!`, 'success');
                if (location.hash === '#/pending' || location.hash === '#/dashboard') this.router();
            } else if (data.type === 'block.added') {
                this.showToast(`New Block #${data.block_index} added to chain!`, 'success');
                if (location.hash === '#/chain' || location.hash === '#/dashboard') this.router();
            }
        };
        ws.onclose = () => setTimeout(() => this.setupWebSocket(), 5000);
    },

    async fetchProfile() {
        if (!this.state.token) {
            this.renderGuestNavbar();
            return;
        }
        try {
            this.state.user = await this.api('/users/me');
            this.renderUserNavbar();
        } catch (e) {
            this.logout();
        }
    },

    renderGuestNavbar() {
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('nav-user-info').style.display = 'none';
        document.getElementById('nav-guest-info').style.display = 'block';
        
        document.getElementById('nav-submit').style.display = 'none';
        document.getElementById('nav-policies').style.display = 'none';
        document.getElementById('nav-admin').style.display = 'none';
    },

    renderUserNavbar() {
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('nav-user-info').style.display = 'block';
        document.getElementById('nav-guest-info').style.display = 'none';
        document.getElementById('nav-username').textContent = this.state.user.username;
        document.getElementById('nav-role').textContent = this.formatRole(this.state.user.role);
        
        document.getElementById('nav-submit').style.display = this.state.user.role === 'government' ? 'inline' : 'none';
        document.getElementById('nav-policies').style.display = this.state.user.role === 'town_representative' ? 'inline' : 'none';
        document.getElementById('nav-admin').style.display = this.state.user.role === 'admin' ? 'inline' : 'none';
    },

    logout() {
        localStorage.removeItem('token');
        this.state.token = null;
        this.state.user = null;
        document.getElementById('nav-user-info').style.display = 'none';
        document.getElementById('nav-guest-info').style.display = 'block';
        this.navigate('#/dashboard');
    },

    navigate(hash) {
        window.location.hash = hash;
    },

    async router() {
        const hash = window.location.hash || '#/dashboard';
        const main = document.getElementById('main-content');
        main.innerHTML = ''; // Clear previous

        // Public routes
        if (hash === '#/login') {
            main.appendChild(document.getElementById('tpl-login').content.cloneNode(true));
            return;
        }
        if (hash === '#/register') {
            main.appendChild(document.getElementById('tpl-register').content.cloneNode(true));
            this.toggleTownInput();
            return;
        }

        // Shared routes (Publicly accessible)
        if (hash === '#/dashboard' || hash === '#/pending' || hash === '#/chain' || hash === '#/towns') {
            if (hash === '#/dashboard') {
                main.appendChild(document.getElementById('tpl-dashboard').content.cloneNode(true));
                await this.renderDashboard();
            } else if (hash === '#/pending') {
                main.appendChild(document.getElementById('tpl-pending').content.cloneNode(true));
                await this.renderPending();
            } else if (hash === '#/chain') {
                main.appendChild(document.getElementById('tpl-chain').content.cloneNode(true));
                await this.renderChain();
            } else if (hash === '#/towns') {
                main.appendChild(document.getElementById('tpl-towns').content.cloneNode(true));
                await this.renderTowns();
            }
            return;
        }

        // Protected routes
        if (!this.state.token || !this.state.user) {
            this.navigate('#/login');
            return;
        }

        if (hash === '#/submit' && this.state.user.role === 'government') {
            main.appendChild(document.getElementById('tpl-submit').content.cloneNode(true));
            await this.renderSubmit();
        } else if (hash === '#/policies' && this.state.user.role === 'town_representative') {
            main.appendChild(document.getElementById('tpl-policies').content.cloneNode(true));
            await this.renderPolicies();
        } else if (hash === '#/admin' && this.state.user.role === 'admin') {
            main.appendChild(document.getElementById('tpl-admin').content.cloneNode(true));
            await this.renderAdmin();
        }
    },

    toggleTownInput() {
        const role = document.getElementById('reg-role').value;
        const group = document.getElementById('reg-town-group');
        group.style.display = (role === 'town_representative') ? 'block' : 'none';
        document.getElementById('reg-town').required = (role === 'town_representative');
    },

    toggleContractParams() {
        // No longer needed as all policies use Standard Governance
    },

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;
        const town_name = document.getElementById('reg-town').value;

        try {
            const data = await this.api('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password, role, town_name })
            });
            const main = document.getElementById('main-content');
            main.innerHTML = '';
            main.appendChild(document.getElementById('tpl-private-key').content.cloneNode(true));
            document.getElementById('pk-text').value = data.private_key_enc;
        } catch (e) {}
    },

    copyPrivateKey() {
        const text = document.getElementById('pk-text');
        text.select();
        document.execCommand('copy');
        this.showToast('Private key copied!', 'success');
    },

    async handleLogin(e) {
        e.preventDefault();
        const params = new URLSearchParams();
        params.append('username', document.getElementById('log-username').value);
        params.append('password', document.getElementById('log-password').value);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });
            const data = await res.json();
            if (res.ok) {
                this.state.token = data.access_token;
                localStorage.setItem('token', data.access_token);
                await this.fetchProfile();
                this.navigate('#/dashboard');
            } else {
                this.showToast(data.detail, 'error');
            }
        } catch (e) {
            this.showToast('Login failed', 'error');
        }
    },

    renderSparkline(canvasId, data, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        // Destroy existing chart to prevent memory leaks if re-rendering
        if (ctx.chart) ctx.chart.destroy();
        ctx.chart = new Chart(ctx, {
            type: 'line',
            data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: color, borderWidth: 2, tension: 0.4, pointRadius: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, min: 0 } } }
        });
    },

    async renderDashboard() {
        this.showSkeleton('dash-recent-blocks', 3, 'text');
        this.showSkeleton('dash-recent-txs', 3, 'text');

        const blocks = await this.api('/blocks');
        const txs = await this.api('/transactions?status=pending');
        const towns = await this.api('/towns');

        document.getElementById('dash-blocks').textContent = blocks.length;
        document.getElementById('dash-pending').textContent = txs.length;
        
        let totalFunds = 0;
        towns.forEach(t => totalFunds += t.balance);
        document.getElementById('dash-funds').textContent = `Rp${totalFunds.toLocaleString('id-ID')}`;
        
        const bData = blocks.length === 0 ? [0, 0, 0] : [0, Math.max(1, blocks.length-2), blocks.length];
        this.renderSparkline('spark-blocks', bData, '#60a5fa');
        
        const pData = txs.length === 0 ? [0, 0, 0] : [0, txs.length+1, txs.length];
        this.renderSparkline('spark-pending', pData, '#f59e0b');
        
        const fData = totalFunds === 0 ? [0, 0, 0] : [0, totalFunds*0.5, totalFunds];
        this.renderSparkline('spark-funds', fData, '#34d399');
        
        this.renderSparkline('spark-activity', [0, 3, 1, 5, 2], '#c084fc');

        const recentBlocks = blocks.slice(0, 5);
        const blockContainer = document.getElementById('dash-recent-blocks');
        blockContainer.innerHTML = '';blockContainer.innerHTML = '';
        recentBlocks.forEach(b => {
            const div = document.createElement('div');
            div.className = 'feed-item';
            div.innerHTML = `<strong>Block #${b.index}</strong> - ${b.transactions.length} txns - <small>${new Date(b.timestamp + 'Z').toLocaleString()}</small>`;
            blockContainer.appendChild(div);
        });

        const recentTxs = txs.slice(0, 5);
        const txContainer = document.getElementById('dash-recent-txs');
        if (txContainer) txContainer.innerHTML = '';
        recentTxs.forEach(t => {
            const div = document.createElement('div');
            div.className = 'feed-item';
            const ruleText = t.contract_id ? 'Smart Policy' : `${t.signatures.length}/${t.required_validators} signed`;
            div.innerHTML = `<strong>Tx ${t.id.substring(0,8)}...</strong> - ${t.amount} funds to ${t.to_town_id.substring(0,8)}... - <small>${ruleText}</small>`;
            txContainer.appendChild(div);
        });

        const roleCard = document.getElementById('dash-role-stat-card');
        if (!this.state.user) {
            roleCard.style.display = 'none';
        } else {
            roleCard.style.display = 'block';
            document.getElementById('dash-role-stat-title').textContent = 'My Actions';
            document.getElementById('dash-role-stat').textContent = txs.filter(t => t.signatures.some(s => s.validator_id === this.state.user.id)).length;
        }

        // Render Chart
        const ctx = document.getElementById('fundsChart');
        if (ctx) {
            if (this.state.fundsChart) {
                this.state.fundsChart.destroy();
            }
            this.state.fundsChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: towns.map(t => t.name),
                    datasets: [{
                        label: 'Funds Received',
                        data: towns.map(t => t.balance),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    },

    async renderSubmit() {
        const towns = await this.api('/towns');
        const select = document.getElementById('tx-town');
        select.innerHTML = '<option value="">-- Select Town --</option>';
        towns.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            select.appendChild(opt);
        });

        select.onchange = async () => {
            const townId = select.value;
            const cSelect = document.getElementById('tx-contract');
            cSelect.innerHTML = '<option value="">-- Loading Policies... --</option>';
            
            try {
                const contracts = await this.api('/contracts');
                const townContracts = contracts.filter(c => c.to_town_id === townId);
                
                cSelect.innerHTML = '';
                if (townContracts.length === 0) {
                    cSelect.innerHTML = '<option value="">No policies defined for this town</option>';
                } else {
                    cSelect.innerHTML = '<option value="">-- Select a Policy --</option>';
                    townContracts.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id;
                        opt.textContent = `${c.name} (${c.contract_type})`;
                        cSelect.appendChild(opt);
                    });
                }
            } catch (e) {
                cSelect.innerHTML = '<option value="">Error loading policies</option>';
            }
        };
    },

    async renderPolicies() {
        const contracts = await this.api('/contracts');
        const list = document.getElementById('active-policies-list');
        list.innerHTML = '';
        
        // Show only policies for THIS town rep's town
        const myContracts = contracts.filter(c => c.to_town_id === this.state.user.town_id);
        
        if (myContracts.length === 0) list.innerHTML = '<p>You have not created any policies yet.</p>';
        
        myContracts.forEach(c => {
            const card = document.createElement('div');
            card.className = 'tx-card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${c.name}</strong>
                    <span class="badge badge-pending">${c.contract_type.charAt(0).toUpperCase() + c.contract_type.slice(1)}</span>
                </div>
                <div style="margin-top:0.5rem; font-size:0.85rem; color:var(--text-secondary)">
                    ${c.contract_type === 'governance' ? 'Requires 2 Signatures (Government & Town Rep)' : `Rules: ${c.params}`}
                </div>
            `;
            list.appendChild(card);
        });
    },

    async handleCreateContract(e) {
        e.preventDefault();
        const name = document.getElementById('ct-name').value;
        const contract_type = document.getElementById('ct-type').value;
        const to_town_id = this.state.user.town_id; // Automatically use the rep's town
        
        if (!to_town_id) {
            this.showToast('You must be assigned to a town to create policies', 'error');
            return;
        }
        const params = {}; // Standard Governance has no extra params

        try {
            await this.api('/contracts', {
                method: 'POST',
                body: JSON.stringify({ name, contract_type, params: JSON.stringify(params), to_town_id })
            });
            this.showToast('Smart Policy created successfully', 'success');
            this.router(); // Refresh
        } catch (e) {}
    },

    formatCurrencyInput(input) {
        let value = input.value.replace(/\D/g, '');
        if (value === '') {
            input.value = '';
            return;
        }
        input.value = parseInt(value, 10).toLocaleString('id-ID');
    },

    async handleSubmitTx(e) {
        e.preventDefault();
        const to_town_id = document.getElementById('tx-town').value;
        const rawAmount = document.getElementById('tx-amount').value.replace(/\./g, '');
        const amount = parseFloat(rawAmount);
        const description = document.getElementById('tx-desc').value;
        const contract_id = document.getElementById('tx-contract').value;

        if (!contract_id) {
            this.showToast('Please select a smart policy', 'error');
            return;
        }

        try {
            await this.api('/transactions', {
                method: 'POST',
                body: JSON.stringify({ to_town_id, amount, description, required_validators: 1, contract_id })
            });
            this.showToast('Transaction submitted successfully', 'success');
            this.navigate('#/pending');
        } catch (e) {
            console.error('Submission error:', e);
            // The toast is already shown by the this.api() helper
        }
    },

    async renderPending() {
        const txs = await this.api('/transactions?status=pending');
        const list = document.getElementById('pending-list');
        if (!list) return;
        list.innerHTML = '';
        if (txs.length === 0) { list.innerHTML = '<p>No pending transactions.</p>'; return; }
        
        txs.forEach(t => {
            const card = document.createElement('div');
            card.className = 'tx-card';
            
            let canSign = false;
            if (this.state.user) {
                if (this.state.user.role === 'government') {
                    canSign = true;
                } else if (this.state.user.role === 'town_representative' && this.state.user.town_id === t.to_town_id) {
                    canSign = true;
                }
            }

            let signButtonHtml = '';
            if (canSign) {
                const hasSigned = t.signatures.some(s => s.validator_id === this.state.user.id);
                if (!hasSigned) {
                    signButtonHtml = `<button class="btn btn-sm btn-primary" onclick="app.openSignModal('${t.id}', ${t.amount}, '${t.to_town_id}', '${t.created_at}')">Sign Transaction</button>`;
                } else {
                    signButtonHtml = `<span style="color:var(--success);font-size:0.8rem">✓ You signed</span>`;
                }
            }

            const ruleInfo = t.contract 
                ? `<div style="color:var(--accent); font-weight:bold;">📜 Policy: ${t.contract.name}</div>
                   <div style="font-size:0.75rem; margin-top:2px;">Type: ${t.contract.contract_type.charAt(0).toUpperCase() + t.contract.contract_type.slice(1)}</div>`
                : `Signatures: ${t.signatures.length} / ${t.required_validators}`;

            card.innerHTML = `
                <div class="tx-header">
                    <span>ID: ${t.id}</span>
                    <span class="badge badge-pending">Pending</span>
                </div>
                <div style="margin-bottom:0.5rem"><strong>Amount:</strong> <span class="tx-amount">Rp${t.amount.toLocaleString('id-ID')}</span></div>
                <div style="margin-bottom:0.5rem"><strong>Description:</strong> ${t.description}</div>
                <div style="margin-bottom:1rem; font-size:0.9rem; color:var(--text-secondary)">
                    ${ruleInfo}
                </div>
                <div>${signButtonHtml}</div>
            `;
            
            card.style.cursor = 'pointer';
            card.onclick = (e) => {
                if (e.target.tagName === 'BUTTON') return;
                app.showTxModal(`Transaction ${t.id.substring(0,8)}`, `
                    <b>Amount:</b> Rp${t.amount.toLocaleString('id-ID')}<br>
                    <b>To:</b> ${t.to_town_id}<br>
                    <b>Desc:</b> ${t.description}<br>
                    <b>Time:</b> ${new Date(t.created_at + 'Z').toLocaleString()}
                `);
            };
            
            list.appendChild(card);
        });
    },

    async renderChain(searchQuery = '') {
        const blocks = await this.api('/blocks');
        const list = document.getElementById('chain-list');
        if (!list) return;
        list.innerHTML = '';
        
        let filteredBlocks = blocks;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filteredBlocks = blocks.filter(b => b.hash.toLowerCase().includes(q) || b.index.toString() === q);
        }
        
        filteredBlocks.forEach(b => {
            const item = document.createElement('div');
            item.className = 'block-item';
            
            let txsHtml = b.transactions.map(t => `<div><b>Tx ${t.id.substring(0,8)}</b>: Rp${t.amount.toLocaleString('id-ID')} to ${t.to_town_id}</div>`).join('');
            if (!txsHtml) txsHtml = '<i>No transactions in this block</i>';

            item.innerHTML = `
                <div class="block-index">#${b.index}</div>
                <div class="block-content" style="cursor:pointer;" onclick="app.showTxModal('Block #${b.index} Transactions', \`${txsHtml}\`)">
                    <div style="display:flex;justify-content:space-between;margin-bottom:1rem">
                        <strong>Hash:</strong> <span title="${b.hash}">${b.hash.substring(0, 16)}...</span>
                        <small>${new Date(b.timestamp + 'Z').toLocaleString()}</small>
                    </div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">
                        <strong>Prev:</strong> ${b.previous_hash.substring(0,16)}...
                    </div>
                    <div><strong>${b.transactions.length} Transactions</strong> <small>(Click to view)</small></div>
                </div>
            `;
            list.appendChild(item);
        });
    },

    async validateChain() {
        try {
            const results = await this.api('/blocks/validate');
            const resDiv = document.getElementById('chain-validation-result');
            const invalid = results.filter(r => !r.is_valid);
            if (results.length === 0) {
                resDiv.innerHTML = `<div class="toast toast-info" style="position:static; margin-bottom:1rem; border-left-color:var(--accent);">Chain is empty. No blocks to validate yet.</div>`;
            } else if (invalid.length === 0) {
                resDiv.innerHTML = `<div class="toast toast-success" style="position:static; margin-bottom:1rem;">Chain is 100% valid. Cryptographic integrity verified.</div>`;
            } else {
                resDiv.innerHTML = `<div class="toast toast-error" style="position:static; margin-bottom:1rem;">WARNING: ${invalid.length} invalid blocks detected!</div>`;
            }
        } catch (e) {}
    },

    async renderTowns(searchQuery = '') {
        const towns = await this.api('/towns');
        const list = document.getElementById('towns-list');
        if (!list) return;
        list.innerHTML = '';
        
        let filteredTowns = towns;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filteredTowns = towns.filter(t => t.name.toLowerCase().includes(q));
        }
        
        filteredTowns.forEach(t => {
            const card = document.createElement('div');
            card.className = 'tx-card';
            card.innerHTML = `
                <h3 style="margin-bottom:1rem">${t.name}</h3>
                <div>Total Funds Received:</div>
                <div class="tx-amount">Rp${t.balance.toLocaleString('id-ID')}</div>
            `;
            list.appendChild(card);
        });
    },

    async renderAdmin() {
        const users = await this.api('/users');
        const tbody = document.getElementById('admin-users-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.username}</td>
                <td>${this.formatRole(u.role)}</td>
                <td>${new Date(u.created_at + 'Z').toLocaleDateString()}</td>
                <td><code style="font-size:0.75rem">${u.public_key.substring(0,16)}...</code></td>
            `;
            tbody.appendChild(tr);
        });
    },

    showTxModal(title, bodyHtml) {
        document.getElementById('modal-tx-title').textContent = title;
        document.getElementById('modal-tx-body').innerHTML = bodyHtml;
        document.getElementById('tx-modal').classList.remove('hidden');
    },

    async exportToCSV(type) {
        if (type === 'towns') {
            const towns = await this.api('/towns');
            if (towns.length === 0) {
                this.showToast('No data available to export.', 'error');
                return;
            }
            const csvRows = ['ID,Name,Balance'];
            towns.forEach(t => csvRows.push(`${t.id},"${t.name}",${t.balance}`));
            const csvData = csvRows.join('\n');
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'towns_export.csv';
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('Export successful!', 'success');
        }
    },

    openSignModal(id, amount, to_town_id, created_at) {
        this.state.currentTxToSign = { id, amount, to_town_id, created_at };
        document.body.appendChild(document.getElementById('tpl-sign-modal').content.cloneNode(true));
    },

    closeSignModal() {
        this.state.currentTxToSign = null;
        document.getElementById('sign-modal').remove();
    },

    async confirmSign() {
        const pk = document.getElementById('sign-pk').value.trim();
        if (!pk) return;
        
        const tx = this.state.currentTxToSign;
        const amountStr = tx.amount % 1 === 0 ? tx.amount + '.0' : tx.amount.toString();
        const message = `txn:${tx.id}:${amountStr}:${tx.to_town_id}:${tx.created_at}`;
        
        try {
            // Buffer helper for browser using standard TextEncoder
            const msgBytes = new TextEncoder().encode(message);
            // Sign using @noble/ed25519
            const signatureBytes = await window.nobleEd25519.sign(msgBytes, pk);
            
            // Convert to base64 safely
            const signatureB64 = btoa(String.fromCharCode(...signatureBytes));

            await this.api(`/transactions/${tx.id}/sign`, {
                method: 'POST',
                body: JSON.stringify({ signature: signatureB64 })
            });

            this.showToast('Transaction signed successfully', 'success');
            this.closeSignModal();
            this.router();
        } catch (e) {
            console.error(e);
            this.showToast('Failed to sign transaction. Invalid private key.', 'error');
        }
    }
};

window.onload = () => app.init();
