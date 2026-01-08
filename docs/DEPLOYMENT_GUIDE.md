# ExecView Deployment Guide

## 🚀 Quick Deploy to Vercel

### Prerequisites
- Node.js 18+ installed
- Git repository
- Vercel account (free)

### Step 1: Prepare Repository
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "feat: Initial ExecView implementation with Vercel compatibility"

# Push to GitHub
git remote add origin https://github.com/yourusername/execview.git
git push -u origin main
```

### Step 2: Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Follow prompts:
# - Link to existing project or create new
# - Set up domain
# - Configure build settings
```

### Step 3: Set up Database
1. Go to Vercel Dashboard
2. Select your project
3. Navigate to **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Choose **Free** plan
7. Create database

Environment variables will be automatically added:
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`

### Step 4: Initialize Database
```bash
# Pull environment variables
vercel env pull .env.local

# Run migrations
npx prisma migrate deploy

# Seed with demo data
npx prisma db seed
```

### Step 5: Configure Production URL
```bash
# Set your production URL
vercel env add NEXT_PUBLIC_BASE_URL
# Value: https://your-app-name.vercel.app
```

### Step 6: Test Deployment
Visit your Vercel URL and login with:
- Email: `admin@lawfirm.com`
- Password: `admin123`

## 🔧 Environment Configuration

### Required Variables
```env
# Database (auto-configured by Vercel)
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=

# Application
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

### Optional OAuth Variables
```env
# Clio
CLIO_CLIENT_ID=your_clio_client_id
CLIO_CLIENT_SECRET=your_clio_client_secret

# GoHighLevel  
GOHIGHLEVEL_CLIENT_ID=your_ghl_client_id
GOHIGHLEVEL_CLIENT_SECRET=your_ghl_client_secret

# QuickBooks
QUICKBOOKS_CLIENT_ID=your_qb_client_id
QUICKBOOKS_CLIENT_SECRET=your_qb_client_secret
```

## 📊 Free Tier Limits

### Vercel Free Tier
- **Function Executions**: 100GB-hours/month
- **Bandwidth**: 100GB/month
- **Deployments**: Unlimited
- **Team Members**: 1

### Vercel Postgres Free Tier
- **Compute Time**: 60 hours/month
- **Storage**: 5GB
- **Data Transfer**: 5GB/month
- **Connection Limit**: 60 concurrent

### Estimated Usage for Law Firms
- **Small Firm (5 users)**: ~10-15 hours/month
- **Medium Firm (15 users)**: ~25-35 hours/month
- **Large Firm (25+ users)**: May need Pro plan ($20/month)

## 🔄 Continuous Deployment

### Automatic Deployments
- **Main Branch**: Deploys to production
- **Feature Branches**: Creates preview deployments
- **Pull Requests**: Preview deployment with unique URL

### Build Settings
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "devCommand": "npm run dev"
}
```

## 🛠 Database Management

### View Database
```bash
npx prisma studio
```

### Run Migrations
```bash
npx prisma migrate deploy
```

### Reset Database (⚠️ Destructive)
```bash
npx prisma migrate reset
npx prisma db seed
```

### Backup Database
```bash
# Export to SQL
pg_dump $POSTGRES_URL > backup.sql

# Import from SQL
psql $POSTGRES_URL < backup.sql
```

## 🔍 Monitoring & Debugging

### Vercel Functions
- View function logs in Vercel dashboard
- Monitor performance and errors
- Set up alerts for critical issues

### Database Monitoring
```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('verceldb'));

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Error Tracking
```typescript
// Add to your error handling
console.error('Error details:', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
  userId: user?.id
});
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check dependencies
npm ci

# Verify TypeScript
npx tsc --noEmit

# Check linting
npm run lint
```

#### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Check environment variables
vercel env ls
```

#### OAuth Integration Issues
1. Verify redirect URIs match exactly
2. Check client ID/secret are correct
3. Ensure scopes are properly requested
4. Test OAuth flow in development first

### Performance Optimization

#### Database Queries
```typescript
// Use Prisma's select to limit fields
const users = await prisma.user.findMany({
  select: { id: true, email: true } // Only fetch needed fields
});

// Use proper indexing
// Add indexes in prisma/schema.prisma
@@index([userId, createdAt])
```

#### Function Optimization
```typescript
// Minimize cold starts
export const config = {
  runtime: 'nodejs18.x', // Use stable runtime
  maxDuration: 10 // Set appropriate timeout
};
```

## 📈 Scaling Considerations

### When to Upgrade Plans

#### Vercel Pro ($20/month)
- More than 100GB function execution time
- Need team collaboration
- Custom domains
- Analytics and monitoring

#### Postgres Pro ($20/month)
- More than 60 hours compute time
- Need more than 5GB storage
- Require connection pooling
- Need point-in-time recovery

### Horizontal Scaling
- **Read Replicas**: For heavy read workloads
- **Connection Pooling**: For high concurrent users
- **Caching Layer**: Redis for frequently accessed data
- **CDN**: For static assets and API responses

## 🔒 Security Best Practices

### Environment Variables
- Never commit secrets to Git
- Use Vercel's encrypted environment variables
- Rotate OAuth tokens regularly
- Monitor for unauthorized access

### Database Security
- Use connection SSL (enabled by default)
- Implement proper user access controls
- Regular security updates via Vercel
- Monitor unusual query patterns

### Application Security
- HTTPS enforced by default
- Secure session cookies
- CSRF protection enabled
- Input validation on all endpoints

## 📞 Support

### Getting Help
- **Vercel Documentation**: https://vercel.com/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **GitHub Issues**: Report bugs and feature requests

### Emergency Procedures
1. **Database Issues**: Use Vercel dashboard to check status
2. **Function Errors**: Check function logs in Vercel
3. **OAuth Problems**: Verify credentials in third-party dashboards
4. **Performance Issues**: Monitor usage in Vercel analytics