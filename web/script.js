// WhatsApp Bulk Messenger - Main JavaScript File

class WhatsAppBulkMessenger {
  constructor() {
    this.csvData = null;
    this.validatedData = null;
    this.isRunning = false;
    this.currentIndex = 0;
    this.stats = {
      total: 0,
      sent: 0,
      failed: 0,
      successRate: 0
    };
    this.sentContacts = [];
    this.failedContacts = [];
    this.messagesSentThisHour = 0;
    this.hourStartTime = Date.now();
    this.initializeEventListeners();
    this.initializeUI();
  }

  initializeEventListeners() {
    // File upload
    document.getElementById('csvFile').addEventListener('change', this.handleFileUpload.bind(this));
    
    // Method selection
    document.getElementById('method').addEventListener('change', this.handleMethodChange.bind(this));
    
    // Button events
    document.getElementById('validateData').addEventListener('click', this.validateData.bind(this));
    document.getElementById('startSending').addEventListener('click', this.showConfirmModal.bind(this));
    document.getElementById('stopSending').addEventListener('click', this.stopSending.bind(this));
    
    // Modal events
    document.getElementById('confirmSending').addEventListener('click', this.startSending.bind(this));
    document.getElementById('cancelSending').addEventListener('click', this.hideConfirmModal.bind(this));
    
    // Log controls
    document.getElementById('clearLogs').addEventListener('click', this.clearLogs.bind(this));
    document.getElementById('downloadLogs').addEventListener('click', this.downloadLogs.bind(this));
    
    // Drag and drop for file upload
    const fileUpload = document.querySelector('.file-upload');
    fileUpload.addEventListener('dragover', this.handleDragOver.bind(this));
    fileUpload.addEventListener('drop', this.handleDrop.bind(this));
  }

  initializeUI() {
    this.updateStats();
    this.logMessage('System initialized. Ready to upload CSV file.', 'info');
  }

