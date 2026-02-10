const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

/**
 * Initialize email transporter
 */
function initializeEmailService() {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const senderEmail = process.env.EMAIL_SENDER;
  const senderPassword = process.env.EMAIL_PASSWORD;
  
  logger.info(`[EMAIL] Initializing email service with EMAIL_SERVICE="${emailService}"`);
  logger.info(`[EMAIL] EMAIL_SENDER: ${senderEmail ? `"${senderEmail}"` : 'NOT SET'}`);
  logger.info(`[EMAIL] EMAIL_PASSWORD: ${senderPassword ? 'SET (hidden)' : 'NOT SET'}`);
  logger.info(`[EMAIL] EMAIL_RECIPIENT: ${process.env.EMAIL_RECIPIENT ? `"${process.env.EMAIL_RECIPIENT}"` : 'NOT SET'}`);

  if (!senderEmail || !senderPassword) {
    logger.warn('[EMAIL] ❌ Email credentials not configured. Email notifications disabled.');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      service: emailService,
      auth: {
        user: senderEmail,
        pass: senderPassword
      }
    });

    logger.info('Email service initialized successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to initialize email service: ${error.message}`);
    return false;
  }
}

/**
 * Send change notification email for a single extension
 */
async function sendExtensionNotification(extensionName, extensionUrl, changes, isInitial = false) {
  logger.info(`[EMAIL] sendExtensionNotification called for "${extensionName}" (isInitial=${isInitial})`);
  
  if (!transporter) {
    logger.warn('[EMAIL] ❌ Email service not initialized - transporter is null');
    return false;
  }
  logger.info('[EMAIL] ✓ Email service transporter is initialized');

  const recipient = process.env.EMAIL_RECIPIENT;
  logger.info(`[EMAIL] EMAIL_RECIPIENT configured: ${recipient ? `"${recipient}"` : 'NOT SET'}`);
  
  if (!recipient) {
    logger.warn('[EMAIL] ❌ Email recipient not configured - EMAIL_RECIPIENT environment variable is missing');
    return false;
  }
  logger.info('[EMAIL] ✓ Email recipient is configured');

  try {
    // Build change list
    const changesList = Object.entries(changes)
      .map(([key, change]) => `  • ${change.label}`)
      .join('\n');

    // Build metrics HTML with styling similar to Chrome-Stats
    const metricsHtml = Object.entries(changes)
      .map(([key, changeData]) => {
        let icon = '📊';
        if (key === 'users') icon = '👥';
        if (key === 'rating') icon = '⭐';
        if (key === 'reviews') icon = '💬';
        
        // For initial notification, show only current values
        const valueDisplay = isInitial 
          ? `<strong style="color: #26a742;">${changeData.new}</strong>`
          : `<strong>${changeData.old}</strong> → <strong style="color: #26a742;">${changeData.new}</strong>
              <span style="color: #0366d6; font-weight: bold; margin-left: 8px;">
                ${changeData.diff > 0 ? '+' : ''}${changeData.diff}
              </span>`;
        
        return `
          <tr>
            <td style="padding: 12px; text-align: left; color: #666; font-weight: 500;">
              ${icon} ${key.charAt(0).toUpperCase() + key.slice(1)}
            </td>
            <td style="padding: 12px; text-align: left;">
              ${valueDisplay}
            </td>
          </tr>
        `;
      })
      .join('\n');

    const headerTitle = isInitial ? 'Chrome Stats Baseline' : 'Chrome Stats Update';
    const headerSubtitle = isInitial ? 'Initial Extension Tracking Started' : 'Extension Changes Detected';

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0366d6 0%, #6f42c1 100%); padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">${headerTitle}</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${headerSubtitle}</p>
        </div>
        
        <div style="border: 1px solid #e1e4e8; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <h3 style="margin: 0 0 15px 0; color: #24292e; font-size: 18px;">
            <a href="${extensionUrl}" style="color: #0366d6; text-decoration: none;">${extensionName}</a>
          </h3>
          
          ${isInitial ? '<p style="color: #586069; margin: 0 0 15px 0;">✅ Now monitoring this extension for changes</p>' : ''}
          
          <div style="background: #f6f8fa; border-radius: 6px; overflow: hidden; margin: 15px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              ${metricsHtml}
            </table>
          </div>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e4e8;">
            <p style="margin: 0; color: #586069; font-size: 12px;">
              <strong>${isInitial ? 'Monitoring Started' : 'Detected'}:</strong> ${new Date().toLocaleString()}
            </p>
            <p style="margin: 10px 0 0 0; color: #586069; font-size: 12px;">
              <strong>URL:</strong> <a href="${extensionUrl}" style="color: #0366d6; text-decoration: none;">${extensionUrl}</a>
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e1e4e8; color: #586069; font-size: 12px;">
          <p>Chrome Stats Monitor - Automated Extension Tracking</p>
        </div>
      </div>
    `;

    const textContent = `
╔═══════════════════════════════════════╗
║     ${isInitial ? 'Chrome Stats Baseline' : 'Chrome Stats Update Report'}        ║
╚═══════════════════════════════════════╝

Extension: ${extensionName}
URL: ${extensionUrl}

Changes Detected:
${changesList}

Detected at: ${new Date().toLocaleString()}
    `.trim();

    const subject = isInitial 
      ? `${extensionName} - Monitoring Started`
      : `${extensionName} - Changes Detected`;

    const mailOptions = {
      from: process.env.EMAIL_SENDER,
      to: recipient,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    logger.info(`[EMAIL] Attempting to send email to ${recipient} with subject: "${subject}"`);
    const result = await transporter.sendMail(mailOptions);
    logger.info(`[EMAIL] ✅ Email sent successfully for ${extensionName}${isInitial ? ' (initial)' : ''}`);
    logger.debug(`[EMAIL] Email result:`, result);
    return true;
  } catch (error) {
    logger.error(`[EMAIL] ❌ Failed to send email for ${extensionName}: ${error.message}`);
    logger.error(`[EMAIL] Error stack:`, error.stack);
    return false;
  }
}

/**
 * Send batch notification email with all recent changes
 */
async function sendBatchNotification(extensionChanges) {
  if (!transporter) {
    logger.warn('Email service not initialized');
    return false;
  }

  const recipient = process.env.EMAIL_RECIPIENT;
  if (!recipient) {
    logger.warn('Email recipient not configured');
    return false;
  }

  try {
    // Group changes by extension
    const byExtension = extensionChanges.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = {
          url: item.url,
          changes: []
        };
      }
      acc[item.name].changes.push(item);
      return acc;
    }, {});

    // Build HTML
    const extensionRows = Object.entries(byExtension)
      .map(([name, data]) => `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 10px; font-weight: bold;"><a href="${data.url}">${name}</a></td>
          <td style="padding: 10px;">
            ${data.changes.map(c => `<div>• ${c.change_type}: ${c.old_value} → ${c.new_value}</div>`).join('\n')}
          </td>
          <td style="padding: 10px; font-size: 0.9em; color: #666;">${new Date(c.detected_at).toLocaleString()}</td>
        </tr>
      `)
      .join('\n');

    const htmlContent = `
      <h2>Chrome Stats Monitor - Batch Update</h2>
      <p>The following changes have been detected in your monitored extensions:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <thead style="background-color: #f5f5f5;">
          <tr>
            <th style="padding: 10px; text-align: left;">Extension</th>
            <th style="padding: 10px; text-align: left;">Changes</th>
            <th style="padding: 10px; text-align: left;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${extensionRows}
        </tbody>
      </table>
      <p><small>Generated at: ${new Date().toLocaleString()}</small></p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_SENDER,
      to: recipient,
      subject: `[Chrome Stats] Batch Update - ${extensionChanges.length} changes detected`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Batch email sent with ${extensionChanges.length} changes`);
    return true;
  } catch (error) {
    logger.error(`Failed to send batch email: ${error.message}`);
    return false;
  }
}

module.exports = {
  initializeEmailService,
  sendExtensionNotification,
  sendBatchNotification
};
