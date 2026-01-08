# ExecView - Vercel Deployment Setup

## ✅ Vercel Compatibility Complete

The application has been fully converted to work with Vercel's platform using:
- **Vercel Postgres** (free tier) instead of SQLite
- **Prisma ORM** for database management
- **Local session-based authentication**
- **Zero monthly costs** on the free tier

## 🚀 Deployment Steps

### 1. Create Vercel Project

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Follow prompts to create new project
```

### 2. Set up Vercel Postgres

In your Vercel dashboard:

1. Go to your project
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose **Free Tier** (60 hours/month compute time)
6. Create database

Vercel will automatically set these environment variables:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`

### 3. Run Database Migration

```bash
# Deploy database schema
vercel env pull .env.local
npx prisma migrate deploy
npx prisma db seed
```

### 4. Configure OAuth (Optional)

If you want to connect real integrations, set these environment variables in Vercel:

```bash
vercel env add CLIO_CLIENT_ID
vercel env add CLIO_CLIENT_SECRET
vercel env add GOHIGHLEVEL_CLIENT_ID  
vercel env add GOHIGHLEVEL_CLIENT_SECRET
vercel env add QUICKBOOKS_CLIENT_ID
vercel env add QUICKBOOKS_CLIENT_SECRET
```

Follow `OAUTH_INSTRUCTIONS.txt` to get the OAuth credentials.

### 5. Set Production URL

```bash
vercel env add NEXT_PUBLIC_BASE_URL
# Set to your Vercel URL: https://your-app.vercel.app
```

## 🧪 Running Tests

Our comprehensive test suite covers:

### **Authentication Tests** (`tests/auth.test.ts`)
- ✅ User creation with password hashing
- ✅ Password verification (correct/incorrect)
- ✅ Session management (create/validate/expire)
- ✅ Security features (token uniqueness, isolation)
- ✅ Cleanup operations

### **Storage Tests** (`tests/storage.test.ts`)
- ✅ API configuration management
- ✅ Dashboard cache operations  
- ✅ Profile management
- ✅ Field mapping system
- ✅ System settings
- ✅ Logging functionality
- ✅ Sync status tracking
- ✅ Multi-user data isolation

### **Integration Tests** (`tests/integrations.test.ts`)
- ✅ Clio API connector (fetch matters, error handling)
- ✅ GoHighLevel connector (opportunities, lead tracking)
- ✅ QuickBooks connector (basic structure, token validation)
- ✅ OAuth token validation
- ✅ Rate limiting and error responses
- ✅ Data transformation and mapping

### **API Route Tests** (`tests/api-routes.test.ts`)  
- ✅ Login/logout endpoints
- ✅ Session cookie management
- ✅ Error handling and validation
- ✅ Security (no sensitive data leakage)
- ✅ OAuth callback structure

### Run Tests Locally

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Set up database (after connecting to Vercel Postgres)
npx prisma migrate deploy
npx prisma db seed

# Start development server
npm run dev
```

**Demo Login:**
- Email: `admin@lawfirm.com`  
- Password: `admin123`

## 📊 Free Tier Limits

**Vercel Postgres Free Tier:**
- 60 hours compute time/month
- 5GB storage
- Perfect for internal law firm tools

**Estimated Usage:**
- Small law firm (5-10 users): ~10-15 hours/month
- Medium firm (10-20 users): ~20-30 hours/month  
- **Easily within free limits for most use cases**

## 🛠 Production Configuration

### Environment Variables Checklist

Required for production:
- ✅ `POSTGRES_URL` (auto-set by Vercel)
- ✅ `POSTGRES_URL_NON_POOLING` (auto-set by Vercel)
- ✅ `NEXT_PUBLIC_BASE_URL` (your vercel domain)

Optional for OAuth integrations:
- ⚪ `CLIO_CLIENT_ID` / `CLIO_CLIENT_SECRET`
- ⚪ `GOHIGHLEVEL_CLIENT_ID` / `GOHIGHLEVEL_CLIENT_SECRET`  
- ⚪ `QUICKBOOKS_CLIENT_ID` / `QUICKBOOKS_CLIENT_SECRET`

### Database Management

```bash
# View database in browser
npx prisma studio

# Reset database (careful!)
npx prisma migrate reset

# Re-seed with demo data
npx prisma db seed
```

## 🔍 Backend Verification Checklist

Before deploying, verify these work:

### ✅ Authentication System
- [ ] User can register/login
- [ ] Sessions persist across requests  
- [ ] Logout clears session
- [ ] Password security (bcrypt hashing)

### ✅ Database Operations
- [ ] Profile creation/updates
- [ ] API config storage
- [ ] Dashboard cache read/write
- [ ] Field mappings save/retrieve
- [ ] Logs are recorded
- [ ] Settings persist

### ✅ Integration Connectors  
- [ ] Clio connector handles API calls
- [ ] GoHighLevel connector processes opportunities
- [ ] QuickBooks connector (ready for realmId)
- [ ] OAuth callback stores tokens
- [ ] Error handling works

### ✅ API Routes
- [ ] Login endpoint validates credentials
- [ ] Logout endpoint clears sessions
- [ ] OAuth callbacks process tokens
- [ ] Middleware protects routes

## 🎯 Next Steps After Backend Verification

Once backend tests pass:

1. **UI Refinement** - Polish the existing dashboard components
2. **Real Data Integration** - Connect to actual APIs with OAuth
3. **Advanced Features** - Add reporting, alerts, customizations
4. **Performance** - Optimize queries and caching
5. **Monitoring** - Add error tracking and analytics

## 📞 Support

The application is now fully self-contained and Vercel-compatible. All data stays within your Vercel account, and there are no external dependencies beyond the optional OAuth integrations you choose to connect.