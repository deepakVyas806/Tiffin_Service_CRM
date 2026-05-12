# TiffinFlow — Product Requirements Document

**Date**: 2026-02-12
**Stack**: React (CRA) + FastAPI + MongoDB (PWA)

## Original Problem Statement
Build TiffinFlow — a premium tiffin meal subscription PWA that feels indistinguishable from a native iOS/Android app. Mobile-first with frosted-glass bottom nav and desktop sidebar+gutter layout. Features: subscriptions, one-time orders, dynamic pause/resume calendar, weekly menu, wallet, delivery tracking, COD + online payment, admin & delivery-partner apps.

## User Choices
- React + FastAPI + MongoDB
- Email/password JWT auth
- Stripe payments (test key from environment)
- Full scope: Customer + Admin + Delivery Partner
- Default premium warm/cream + soft orange + fresh green aesthetic

## Personas
1. **Customer** — subscribes / one-time orders / pauses meals / pays
2. **Admin** — operations & revenue dashboard, manages menu/plans/users
3. **Delivery partner** — sees today's runs, marks delivered, collects COD OTP

## Architecture
- **Backend** (`/app/backend/server.py`): single FastAPI app with `/api` router
  - `auth_utils.py`: bcrypt + PyJWT helpers, httpOnly Secure cookies
  - Endpoints: auth, menu (week/today), plans, subscriptions, orders, wallet, payments (Stripe), delivery, admin, webhook
  - MongoDB seed on startup: admin, delivery partner, 4 plans, 7-day rolling menu
- **Frontend** (`/app/frontend/src/`):
  - `lib/api.js` — axios with `withCredentials` + Bearer fallback
  - `lib/auth.js` — AuthContext provider
  - `components/`: AppShell, Sidebar, TopHeader, BottomNav, RightGutter, ProtectedRoute
  - `pages/`: Landing, Login, Register, Onboarding, Home, Menu, Calendar, Wallet, Plans, Checkout, PaymentSuccess, Profile, Admin, Delivery
  - PWA: `public/manifest.json`, installable

## What's Implemented (✅ 36/36 backend tests passing)
- JWT email/password auth + admin/delivery seeding + welcome ₹100 credit
- Onboarding (address detection + dietary tags)
- Premium animated landing + auth UI (framer-motion)
- Mobile: frosted-glass bottom nav + sticky header
- Desktop: left sidebar + center feed (640px) + right gutter
- Home: today's tiffin hero, quick stats, subscription progress, recent deliveries
- Weekly menu with drag-to-dismiss meal detail drawer + nutrition
- Subscription calendar with tap-to-pause/resume + 10am IST cutoff logic + plan extension
- Wallet: gradient balance card, transactions list, Stripe-powered recharge drawer
- Plans: 4 plan cards with badges
- Checkout: 3 payment modes (Stripe / COD / Wallet) with payment-method picker
- Stripe Checkout integration (sandbox) + `/payment/status/{session_id}` polling + confetti success
- Payment fulfillment idempotent (wallet credit, sub activation, order paid)
- Delivery partner: today's runs, status transitions, COD OTP verification
- Admin: KPI cards (revenue, customers, active subs, orders) + recent orders table
- Data-testid on every interactive element

## P1 — Deferred
- Push/SMS/WhatsApp notifications
- Geo address pin refinement & multi-address book
- Real-time delivery tracking (live agent location) via websocket
- Admin menu/plan/COD-zone CRUD UI (backend endpoints exist; UI needed)
- Service worker for offline menu cache
- Brute-force lockout & password reset

## P2 — Future scaling
- Multi-city kitchens & franchise model
- Family / corporate plans
- Referral & gamification
- AI meal recommendations (collaborative filtering)
- Surge pricing & dynamic delivery fees
- Razorpay alongside Stripe

## Test Credentials
- Admin: `admin@tiffinflow.com` / `admin123`
- Delivery: `delivery@tiffinflow.com` / `delivery123`
- Any customer: register from UI (instant ₹100 wallet)
