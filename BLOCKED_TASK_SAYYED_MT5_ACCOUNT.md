# BLOCKED: Update Sayyed MT5 Account

## Task
Update Sayyed (ruknucarki@necub.com) MT5 account from mock 70002 to real number

## Status
**BLOCKED - Needs User Input**

## Reason
The MT5 live server is completely unreachable from Vercel due to IP whitelist restrictions:
- Outbound IP: 52.7.179.117 (also tried 3.223.9.111)
- Error: HTTP 403 Forbidden on /api/auth/start
- This is an IP-level block before any authentication occurs

## Current State
- User: Sayyed (ruknucarki@necub.com)
- Current MT5 Account in DB: 70002 (mock sequential number)
- Real MT5 Account: UNKNOWN
- User created: 2026-03-17T18:41:36.406Z (during mock mode)

## What Was Attempted
1. Queried MT5 live server via Vercel deployment - BLOCKED (403)
2. Checked audit logs - Only shows "MT5 account 70002 created" (mock)
3. Attempted direct database query - No real MT5 account number stored
4. Tried alternative API endpoints - All blocked by IP whitelist

## Required Action
User must provide Sayyed's real MT5 account number from the MT5 Administrator:

1. Open MT5 Administrator
2. Go to Clients & Accounts → Trading Accounts
3. Search for "Sayyed" or email "ruknucarki@necub.com"
4. Find the real MT5 login number (should be 9009094xxxxx format, not 70002)
5. Provide the real account number to update the CRM database

## Database Record to Update
```sql
UPDATE "User" 
SET "mt5Account" = 'REAL_ACCOUNT_NUMBER_HERE' 
WHERE email = 'ruknucarki@necub.com';
```

## Notes
- The mock account 70002 was assigned when CRM was in mock mode
- Sayyed is a real user but MT5 account was never created on live server
- Once real account number is provided, run the SQL update above