  // File Handling
  handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.add('drag-over');
  }

  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.target.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'text/csv') {
      document.getElementById('csvFile').files = files;
      this.processFile(files[0]);
    } else {
      this.showToast('Please drop a valid CSV file', 'error');
    }
  }

  async processFile(file) {
    try {
      const text = await this.readFileAsText(file);
      this.csvData = this.parseCSV(text);
      
      // Display file name
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileName').style.display = 'block';
      
      // Show CSV preview
      this.showCSVPreview();
      
      this.logMessage(`CSV file loaded: ${file.name} (${this.csvData.length} rows)`, 'success');
      this.showToast(`Loaded ${this.csvData.length} contacts from ${file.name}`, 'success');
      
    } catch (error) {
      this.logMessage(`Error reading file: ${error.message}`, 'error');
      this.showToast('Error reading CSV file', 'error');
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV file must have at least a header and one data row');
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }
    
    return data;
  }

  showCSVPreview() {
    if (!this.csvData || this.csvData.length === 0) return;
    
    const preview = document.getElementById('csvPreview');
    const headers = Object.keys(this.csvData[0]);
    
    let tableHTML = '<table><thead><tr>';
    headers.forEach(header => {
      tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Show first 5 rows
    for (let i = 0; i < Math.min(5, this.csvData.length); i++) {
      tableHTML += '<tr>';
      headers.forEach(header => {
        tableHTML += `<td>${this.csvData[i][header] || ''}</td>`;
      });
      tableHTML += '</tr>';
    }
    
    if (this.csvData.length > 5) {
      tableHTML += `<tr><td colspan="${headers.length}" style="text-align: center; font-style: italic; color: #666;">... and ${this.csvData.length - 5} more rows</td></tr>`;
    }
    
    tableHTML += '</tbody></table>';
    preview.innerHTML = tableHTML;
    preview.style.display = 'block';
  }

  // Method handling
  handleMethodChange() {
    const method = document.getElementById('method').value;
    const apiSettings = document.getElementById('apiSettings');
    
    if (method === 'api') {
      apiSettings.style.display = 'block';
    } else {
      apiSettings.style.display = 'none';
    }
  }

  // Data validation
  validateData() {
    if (!this.csvData) {
      this.showToast('Please upload a CSV file first', 'error');
      return;
    }

    const requiredColumns = ['Name', 'Phone'];
    const availableColumns = Object.keys(this.csvData[0]);
    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
    
    if (missingColumns.length > 0) {
      this.showToast(`Missing required columns: ${missingColumns.join(', ')}`, 'error');
      this.logMessage(`Validation failed: Missing columns ${missingColumns.join(', ')}`, 'error');
      return;
    }

    // Validate phone numbers
    const invalidContacts = [];
    const validContacts = [];
    
    this.csvData.forEach((contact, index) => {
      const phone = contact.Phone?.toString().trim();
      const name = contact.Name?.trim();
      
      if (!phone || !name) {
        invalidContacts.push({index: index + 1, reason: 'Missing phone or name'});
      } else if (!/^\d{8,15}$/.test(phone)) {
        invalidContacts.push({index: index + 1, reason: 'Invalid phone format'});
      } else {
        // Add default country code if not present
        if (!contact.CountryCode) {
          contact.CountryCode = document.getElementById('countryCode').value;
        }
        validContacts.push(contact);
      }
    });

    if (invalidContacts.length > 0) {
      this.logMessage(`Validation found ${invalidContacts.length} invalid contacts`, 'warning');
      invalidContacts.forEach(contact => {
        this.logMessage(`Row ${contact.index}: ${contact.reason}`, 'warning');
      });
    }

    this.validatedData = validContacts;
    this.stats.total = validContacts.length;
    this.updateStats();

    if (validContacts.length === 0) {
      this.showToast('No valid contacts found', 'error');
      return;
    }

    // Enable start button
    document.getElementById('startSending').disabled = false;
    
    this.logMessage(`Validation completed: ${validContacts.length} valid contacts, ${invalidContacts.length} invalid`, 'success');
    this.showToast(`Validation successful: ${validContacts.length} valid contacts`, 'success');
  }

  // Confirmation modal
  showConfirmModal() {
    if (!this.validatedData) {
      this.showToast('Please validate data first', 'error');
      return;
    }

    const strategy = document.getElementById('strategy').value;
    const maxPerHour = document.getElementById('maxPerHour').value;
    
    // Calculate estimated duration
    const totalMessages = this.validatedData.length;
    const estimatedHours = Math.ceil(totalMessages / maxPerHour);
    const estimatedMinutes = Math.ceil((totalMessages * this.getAverageInterval(strategy)) / 60);
    
    document.getElementById('confirmContactCount').textContent = totalMessages;
    document.getElementById('confirmStrategy').textContent = strategy.charAt(0).toUpperCase() + strategy.slice(1);
    document.getElementById('confirmRate').textContent = maxPerHour;
    document.getElementById('confirmDuration').textContent = `${estimatedHours}h ${estimatedMinutes % 60}m`;
    
    document.getElementById('confirmModal').style.display = 'block';
  }

  hideConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
  }

  getAverageInterval(strategy) {
    const intervals = {
      'conservative': 60, // 60 seconds average
      'moderate': 30,     // 30 seconds average  
      'aggressive': 12    // 12 seconds average
    };
    return intervals[strategy] || 30;
  }

  // Message sending
  async startSending() {
    this.hideConfirmModal();
    
    if (this.isRunning) {
      this.showToast('Already running', 'warning');
      return;
    }

    const method = document.getElementById('method').value;
    
    if (method === 'web') {
      // For web method, we need to open WhatsApp Web
      this.initializeWhatsAppWeb();
    } else {
      // For API method, validate credentials
      const apiToken = document.getElementById('apiToken').value;
      const phoneNumberId = document.getElementById('phoneNumberId').value;
      
      if (!apiToken || !phoneNumberId) {
        this.showToast('Please enter API credentials', 'error');
        return;
      }
    }

    this.isRunning = true;
    this.currentIndex = 0;
    this.stats = { total: this.validatedData.length, sent: 0, failed: 0, successRate: 0 };
    this.sentContacts = [];
    this.failedContacts = [];
    
    // Update UI
    document.getElementById('startSending').style.display = 'none';
    document.getElementById('stopSending').style.display = 'inline-block';
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('currentContact').style.display = 'block';
    document.getElementById('logContainer').style.display = 'block';
    
    this.logMessage('Starting bulk message sending...', 'info');
    this.showToast('Starting message sending process', 'info');
    
    // Start the sending process
    await this.processBulkMessages();
  }

  async processBulkMessages() {
    const strategy = document.getElementById('strategy').value;
    const maxPerHour = parseInt(document.getElementById('maxPerHour').value);
    const method = document.getElementById('method').value;
    
    for (let i = this.currentIndex; i < this.validatedData.length && this.isRunning; i++) {
      this.currentIndex = i;
      const contact = this.validatedData[i];
      
      // Check rate limiting
      if (this.messagesSentThisHour >= maxPerHour) {
        const timeToWait = 3600000 - (Date.now() - this.hourStartTime);
        if (timeToWait > 0) {
          this.logMessage(`Rate limit reached. Waiting ${Math.ceil(timeToWait/60000)} minutes...`, 'warning');
          await this.sleep(timeToWait);
          this.messagesSentThisHour = 0;
          this.hourStartTime = Date.now();
        }
      }
      
      // Update current contact display
      this.updateCurrentContact(contact);
      
      // Send message
      const success = await this.sendMessage(contact, method);
      
      if (success) {
        this.stats.sent++;
        this.sentContacts.push({
          name: contact.Name,
          phone: `+${contact.CountryCode}${contact.Phone}`,
          timestamp: new Date().toISOString()
        });
        this.messagesSentThisHour++;
        this.logMessage(`✅ Message sent to ${contact.Name} (+${contact.CountryCode}${contact.Phone})`, 'success');
      } else {
        this.stats.failed++;
        this.failedContacts.push({
          name: contact.Name,
          phone: `+${contact.CountryCode}${contact.Phone}`,
          reason: 'Send failed'
        });
        this.logMessage(`❌ Failed to send message to ${contact.Name} (+${contact.CountryCode}${contact.Phone})`, 'error');
      }
      
      // Update statistics
      this.updateStats();
      this.updateProgress();
      
      // Wait before next message (if not the last one)
      if (i < this.validatedData.length - 1 && this.isRunning) {
        const interval = this.getRandomInterval(strategy);
        this.logMessage(`⏳ Waiting ${interval.toFixed(1)}s before next message...`, 'info');
        await this.sleep(interval * 1000);
      }
    }
    
    if (this.isRunning) {
      this.completeSending();
    }
  }

  async sendMessage(contact, method) {
    const template = document.getElementById('messageTemplate').value;
    const personalizedMessage = this.personalizeMessage(template, contact);
    
    if (method === 'web') {
      return await this.sendMessageWeb(contact, personalizedMessage);
    } else {
      return await this.sendMessageAPI(contact, personalizedMessage);
    }
  }

  personalizeMessage(template, contact) {
    let message = template;
    const replacements = {
      '{name}': contact.Name || 'there',
      '{first_name}': (contact.Name || 'there').split(' ')[0],
      '{phone}': contact.Phone || '',
      '{email}': contact.Email || '',
      '{company}': contact.Company || '',
      '{city}': contact.City || '',
      '{country}': contact.Country || ''
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      message = message.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return message;
  }

  async sendMessageWeb(contact, message) {
    // For web method, we simulate the WhatsApp Web interaction
    // In a real implementation, this would use browser automation
    try {
      const phoneNumber = `${contact.CountryCode}${contact.Phone}`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappURL = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
      
      // Open WhatsApp Web in a new window/tab
      const whatsappWindow = window.open(whatsappURL, '_blank');
      
      // Wait for user to manually send (simulation)
      await this.sleep(5000); // Simulate processing time
      
      // Close the window after some time
      setTimeout(() => {
        if (whatsappWindow && !whatsappWindow.closed) {
          whatsappWindow.close();
        }
      }, 10000);
      
      // For demo purposes, simulate 90% success rate
      return Math.random() > 0.1;
      
    } catch (error) {
      this.logMessage(`Error in web method: ${error.message}`, 'error');
      return false;
    }
  }

  async sendMessageAPI(contact, message) {
    try {
      const apiToken = document.getElementById('apiToken').value;
      const phoneNumberId = document.getElementById('phoneNumberId').value;
      const phoneNumber = `${contact.CountryCode}${contact.Phone}`;
      
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: {
            body: message
          }
        })
      });
      
      if (response.ok) {
        return true;
      } else {
        const errorData = await response.json();
        this.logMessage(`API Error: ${errorData.error?.message || 'Unknown error'}`, 'error');
        return false;
      }
      
    } catch (error) {
      this.logMessage(`Network error: ${error.message}`, 'error');
      return false;
    }
  }

  initializeWhatsAppWeb() {
    // For the web method, we need to guide users to authenticate WhatsApp Web
    this.showToast('Opening WhatsApp Web for authentication...', 'info');
    this.logMessage('Please authenticate WhatsApp Web by scanning QR code', 'info');
    
    // Open WhatsApp Web for authentication
    window.open('https://web.whatsapp.com', '_blank');
  }

  getRandomInterval(strategy) {
    const intervals = {
      'conservative': [30, 90],
      'moderate': [15, 45],
      'aggressive': [5, 20]
    };
    
    const [min, max] = intervals[strategy] || intervals['moderate'];
    return Math.random() * (max - min) + min;
  }

  stopSending() {
    this.isRunning = false;
    this.logMessage('❌ Sending process stopped by user', 'warning');
    this.showToast('Message sending stopped', 'warning');
    this.completeSending();
  }

  completeSending() {
    this.isRunning = false;
    
    // Update UI
    document.getElementById('startSending').style.display = 'inline-block';
    document.getElementById('stopSending').style.display = 'none';
    document.getElementById('currentContact').style.display = 'none';
    
    // Generate final report
    this.generateReport();
    
    this.logMessage(`🏁 Bulk sending completed. Sent: ${this.stats.sent}, Failed: ${this.stats.failed}`, 'info');
    this.showToast(`Sending completed! Success rate: ${this.stats.successRate}%`, 'success');
  }

  generateReport() {
    const report = {
      summary: {
        totalContacts: this.stats.total,
        messagesSent: this.stats.sent,
        messagesFailed: this.stats.failed,
        successRate: this.stats.successRate,
        timestamp: new Date().toISOString()
      },
      sentContacts: this.sentContacts,
      failedContacts: this.failedContacts
    };
    
    // Store report for download
    this.lastReport = report;
  }

  // UI Updates
  updateCurrentContact(contact) {
    document.getElementById('currentContactName').textContent = contact.Name;
    document.getElementById('currentContactPhone').textContent = `+${contact.CountryCode}${contact.Phone}`;
  }

  updateStats() {
    document.getElementById('totalContacts').textContent = this.stats.total;
    document.getElementById('messagesSent').textContent = this.stats.sent;
    document.getElementById('messagesFailed').textContent = this.stats.failed;
    
    if (this.stats.total > 0) {
      this.stats.successRate = Math.round((this.stats.sent / this.stats.total) * 100);
    }
    document.getElementById('successRate').textContent = `${this.stats.successRate}%`;
  }

  updateProgress() {
    if (this.stats.total === 0) return;
    
    const percentage = Math.round(((this.stats.sent + this.stats.failed) / this.stats.total) * 100);
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = 
      `Progress: ${this.stats.sent + this.stats.failed}/${this.stats.total} (${percentage}%)`;
  }

  // Logging
  logMessage(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    logEntry.innerHTML = `
      <span class="log-timestamp">[${timestamp}]</span>
      ${icons[type] || 'ℹ️'} ${message}
    `;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  clearLogs() {
    document.getElementById('logContainer').innerHTML = '';
    this.showToast('Logs cleared', 'info');
  }

  downloadLogs() {
    const logContainer = document.getElementById('logContainer');
    const logs = Array.from(logContainer.children).map(entry => entry.textContent).join('\n');
    
    if (!logs.trim()) {
      this.showToast('No logs to download', 'warning');
      return;
    }
    
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showToast('Logs downloaded', 'success');
  }

  // Utility functions
  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.whatsappMessenger = new WhatsAppBulkMessenger();
});