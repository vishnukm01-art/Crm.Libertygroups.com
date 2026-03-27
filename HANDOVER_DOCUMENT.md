# Liberty Markets CRM - Development Handover Document

## Project Overview
- **Project Name**: Liberty Markets CRM
- **Repository Location**: /Users/vishnu/liberty-markets-crm
- **Live URL**: https://crm.libertygroups.com
- **Created**: March 2025
- **Status**: In Development (MT5 Integration Pending)

---

## Quick Start Guide for New PC

### 1. Prerequisites
- Node.js 18+ 
- Git
- Vercel CLI (for deployment)

### 2. Environment Setup

Create `.env.local` file with these variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_6wiZmPueczM4@ep-long-smoke-a4d2i8v2-pooler.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require

# NextAuth
NEXTAUTH_URL=https://crm.libertygroups.com
NEXTAUTH_SECRET=your-secret-key-here

# Admin & IB Credentials
ADMIN_EMAIL=admin@libertymarkets.com
ADMIN_PASSWORD=your-admin-password
IB_EMAIL=ib@libertygroups.com
IB_PASSWORD=your-ib-password

# MT5 Configuration
MT5_SERVER_HOST=213.136.69.2
MT5_SERVER_PORT=443
MT5_MANAGER_LOGIN=123457008830
MT5_MANAGER_PASSWORD=!k2yBbKc
MT5_API_MODE=live

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Installation Commands

```bash
# Clone/navigate to project
cd /Users/vishnu/liberty-markets-crm

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build project
npm run build

# Start development server
npm run dev
```

---

## Project Structure

```
liberty-markets-crm/
├── src/
│   ├── app/
│   │   ├── admin/              # Admin dashboard pages
│   │   │   └── user-management/
│   │   │       ├── add-user/
│   │   │       ├── create-mt5-account/    # MT5 account creation UI
│   │   │       ├── mt5-user-list/
│   │   │       └── user-list/
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth configuration
│   │   │   ├── mt5/            # MT5 API endpoints
│   │   │   │   ├── create-account/route.ts
│   │   │   │   ├── diagnose/route.ts
│   │   │   │   ├── groups/route.ts
│   │   │   │   ├── health/route.ts
│   │   │   │   └── status/route.ts
│   │   │   └── users/          # User management APIs
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AdminLayout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── MT5AccountForm.tsx
│   │   ├── MT5UserList.tsx
│   │   ├── Navigation.tsx
│   │   ├── RecentActivity.tsx
│   │   ├── UserForm.tsx
│   │   ├── UserList.tsx
│   │   └── ui/                 # UI components
│   ├── lib/
│   │   ├── email.ts            # Email utilities
│   │   ├── mt5.ts              # MT5 API integration (CRITICAL FILE)
│   │   ├── navigation.ts       # Navigation config
│   │   └── prisma.ts           # Prisma client
│   └── types/
│       └── index.ts
├── prisma/
│   └── schema.prisma           # Database schema
├── public/
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Critical Files & Their Purpose

### 1. MT5 Integration (`src/lib/mt5.ts`)
- **Purpose**: Handles all MT5 Manager API communication
- **Modes**: 
  - `mock`: Returns simulated data (for testing)
  - `live`: Connects to real MT5 server at 213.136.69.2:443
- **Auth Method**: Challenge-response protocol (MD5 hashing)
- **Status**: IP whitelist blocking Vercel connections (403 Forbidden)

### 2. Database Schema (`prisma/schema.prisma`)
Key models:
- `User`: CRM users with MT5 account linkage
- `AuditLog`: Action logging
- `Group`: Trading groups

### 3. API Routes
- `/api/mt5/create-account`: Creates MT5 accounts
- `/api/mt5/groups`: Fetches MT5 trading groups
- `/api/mt5/diagnose`: Connection diagnostics
- `/api/mt5/health`: Health check endpoint

---

## Current Issues & Blockers

### 1. MT5 Connection Blocked (CRITICAL)
**Status**: BLOCKED - External dependency
**Issue**: Vercel IPs (52.7.179.117, 3.223.9.111) rejected by MT5 server
**Error**: HTTP 403 Forbidden on /api/auth/start
**Impact**: Cannot create real MT5 accounts or fetch live groups

**Workaround**: Currently using mock mode (3 fake groups: Standard, Premium, VIP)

**Solution Required**: 
- MT5 Administrator must whitelist Vercel IPs in correct location
- OR provide alternative MT5 API endpoint

### 2. Sayyed's MT5 Account (BLOCKED_TASK)
**File**: `BLOCKED_TASK_SAYYED_MT5_ACCOUNT.txt`
**Issue**: User has mock account 70002, needs real account number
**Action**: User must provide real MT5 account from MT5 Administrator

---

## Deployment

### Vercel Production
```bash
# Login to Vercel
npx vercel login

# Deploy to production
npx vercel --prod
```

### Environment Variables on Vercel
All env vars listed above must be set in Vercel dashboard:
- Go to https://vercel.com/dashboard
- Select project → Settings → Environment Variables
- Add all variables from `.env.local`

---

## Database Access

### Neon PostgreSQL Dashboard
- URL: https://console.neon.tech
- Project: liberty-markets-crm
- Connection string in `.env.local`

### Useful Queries
```sql
-- List all users
SELECT id, name, email, "mt5Account", "createdAt" FROM "User";

-- Find users with mock MT5 accounts
SELECT * FROM "User" WHERE "mt5Account" LIKE '700%';

-- Update Sayyed's MT5 account (when real number known)
UPDATE "User" SET "mt5Account" = 'REAL_NUMBER' WHERE email = 'ruknucarki@necub.com';
```

---

## Testing Endpoints

```bash
# Health check
curl https://crm.libertygroups.com/api/mt5/health

# Diagnose MT5 connection
curl https://crm.libertygroups.com/api/mt5/diagnose

# Get MT5 groups (returns mock data currently)
curl https://crm.libertygroups.com/api/mt5/groups
```

---

## Next Steps for Development

1. **Resolve MT5 IP Whitelist** (Priority 1)
   - Work with MT5 administrator to whitelist Vercel IPs
   - Test live connection via /api/mt5/diagnose

2. **Complete Sayyed's Account** (Priority 2)
   - Get real MT5 account number from MT5 Administrator
   - Update database record

3. **Feature Development** (Priority 3)
   - MT5 account editing (leverage, group changes)
   - Deposit/withdrawal functionality
   - Trade history viewing
   - Email notifications

---

## Contact & Resources

- **MT5 Server**: 213.136.69.2:443
- **MT5 Manager Account**: 123457008830
- **Web API Domain**: webtrading.libertygroups.com
- **Live CRM**: https://crm.libertygroups.com

---

## Backup & Sync

To sync this project to another PC:
1. Copy entire `/Users/vishnu/liberty-markets-crm` directory
2. Or push to Git and clone on new PC
3. Run `npm install` and `npx prisma generate`
4. Copy `.env.local` file (contains secrets)
5. Run `npm run build` to verify

---

Document Generated: March 2025
