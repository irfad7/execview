# ExecView Setup Guide - Local SQLite Version

This version uses a local SQLite database instead of Supabase, making it perfect for internal law firm use with no monthly costs.

## Quick Start

1. **Initialize the database:**
   ```bash
   npm run db:init
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Open [http://localhost:3000](http://localhost:3000)
   - Login with demo credentials:
     - Email: `admin@lawfirm.com`
     - Password: `admin123`

## Database

- **Location:** `data/execview.db` (SQLite file)
- **Reset database:** `npm run db:reset`
- **No external dependencies or monthly costs**

## OAuth Setup (Optional)

To connect real integrations, configure OAuth credentials in `.env.local`:

1. **Get OAuth credentials** following `OAUTH_INSTRUCTIONS.txt`

2. **Update environment variables:**
   ```env
   CLIO_CLIENT_ID="your_actual_client_id"
   CLIO_CLIENT_SECRET="your_actual_client_secret"
   GOHIGHLEVEL_CLIENT_ID="your_actual_client_id" 
   GOHIGHLEVEL_CLIENT_SECRET="your_actual_client_secret"
   QUICKBOOKS_CLIENT_ID="your_actual_client_id"
   QUICKBOOKS_CLIENT_SECRET="your_actual_client_secret"
   ```

3. **For production, update the base URL:**
   ```env
   NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
   ```

## Production Deployment

### Option 1: Simple VPS Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Option 2: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Features

✅ **Complete Dashboard** - Executive overview with real-time metrics
✅ **Case Management** - Track discovery, plea offers, court dates
✅ **Lead Pipeline** - Monitor lead generation and conversions  
✅ **Financial Tracking** - Revenue, collections, and case values
✅ **OAuth Integration** - Connect Clio, GoHighLevel, QuickBooks
✅ **PDF Reports** - Export data to PDF format
✅ **Local Authentication** - No external auth dependencies
✅ **SQLite Database** - No monthly database costs

## Architecture

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes + SQLite + better-sqlite3
- **Authentication:** Local session-based auth with bcrypt
- **Database:** SQLite with direct SQL queries (no ORM overhead)
- **Integrations:** OAuth2 flows for Clio/GHL/QuickBooks

## File Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
├── lib/
│   ├── db.ts           # SQLite database setup
│   ├── auth.ts         # Authentication service
│   ├── dbActions.ts    # Database operations
│   └── types.ts        # TypeScript definitions
├── integrations/        # API connectors
└── middleware/         # Auth middleware

data/
└── execview.db         # SQLite database file
```

## Support

This is a self-contained application with no external dependencies beyond OAuth providers. All data stays local to your server.