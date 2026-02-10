// Dashboard State
let selectedExtensionId = null;
let historyChart = null;
let extensions = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await loadExtensions();
  await loadDashboardStats();
  await loadRecentChanges();
  await loadEmailConfig();
  setupEventListeners();
  checkSchedulerStatus();
  
  // Auto-refresh UI after monitoring cycle completes (runs on app start)
  // Wait for monitoring cycle to complete and update UI
  setTimeout(async () => {
    console.log('Auto-refreshing UI...');
    await loadExtensions();
    await loadDashboardStats();
    await loadRecentChanges();
  }, 5000);
});

// Setup Event Listeners
function setupEventListeners() {
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', async () => {
    await window.electronAPI.runCheckNow();
    await loadExtensions();
    await loadDashboardStats();
    await loadRecentChanges();
    if (selectedExtensionId) {
      await showExtensionDetails(selectedExtensionId);
    }
  });

  // Add extension button
  document.getElementById('add-extension-btn').addEventListener('click', () => {
    document.getElementById('add-modal').classList.add('active');
  });

  // Modal close
  document.querySelector('.modal-close').addEventListener('click', () => {
    document.getElementById('add-modal').classList.remove('active');
  });

  document.getElementById('cancel-add').addEventListener('click', () => {
    document.getElementById('add-modal').classList.remove('active');
  });

  // Add extension form
  document.getElementById('add-extension-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('extension-url').value;
    await addExtension(url);
    document.getElementById('add-modal').classList.remove('active');
    document.getElementById('add-extension-form').reset();
  });

  // Scheduler toggle
  document.getElementById('scheduler-toggle').addEventListener('change', async (e) => {
    const result = await window.electronAPI.toggleScheduler();
    updateSchedulerStatus(result.running);
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Chart timerange
  document.getElementById('chart-timerange').addEventListener('change', async (e) => {
    if (selectedExtensionId) {
      await updateChart(selectedExtensionId, parseInt(e.target.value));
    }
  });

  // Settings form
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = {
      interval: document.getElementById('interval-input').value,
      emailEnabled: document.getElementById('email-enabled').checked,
      notifyOnChange: document.getElementById('notify-on-change').checked
    };
    const result = await window.electronAPI.updateConfig(config);
    alert(result.message);
  });

  // Email config form
  document.getElementById('email-config-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailConfig = {
      emailSender: document.getElementById('email-sender').value,
      emailPassword: document.getElementById('email-password').value,
      emailRecipient: document.getElementById('email-recipient').value,
      emailService: 'gmail'
    };
    
    if (!emailConfig.emailSender || !emailConfig.emailPassword || !emailConfig.emailRecipient) {
      alert('Please fill in all email fields');
      return;
    }
    
    const result = await window.electronAPI.updateEmailConfig(emailConfig);
    const statusMsg = document.getElementById('email-status-msg');
    statusMsg.textContent = result.success ? '✓ Saved!' : '✗ Error saving config';
    statusMsg.style.color = result.success ? '#28a745' : '#dc3545';
    
    if (result.success) {
      setTimeout(() => {
        statusMsg.textContent = '';
        // Reload config to verify
        loadEmailConfig();
      }, 2000);
    }
  });

  // Listen for refresh events from main process
  window.electronAPI.onRefreshData(async () => {
    await loadExtensions();
    await loadDashboardStats();
    await loadRecentChanges();
    if (selectedExtensionId) {
      await showExtensionDetails(selectedExtensionId);
    }
  });
}

