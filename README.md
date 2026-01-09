# GrabYourSeat – Fullstack Movie Booking App

## 🎬 Functionality Overview

- 👥 **User Authentication with Clerk**  
  Enable secure sign-up via email or phone number. Supports multi-session login to switch profiles without logging out.

- 🎬 **Explore & Book Movies**  
  Browse movies, watch trailers, add to favorites, view details, and select seats to book tickets.

- 💳 **Online Payments via Stripe**  
  Secure payment gateway integration. Failed payments hold seats for 10 minutes before auto-release.

- 📅 **Admin Dashboard**  
  Manage bookings and add shows using live "Now Playing" data from TMDB for quick setup.

- 📧 **Email Notifications with Inngest**  
  Sends booking confirmations, showtime reminders, and new show announcements automatically.

- ⏳ **Background Jobs with Inngest**  
  Handles tasks like delayed seat release and scheduled reminders without blocking main server logic.



## 🧱 Project Structure

This repository contains the client (frontend) and server (backend) of the GrabYourSeat movie booking platform.
```bash
root/
├── client/    # Vite + React frontend
└── server/    # Express backend + Stripe, Inngest, Postgres, Prisma etc.
```
## ✅ Prerequisites

- Postgres Database (e.g. Supabase)
- Stripe Account
- Clerk Project
- Inngest Account
- TMDB API Key
- Brevo (Sendinblue) SMTP Account

## 📦 Setup Instructions

### 🖥️ To Run Client
```bash
cd client
npm install
npm run dev
```
### 🛠️ To Run Server
```bash
cd server
npm install
npm run server
```
### 🗄️ To push schema to DB
```bash
npx prisma migrate dev
```

### 🛠️ Environment Variables
📁 client/.env
```bash
VITE_CLERK_PUBLISHABLE_KEY = your-clerk-publishable-key
VITE_CURRENCY = ₹
VITE_BASE_URL = http://localhost:3000
VITE_TMDB_IMAGE_BASE_URL = https://image.tmdb.org/t/p/original
```
📁 server/.env
```bash
DATABASE_URL = transaction-pooler-URL (port 6543)
DIRECT_URL = session-pooler-URL (port 5432) AND append ?pgbouncer=true

CLERK_PUBLISHABLE_KEY = your-clerk-pub-key
CLERK_SECRET_KEY = your-clerk-secret-key

INNGEST_EVENT_KEY = your-inngest-event-key
INNGEST_SIGNING_KEY = your-inngest-signing-key

TMDB_API_KEY = your-tmdb-api-key

STRIPE_PUBLISHABLE_KEY = your-stripe-pub-key
STRIPE_SECRET_KEY = your-stripe-secret-key
STRIPE_WEBHOOK_SECRET = your-stripe-webhook-secret

SENDER_NAME = GrabYourSeat
SENDER_EMAIL = youremail@example.com
SMTP_USER = your-smtp-user@smtp-brevo.com
SMTP_PASSWORD = your-brevo-password
```

### 📂 .gitignore Setup
Make sure both client/.gitignore and server/.gitignore contain:
```bash
node_modules/
.env
```

### 🔐 Where to Get API Keys

- 🔗 [Clerk (Authentication)](https://dashboard.clerk.com)
- 🔗 [TMDB (Movie Data & Images)](https://themoviedb.org/settings/api)
- 🔗 [Supabase (Database)](https://supabase.com/)
- 🔗 [Stripe (Payments)](https://dashboard.stripe.com)
- 🔗 [Brevo (SMTP for Emails)](https://app.brevo.com)
- 🔗 [Inngest (Background Jobs & Workflows)](https://app.inngest.com)
