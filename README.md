# Veira POS - Multi-tenant SaaS POS

A production-ready, scalable, and secure Point of Sale system built with Next.js 14 and Supabase.

## Features

- **Multi-tenancy**: Shared database with `shop_id` strategy and Row Level Security (RLS).
- **Authentication**: Supabase Auth with role-based access control (Admin, Cashier).
- **POS Terminal**: Atomic sales transactions with stock deduction and receipt generation.
- **Inventory**: Product management with SKU, categories, and low stock alerts.
- **Dashboard**: Real-time business metrics and sales trends.
- **Reports**: Daily/Weekly/Monthly sales reports with CSV export.
- **Staff Management**: Team directory and permission control.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS, Framer Motion.
- **Backend**: Supabase (PostgreSQL, Auth, RLS).
- **Validation**: Zod.

## Setup Instructions

### 1. Supabase Setup

1. Create a new Supabase project.
2. Run the SQL schema provided in `supabase/schema.sql` in the Supabase SQL Editor.
3. Enable Email Auth in the Supabase Auth settings.

### 2. Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Installation

```bash
npm install
```

### 4. Development

```bash
npm run dev
```

## Deployment

### Vercel (Frontend)

1. Push your code to a GitHub repository.
2. Connect the repository to Vercel.
3. Add the environment variables in the Vercel project settings.
4. Deploy!

### Supabase (Database)

Supabase is a managed service, so no manual database deployment is needed beyond running the schema.

## Security

- **RLS**: Enforced on all tables to ensure tenant isolation.
- **Atomic Transactions**: Sales are processed via a Postgres function (RPC) to ensure data integrity.
- **Input Validation**: All client-side inputs are validated (Zod recommended for further expansion).