// Load Extensions
async function loadExtensions() {
  extensions = await window.electronAPI.getExtensions();
  const container = document.getElementById('extensions-list');
  
  if (extensions.length === 0) {
    container.innerHTML = '<div class="empty-state">No extensions tracked yet</div>';
    return;
  }

  container.innerHTML = extensions.map(ext => `
    <div class="extension-item ${selectedExtensionId === ext.id ? 'active' : ''}" data-id="${ext.id}">
      <div class="extension-info">
        <div class="extension-name">${escapeHtml(ext.name)}</div>
        <div class="extension-stats">
          <span>👥 ${ext.users || 0}</span>
          <span>⭐ ${ext.rating || 0}</span>
          <span>💬 ${ext.reviews || 0}</span>
        </div>
      </div>
      <button class="delete-btn" data-id="${ext.id}" title="Remove">🗑️</button>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.extension-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (!e.target.classList.contains('delete-btn')) {
        const id = parseInt(item.dataset.id);
        await showExtensionDetails(id);
      }
    });
  });

  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to remove this extension?')) {
        const id = parseInt(btn.dataset.id);
        await window.electronAPI.deleteExtension(id);
        await loadExtensions();
        if (selectedExtensionId === id) {
          selectedExtensionId = null;
          document.getElementById('extension-grid').innerHTML = '<div class="empty-state">Select an extension from the sidebar</div>';
        }
      }
    });
  });
}

// Show Extension Details
async function showExtensionDetails(extensionId) {
  selectedExtensionId = extensionId;
  
  // Update active state
  document.querySelectorAll('.extension-item').forEach(item => {
    item.classList.toggle('active', parseInt(item.dataset.id) === extensionId);
  });

  const stats = await window.electronAPI.getExtensionStats(extensionId);
  const container = document.getElementById('extension-grid');
  
  container.innerHTML = `
    <div class="extension-detail-card">
      <h2>${escapeHtml(stats.extension.name)}</h2>
      <a href="${escapeHtml(stats.extension.url)}" class="extension-url" target="_blank">View on Chrome Stats →</a>
      
      ${stats.latest ? `
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-icon">👥</div>
            <div class="stat-value">${stats.latest.users}</div>
            <div class="stat-label">Users</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">⭐</div>
            <div class="stat-value">${stats.latest.rating}</div>
            <div class="stat-label">Rating</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">💬</div>
            <div class="stat-value">${stats.latest.reviews}</div>
            <div class="stat-label">Reviews</div>
          </div>
          <div class="stat-box">
            <div class="stat-icon">📊</div>
            <div class="stat-value">${stats.totalChanges}</div>
            <div class="stat-label">Total Changes</div>
          </div>
        </div>
        
        <div class="last-checked">
          Last checked: ${new Date(stats.latest.snapshot_time).toLocaleString()}
        </div>
      ` : '<p>No data available yet</p>'}
    </div>
  `;

  // Update chart
  await updateChart(extensionId, 168);
}

// Update Chart
async function updateChart(extensionId, hours) {
  const history = await window.electronAPI.getExtensionHistory(extensionId, hours);
  const ctx = document.getElementById('history-chart');
  
  if (historyChart) {
    historyChart.destroy();
  }

  // Ensure canvas parent is visible and has dimensions
  const container = ctx.parentElement;
  if (container && container.offsetHeight === 0) {
    console.warn('Chart container has no height, delaying render');
    return;
  }

  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(h => new Date(h.snapshot_time).toLocaleDateString()),
      datasets: [
        {
          label: 'Users',
          data: history.map(h => h.users),
          borderColor: '#0366d6',
          backgroundColor: 'rgba(3, 102, 214, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'Rating',
          data: history.map(h => h.rating),
          borderColor: '#ffd700',
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          yAxisID: 'y1'
        },
        {
          label: 'Reviews',
          data: history.map(h => h.reviews),
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Users / Reviews'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Rating'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
  
  // Force resize after initialization to ensure proper dimensions
  if (historyChart) {
    setTimeout(() => {
      historyChart.resize();
    }, 50);
  }
}

// Load Dashboard Stats
async function loadDashboardStats() {
  const extensions = await window.electronAPI.getExtensions();
  const changes = await window.electronAPI.getRecentChanges(1000);
  
  // Calculate stats
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const changesLast24h = changes.filter(c => new Date(c.detected_at) > yesterday).length;
  
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const activeExtensions = extensions.filter(e => e.last_checked && new Date(e.last_checked) > twoHoursAgo).length;
  
  document.getElementById('total-extensions').textContent = extensions.length;
  document.getElementById('total-changes').textContent = changesLast24h;
  document.getElementById('active-monitoring').textContent = activeExtensions;
}

// Load Email Config
async function loadEmailConfig() {
  try {
    const config = await window.electronAPI.getConfig();
    
    document.getElementById('email-service').value = config.emailService || 'gmail';
    document.getElementById('email-sender').value = config.emailSender !== 'Not configured' ? config.emailSender : '';
    document.getElementById('email-recipient').value = config.emailRecipient !== 'Not configured' ? config.emailRecipient : '';
    // Don't populate password field for security
    document.getElementById('email-password').value = '';
    
  } catch (error) {
    console.error('Failed to load email config:', error);
  }
}

// Load Recent Changes
async function loadRecentChanges() {
  const changes = await window.electronAPI.getRecentChanges(50);
  const container = document.getElementById('changes-list');
  
  if (changes.length === 0) {
    container.innerHTML = '<div class="empty-state">No changes detected yet</div>';
    return;
  }

  container.innerHTML = changes.map(change => `
    <div class="change-item">
      <div class="change-header">
        <strong>${escapeHtml(change.extension_name)}</strong>
        <span class="change-time">${new Date(change.detected_at).toLocaleString()}</span>
      </div>
      <div class="change-detail">
        <span class="change-type">${change.change_type}</span>
        <span class="change-values">${change.old_value} → ${change.new_value}</span>
      </div>
    </div>
  `).join('');
}

// Add Extension
async function addExtension(url) {
  // For now, just add the profile URL
  // The monitoring cycle will discover all extensions on that page
  await window.electronAPI.addExtension('Chrome Stats Profile', url);
  await window.electronAPI.runCheckNow();
  await loadExtensions();
  await loadDashboardStats();
}

// Switch Tab
function switchTab(tabName) {
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update content
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabName}-tab`);
  });

  // Load tab-specific data
  if (tabName === 'settings') {
    loadSettings();
  } else if (tabName === 'charts' && selectedExtensionId) {
    // Delay chart update to allow browser to render visible container
    setTimeout(() => {
      updateChart(selectedExtensionId, 168);
    }, 150);
  }
}

// Load Settings
async function loadSettings() {
  try {
    const config = await window.electronAPI.getConfig();
    const intervalInput = document.getElementById('interval-input');
    const emailEnabledCheckbox = document.getElementById('email-enabled');
    const notifyOnChangeCheckbox = document.getElementById('notify-on-change');
    
    if (intervalInput) intervalInput.value = config.interval;
    if (emailEnabledCheckbox) emailEnabledCheckbox.checked = config.emailEnabled;
    if (notifyOnChangeCheckbox) notifyOnChangeCheckbox.checked = config.notifyOnChange;
    
    // Also load email config
    await loadEmailConfig();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Check Scheduler Status
async function checkSchedulerStatus() {
  try {
    const status = await window.electronAPI.getSchedulerStatus();
    const toggleEl = document.getElementById('scheduler-toggle');
    if (toggleEl) {
      toggleEl.checked = status.running;
      updateSchedulerStatus(status.running);
    }
  } catch (error) {
    console.error('Failed to check scheduler status:', error);
  }
}

// Update Scheduler Status
function updateSchedulerStatus(running) {
  const statusText = document.getElementById('scheduler-status');
  statusText.textContent = running ? 'Monitoring Active' : 'Monitoring Paused';
  statusText.style.color = running ? '#28a745' : '#ffc107';
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
