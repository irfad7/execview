# ExecView - Executive Law Firm Dashboard

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Vision & Goals](#vision--goals)
3. [System Architecture](#system-architecture)
4. [Current Features](#current-features)
5. [Technical Stack](#technical-stack)
6. [Database Schema](#database-schema)
7. [API Integrations](#api-integrations)
8. [Authentication System](#authentication-system)
9. [File Structure](#file-structure)
10. [Development Workflow](#development-workflow)
11. [Deployment](#deployment)
12. [Testing Strategy](#testing-strategy)
13. [Future Roadmap](#future-roadmap)

---

## 🎯 Project Overview

**ExecView** is a comprehensive executive dashboard designed specifically for law firms to consolidate and visualize critical business metrics from multiple practice management and marketing systems. The platform provides real-time insights into case management, lead generation, financial performance, and operational efficiency.

### **Target Users**
- **Managing Partners** - High-level business metrics and firm performance
- **Practice Managers** - Operational insights and case flow management
- **Business Development** - Lead generation and conversion tracking
- **Financial Controllers** - Revenue, collections, and financial health

### **Core Problem Solved**
Law firms typically use 3-5 different systems (Clio, QuickBooks, GoHighLevel, Google Business, etc.) with no unified view. ExecView consolidates this data into a single, beautiful executive dashboard, eliminating the need to log into multiple systems for insights.

---

## 🚀 Vision & Goals

### **Primary Vision**
Create the **ultimate executive command center** for modern law firms - a single pane of glass that provides actionable insights without the complexity of multiple systems.

### **Short-term Goals (3-6 months)**
- ✅ **MVP Dashboard** with core metrics from 3 major platforms
- ✅ **OAuth Integration** with Clio, GoHighLevel, and QuickBooks
- ✅ **Real-time Data Sync** with intelligent caching
- ✅ **PDF Report Generation** for stakeholder distribution
- ✅ **Mobile-responsive Design** for on-the-go access

### **Medium-term Goals (6-12 months)**
- 📊 **Advanced Analytics** with trend analysis and forecasting
- 🔔 **Smart Alerts** for urgent items (court dates, missed discovery)
- 📧 **Automated Reporting** via email/Slack integration  
- 🎨 **Custom Dashboards** for different roles and preferences
- 📱 **Mobile App** for iOS/Android

### **Long-term Vision (1-2 years)**
- 🤖 **AI-Powered Insights** with predictive analytics
- 🔗 **Extended Integrations** (Lexicata, MyCase, PracticePanther, etc.)
- 🏢 **Multi-firm Management** for legal consulting groups
- 📈 **Benchmarking** against industry standards
- 🔐 **Enterprise SSO** and advanced security features

---

## 🏗 System Architecture

### **Technology Stack**
```
Frontend:  Next.js 16 + TypeScript + Tailwind CSS + Framer Motion
Backend:   Next.js API Routes + Prisma ORM
Database:  Vercel Postgres (PostgreSQL)
Auth:      Custom session-based authentication
Deploy:    Vercel Platform
Testing:   Jest + Testing Library
```

### **Architecture Patterns**
- **Server-Side Rendering (SSR)** - Fast initial page loads
- **API-First Design** - Clear separation between frontend and data layer
- **Multi-tenant Architecture** - Secure data isolation per law firm
- **OAuth 2.0 Integration** - Secure third-party API access
- **Intelligent Caching** - Optimized performance with fresh data
- **Serverless Functions** - Scalable and cost-effective

### **Data Flow**
```
Third-party APIs → OAuth → Connectors → Database Cache → Dashboard UI
     ↓              ↓         ↓            ↓              ↓
   Clio         Access     Transform    PostgreSQL    React
   GHL          Tokens     & Validate   + Prisma      Components
   QuickBooks   Refresh    Data Maps    Caching       + Tailwind
```

---

## ✨ Current Features

### **Dashboard Overview**
- 📊 **Executive Summary** - Key metrics at a glance
- 📈 **Performance Indicators** - Weekly/YTD comparisons with trends
- ⚠️ **Critical Alerts** - Urgent items requiring immediate attention
- 🎯 **Goal Tracking** - Progress against firm targets

### **Case Management (Clio Integration)**
- 📁 **Active Cases Overview** - All open matters with status
- 📋 **Discovery Tracking** - Missing discovery items flagged
- ⚖️ **Plea Offer Status** - Outstanding plea negotiations
- 📅 **Court Date Calendar** - Upcoming deadlines and hearings
- 💰 **Outstanding Balances** - Client payment tracking

### **Lead Pipeline (GoHighLevel Integration)**
- 🎯 **Lead Generation Metrics** - Weekly/monthly lead volume
- 📞 **Consultation Tracking** - Scheduled and completed consultations
- 💼 **Retainer Conversion** - Lead-to-client conversion rates
- 📊 **Source Analysis** - Performance by marketing channel
- ⏱️ **Response Time Tracking** - Average time on phone per lead

### **Financial Dashboard (QuickBooks Integration)**
- 💸 **Revenue Tracking** - YTD and weekly revenue metrics
- 🏆 **Case Value Analysis** - Average case value and trends
- 💳 **Payment Collections** - Recent payments and outstanding items
- 📈 **Profit & Loss** - Financial health indicators
- 📊 **Expense Tracking** - Cost management and analysis

### **Profile & Settings**
- 👤 **Firm Profile Management** - Firm details and contact information
- 🔗 **Integration Settings** - OAuth connections and field mappings
- 🎨 **Customization Options** - Dashboard layout preferences
- 📧 **Notification Preferences** - Alert settings and delivery methods

### **Export & Reporting**
- 📄 **PDF Report Generation** - Professional reports for stakeholders
- 📊 **Data Export** - CSV/Excel export for further analysis
- 📧 **Scheduled Reports** - Automated weekly/monthly reports
- 📱 **Mobile-Optimized Views** - Responsive design for all devices

---

## 🛠 Technical Stack

### **Frontend Technologies**
- **Next.js 16** - React framework with app router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with custom design system
- **Framer Motion** - Smooth animations and transitions
- **Lucide React** - Modern icon library
- **Chart.js/D3** - Data visualization (future enhancement)

### **Backend Technologies**
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database operations
- **bcryptjs** - Secure password hashing
- **OAuth 2.0** - Third-party API authentication
- **Node.js** - Runtime environment

### **Database & Storage**
- **Vercel Postgres** - Managed PostgreSQL database
- **Session Storage** - Secure authentication sessions
- **Cache Management** - Intelligent data caching for performance

### **Development & Testing**
- **Jest** - JavaScript testing framework
- **Testing Library** - React component testing
- **ESLint** - Code linting and formatting
- **TypeScript Compiler** - Static type checking
- **Prisma Studio** - Database management interface

### **Deployment & Infrastructure**
- **Vercel Platform** - Serverless deployment and hosting
- **GitHub Integration** - Automatic deployments on push
- **Environment Management** - Secure secrets and configuration
- **SSL/TLS** - Automatic HTTPS encryption

---

## 📊 Database Schema

### **Core Tables**

#### **Users & Authentication**
```sql
User {
  id          String   @id @default(cuid())
  email       String   @unique
  password    String   (bcrypt hashed)
  createdAt   DateTime
  updatedAt   DateTime
  sessions    Session[]
}

Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime
  user      User     @relation
}
```

#### **Business Data**
```sql
Profile {
  id        String   @id (links to User.id)
  name      String?
  firmName  String?
  email     String?
  phone     String?
  updatedAt DateTime
}

ApiConfig {
  id           String   @id @default(cuid())
  service      String   @unique
  accessToken  String?
  refreshToken String?
  expiresAt    Int?
  userId       String
  updatedAt    DateTime
}

DashboardCache {
  id        Int      @id @autoincrement()
  data      String   @db.Text (JSON)
  updatedAt DateTime
  userId    String   @unique
}
```

#### **Configuration & Logging**
```sql
FieldMapping {
  id             String @id @default(cuid())
  service        String
  dashboardField String
  sourceField    String
  userId         String
  updatedAt      DateTime
}

Log {
  id        Int      @id @autoincrement()
  service   String
  level     String   
  message   String
  details   String?  @db.Text
  createdAt DateTime
  userId    String
}

SyncStatus {
  id           Int       @id @autoincrement()
  lastUpdated  DateTime?
  status       String?
  errorMessage String?
  userId       String    @unique
}

SystemSetting {
  key       String   @id
  value     String   @db.Text (JSON)
  updatedAt DateTime
  userId    String
}
```

### **Data Relationships**
- **User-centric Design** - All data scoped by userId for multi-tenancy
- **Soft References** - Minimal foreign key constraints for flexibility
- **JSON Storage** - Complex data structures stored as JSON for agility
- **Audit Trail** - Comprehensive logging for all operations

---

## 🔗 API Integrations

### **Clio (Practice Management)**
```typescript
Endpoint: https://app.clio.com/api/v4/
Authentication: OAuth 2.0
Scopes: matters:read, contacts:read, bills:read, calendars:read

Data Fetched:
- Active cases/matters
- Client information  
- Billing and payment status
- Court dates and deadlines
- Discovery and document status
```

### **GoHighLevel (Marketing Automation)**
```typescript
Endpoint: https://services.leadconnectorhq.com/
Authentication: OAuth 2.0
Scopes: opportunities.readonly, contacts.readonly, calendars.readonly

Data Fetched:
- Lead generation metrics
- Opportunity pipeline
- Consultation scheduling
- Conversion tracking
- Marketing source attribution
```

### **QuickBooks (Financial Management)**
```typescript
Endpoint: https://sandbox-quickbooks.api.intuit.com/v3/
Authentication: OAuth 2.0
Scopes: com.intuit.quickbooks.accounting

Data Fetched:
- Revenue and income statements
- Accounts receivable
- Payment collections
- Expense tracking
- Profit & loss reports
```

### **Integration Architecture**
- **Base Connector Class** - Shared OAuth and error handling logic
- **Service-Specific Connectors** - Tailored data transformation per API
- **Intelligent Mapping** - Automatic field mapping with manual override options
- **Rate Limiting** - Respectful API usage with retry logic
- **Error Recovery** - Graceful handling of API outages and token expiry

---

## 🔐 Authentication System

### **Security Model**
- **Session-Based Auth** - Secure HTTP-only cookies
- **bcrypt Password Hashing** - Industry-standard password protection  
- **Token Expiration** - Automatic session cleanup (7-day default)
- **CSRF Protection** - SameSite cookie attributes
- **SQL Injection Prevention** - Parameterized queries via Prisma

### **User Flow**
1. **Registration** - Email + password with validation
2. **Login** - Credential verification + session creation
3. **Session Management** - Automatic token refresh and cleanup
4. **Logout** - Secure session termination
5. **Password Security** - Salted hashes with secure random generation

### **Multi-Tenancy**
- **Data Isolation** - All queries scoped by authenticated user ID
- **Resource Protection** - Middleware authentication on all routes
- **Audit Logging** - User actions tracked for security compliance

---

## 📁 File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/
│   │   └── login/          # Authentication pages
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   └── reporting/      # Data API endpoints
│   ├── admin/              # Admin interface
│   ├── cases/              # Case management pages
│   ├── leads/              # Lead pipeline pages
│   ├── bookkeeping/        # Financial pages
│   ├── integrations/       # OAuth setup pages
│   ├── metrics/            # Analytics pages
│   ├── profile/            # User profile pages
│   └── layout.tsx          # Root layout

├── components/             # React components
│   ├── admin/              # Admin-specific components
│   ├── email/              # Email templates
│   ├── Card.tsx            # Reusable metric cards
│   ├── Header.tsx          # Page headers
│   └── Sidebar.tsx         # Navigation sidebar

├── integrations/           # API connectors
│   ├── clio/               # Clio practice management
│   ├── gohighlevel/        # GHL marketing automation
│   ├── quickbooks/         # QB financial data
│   └── base.ts             # Shared connector logic

├── lib/                    # Utilities and shared logic
│   ├── api/                # API utilities
│   ├── auth.ts             # Authentication service
│   ├── dbActions.ts        # Database operations
│   ├── prisma.ts           # Database client
│   ├── types.ts            # TypeScript definitions
│   ├── utils.ts            # General utilities
│   ├── mockData.ts         # Development data
│   ├── pdfUtils.ts         # PDF generation
│   ├── context.tsx         # React context providers
│   └── animations.tsx      # Animation components

├── middleware/             # Next.js middleware
│   └── auth.ts             # Route protection

tests/                      # Test suites
├── auth.test.ts            # Authentication tests
├── storage.test.ts         # Database tests
├── integrations.test.ts    # API connector tests
├── api-routes.test.ts      # API endpoint tests
└── setup.ts                # Test configuration

prisma/                     # Database schema and migrations
├── schema.prisma           # Database schema definition
└── seed.ts                 # Database seeding script

docs/                       # Documentation
└── SYSTEM_DOCUMENTATION.md # This file

public/                     # Static assets
scripts/                    # Build and deployment scripts
```

---

## ⚙️ Development Workflow

### **Getting Started**
```bash
# Clone and install
git clone <repository>
cd execview
npm install

# Set up database
npx prisma migrate deploy
npx prisma db seed

# Start development
npm run dev
```

### **Development Commands**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run lint         # Code linting
npm run db:studio    # Open database GUI
npm run db:seed      # Seed database with demo data
```

### **Git Workflow**
1. **Feature Branches** - Create branch for each feature/fix
2. **Commit Standards** - Conventional commits with clear messages
3. **Pull Requests** - Code review required before merge
4. **Automated Testing** - All tests must pass before merge
5. **Automatic Deployment** - Vercel deploys on main branch push

---

## 🚀 Deployment

### **Vercel Platform**
- **Automatic Deployments** - Push to main triggers deployment
- **Preview Deployments** - Every PR gets preview URL
- **Environment Variables** - Secure secrets management
- **SSL Certificates** - Automatic HTTPS
- **Global CDN** - Fast worldwide performance

### **Database Setup**
1. **Create Vercel Postgres** - Free tier (60 hours/month)
2. **Environment Variables** - Auto-configured by Vercel
3. **Run Migrations** - `npx prisma migrate deploy`
4. **Seed Data** - `npx prisma db seed`

### **Environment Variables**
```env
# Database (auto-set by Vercel)
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=

# Application
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app

# OAuth (optional)
CLIO_CLIENT_ID=
CLIO_CLIENT_SECRET=
GOHIGHLEVEL_CLIENT_ID=
GOHIGHLEVEL_CLIENT_SECRET=
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
```

---

## 🧪 Testing Strategy

### **Test Coverage Areas**
- **Authentication** - User management, sessions, security
- **Database Operations** - All CRUD operations with isolation
- **API Integrations** - External service connectors
- **API Routes** - Authentication and data endpoints
- **Security** - No data leakage, proper validation

### **Testing Tools**
- **Jest** - Test framework and assertions
- **Testing Library** - React component testing
- **Mocking** - External API and service mocking
- **Coverage** - Comprehensive test coverage reports

### **Test Types**
- **Unit Tests** - Individual function testing
- **Integration Tests** - Component interaction testing
- **API Tests** - Endpoint behavior validation
- **Security Tests** - Authentication and authorization
- **Error Handling** - Graceful failure scenarios

---

## 🗺 Future Roadmap

### **Phase 2: Enhanced Analytics (Q2 2025)**
- 📊 **Advanced Dashboards** with customizable widgets
- 📈 **Trend Analysis** with historical data visualization
- 🎯 **Goal Setting** and progress tracking
- 📱 **Mobile App** for iOS and Android
- 🔔 **Smart Notifications** via email/Slack

### **Phase 3: AI & Automation (Q3 2025)**
- 🤖 **AI-Powered Insights** with predictive analytics
- 📧 **Automated Reporting** with intelligent scheduling
- 🔍 **Anomaly Detection** for unusual patterns
- 💬 **Natural Language Queries** for data exploration
- 🎨 **Auto-Generated Visualizations**

### **Phase 4: Enterprise Features (Q4 2025)**
- 🏢 **Multi-Firm Management** for legal groups
- 🔐 **Enterprise SSO** (SAML, OIDC)
- 📊 **Benchmarking** against industry standards
- 🔗 **Extended Integrations** (20+ legal software platforms)
- 🛡️ **Advanced Security** features and compliance

### **Phase 5: Market Expansion (2026)**
- 🌍 **International Expansion** with localization
- 🏥 **Vertical Expansion** (healthcare, accounting firms)
- 🔌 **Open API Platform** for third-party developers
- 🏪 **Marketplace** for community-built widgets
- 🤝 **Partner Ecosystem** with legal software vendors

---

## 📞 Technical Support

### **Documentation**
- **System Overview** - This document
- **API Documentation** - Swagger/OpenAPI specs (planned)
- **User Guides** - End-user documentation (planned)
- **Video Tutorials** - Screen recordings for common tasks

### **Development Resources**
- **Code Comments** - Inline documentation throughout codebase
- **TypeScript Definitions** - Complete type coverage
- **Test Examples** - Comprehensive test suite as examples
- **Error Handling** - Detailed error messages and logging

---

*Last Updated: January 2025*
*Version: 1.0.0*
*Author: ExecView Development Team*