# RemindME & Supabase Setup Guide (A to Z)

This guide documents the complete setup, configuration, and environment provisioning required for a fresh **RemindME** system (Web, Backend, and Android Mobile apps) from start to finish.

---

## 1. Create a Supabase Project

1. Go to [database.new](https://database.new) or the [Supabase Dashboard](https://supabase.com/dashboard).
2. Choose your Organization.
3. Name your project (e.g. `RemindME`).
4. Set a strong **Database Password** (e.g. `kalremindme12`) and securely store it.
5. Select your Region (e.g. `EU (Ireland) - eu-west-1`).
6. Note down your:
   * **Project Reference ID** (found in Project Settings &rarr; General, e.g. `wysdrfnnsoaphrfxcotx`).
   * **Project URL**: `https://<PROJECT_REF>.supabase.co`
   * **Anon / Publishable Key**: Project Settings &rarr; API &rarr; `anon` `public`.
   * **Service Role Secret Key**: Project Settings &rarr; API &rarr; `service_role` (keep secret).

---

## 2. Enable Required Database Extensions

Navigate to **Database &rarr; Extensions** in the Supabase Dashboard:
* `pg_cron` &mdash; **Enable**: Required for recurring reminder and nudge dispatch jobs.
* `pg_net` &mdash; **Enable**: Required for Postgres to trigger HTTP requests to Edge Functions.
* `supabase_vault` &mdash; Pre-installed under **Integrations &rarr; Vault** (no action needed).

---

## 3. Apply Database Migrations

You can push all 32+ schema migrations directly to your database:

```bash
cd RemindME-web

# Method A: Using the Supabase Connection String
npx supabase db push --yes --db-url "postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres"

# Method B: Using Supabase Link
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --yes
```

### What the Migrations Provision:
* **Custom Enums**: `category_type`, `relationship_type`, `gender_type`, `cycle_type`, `frequency_type`, `channel_type`, `lead_time_type`, `delivery_status`.
* **Tables**: `reminder_items`, `person_details`, `subscription_details`, `task_details`, `holiday_details`, `recurrence_rules`, `notification_preferences`, `notification_channels`, `delivery_log`, `escalation_state`, `user_settings`, `in_app_notifications`, `reminder_templates`, `calendar_feed_tokens`, `snooze_state`.
* **Multi-Stage Alert Architecture**: Supports multiple alerts per channel per reminder (e.g. 1 day before in the evening + day of event in the morning) tracked by `preference_id` in `delivery_log`.
* **Row-Level Security (RLS)**: Enforces `auth.uid() = user_id` across all public tables.
* **Storage Buckets**: `logos` and `avatars` public buckets with authenticated upload policies.
* **Realtime**: Publications enabled on `reminder_items`, `escalation_state`, `task_details`, `subscription_details`, `person_details`.

---

## 4. Vault Secrets Configuration (Postgres to Edge Functions)

The background dispatch functions read credentials securely from Supabase Vault to call Edge Functions.

Run in the Supabase SQL Editor:
```sql
-- Store Edge Function Base URL
SELECT vault.create_secret(
  'https://<PROJECT_REF>.supabase.co/functions/v1',
  'dispatch_edge_function_base_url'
);

-- Store Supabase Anon Key
SELECT vault.create_secret(
  '<YOUR_ANON_KEY>',
  'dispatch_anon_key'
);
```

---

## 5. Scheduled Background Cron Jobs (`pg_cron`)

The migrations automatically schedule two recurring background jobs:
1. **`invoke-reminder-dispatch`**: Runs every minute (`* * * * *`) &rarr; executes `public.invoke_dispatch_edge_function()`.
2. **`invoke-nudge-dispatch`**: Runs every minute (`* * * * *`) &rarr; executes `public.invoke_dispatch_nudge_edge_function()`.

Verify active jobs in the SQL Editor:
```sql
SELECT jobid, jobname, schedule, command, active FROM cron.job;
```

---

## 6. Supabase Edge Functions Deployment & Secrets

RemindME includes two mission-critical Edge Functions located in `RemindME-web/supabase/functions`:
* `dispatch-reminder` &mdash; Dispatches notifications via Push (FCM), Email (Resend), Telegram, or in-app.
* `dispatch-nudge` &mdash; Escalation engine for unacknowledged reminders.

### Step A: Deploy Edge Functions
Deploy with `--no-verify-jwt` so internal `pg_cron` / `pg_net` callers can trigger dispatches:
```bash
cd RemindME-web
npx supabase functions deploy dispatch-reminder --no-verify-jwt --project-ref <PROJECT_REF>
npx supabase functions deploy dispatch-nudge --no-verify-jwt --project-ref <PROJECT_REF>
```

### Step B: Set Edge Function Environment Secrets
Edge functions run isolated from Postgres and require their own secrets:
```bash
npx supabase secrets set --project-ref <PROJECT_REF> \
  RESEND_API_KEY="re_..." \
  FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}' \
  ENCRYPTION_KEY="<32-character-encryption-key>"
```

### Step C: Verify Edge Function Logs
```bash
npx supabase functions logs dispatch-reminder --project-ref <PROJECT_REF>
```

---

## 7. Automated CI/CD Deployment (GitHub Actions)

A GitHub Actions workflow is provided at `.github/workflows/deploy-supabase.yml` to automatically deploy database migrations, edge functions, and secrets whenever code is pushed to `main`.

### Required GitHub Repository Secrets
Under your GitHub repo &rarr; **Settings &rarr; Secrets and variables &rarr; Actions**:
* `SUPABASE_ACCESS_TOKEN` &mdash; Personal Access Token from [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens).
* `SUPABASE_PROJECT_ID` &mdash; Your Supabase Project Reference (e.g. `wysdrfnnsoaphrfxcotx`).
* `SUPABASE_DB_PASSWORD` &mdash; Your Database Password.
* `RESEND_API_KEY` &mdash; Resend API key for emails.
* `FIREBASE_SERVICE_ACCOUNT` &mdash; Firebase Service Account JSON string for push notifications.
* `ENCRYPTION_KEY` &mdash; Token encryption key.

### One-Click Local Deployment Script
You can also deploy everything locally anytime with 1 command:
* **Windows (PowerShell)**:
  ```powershell
  .\scripts\deploy-supabase.ps1 -ProjectRef <PROJECT_REF>
  ```
* **Linux / macOS**:
  ```bash
  chmod +x scripts/deploy-supabase.sh
  ./scripts/deploy-supabase.sh <PROJECT_REF>
  ```

---

## 8. Google OAuth Authentication Setup

### Step A: Google Cloud Console
1. Go to [Google Cloud Console &rarr; Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. Under **Authorized redirect URIs**, add:
   ```text
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
4. Copy the **Client ID** and **Client secret**.

### Step B: Supabase Dashboard
1. Go to **Authentication &rarr; Providers &rarr; Google**.
2. Toggle Google to **Enabled**.
3. Paste the **Client ID** and **Client secret**.
4. Click **Save**.

---

## 9. Supabase Auth URL Configuration

In Supabase Dashboard &rarr; **Authentication &rarr; URL Configuration**:

### 1. Site URL
```text
https://remind-me-web-roan.vercel.app
```

### 2. Redirect URLs (Allow List)
```text
https://remind-me-web-roan.vercel.app/**
remindme://login-callback
http://localhost:3000/**
```
> **Note**: `remindme://login-callback` is required for the native Android app deep-link callback after OAuth sign-in.

---

## 10. Environment Variables Reference

### Web Application (`RemindME-web/.env.local` and Vercel)
```ini
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_DB_PASSWORD=<DB_PASSWORD>
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
CRON_SECRET=<RANDOM_HEX_TOKEN>

# Push Notifications (Firebase FCM)
NEXT_PUBLIC_VAPID_KEY=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Media & Communication
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=...
ENCRYPTION_KEY=...
```

#### Syncing to Vercel via CLI:
```bash
cd RemindME-web
bunx vercel link --yes --project remind-me-web
# Add any variable directly to Production, Preview, Development:
echo "value" | bunx vercel env add KEY_NAME --environment production,preview,development --yes
```

---

### Android Mobile App (`RemindME-mobile`)

#### Local Dev (`RemindME-mobile/local.properties`):
```properties
sdk.dir=C\:\\Android\\sdk
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
```

#### GitHub Actions Secrets (for Cloud Signed Releases):
Under GitHub Repository &rarr; **Settings &rarr; Secrets and variables &rarr; Actions**:
* `SUPABASE_URL` &rarr; `https://<PROJECT_REF>.supabase.co`
* `SUPABASE_ANON_KEY` &rarr; `sb_publishable_...`
* `WEB_API_URL` &rarr; `https://remind-me-web-roan.vercel.app`
* `GOOGLE_WEB_CLIENT_ID` &rarr; Google OAuth Web Client ID
* `ANDROID_KEYSTORE_BASE64` &rarr; Keystore base64 string
* `ANDROID_KEYSTORE_PASSWORD` &rarr; Keystore password
* `ANDROID_KEY_ALIAS` &rarr; Key alias
* `ANDROID_KEY_PASSWORD` &rarr; Key password

#### Publishing a New Release:
Create and push a Git tag:
```bash
git tag v1.0.6
git push origin v1.0.6
```
GitHub Actions builds the signed `app-release.apk` and publishes it to GitHub Releases automatically.
