# RemindME & Supabase Setup Guide (A to Z)

This guide documents the complete setup and configuration required to provision and configure a fresh Supabase project for **RemindME** (Web and Android Mobile apps).

---

## 1. Create a Supabase Project

1. Go to [database.new](https://database.new) or the [Supabase Dashboard](https://supabase.com/dashboard).
2. Choose your Organization.
3. Name your project (e.g. `RemindME`).
4. Set a strong **Database Password** (e.g. `kalremindme12`) and save it.
5. Select your Region (e.g. `EU (Ireland) - eu-west-1` or `EU (Frankfurt) - eu-central-1`).
6. Note down your **Project Reference ID** (found in Project Settings &rarr; General, e.g. `wysdrfnnsoaphrfxcotx`).

---

## 2. Database Extensions

Navigate to **Database &rarr; Extensions** in the Supabase Dashboard:
* `pg_cron` &mdash; **Enable**: Required for recurring reminder and nudge dispatch jobs.
* `pg_net` &mdash; **Enable**: Required for Postgres to trigger HTTP requests to Edge Functions.
* `supabase_vault` &mdash; Pre-installed by default under **Integrations &rarr; Vault** (no action needed).

---

## 3. Apply Database Migrations

You can push all migrations directly from the local repository to your remote database without installing local Postgres:

```bash
cd RemindME-web

# Dry-run test connection
npx supabase db push --dry-run --remote="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres"

# Push all migrations
npx supabase db push --yes --remote="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres"
```

### What the Migrations Provision:
* **Custom Enums**: `category_type`, `relationship_type`, `gender_type`, `cycle_type`, `frequency_type`, `channel_type`, `lead_time_type`, `delivery_status`.
* **Tables**: `reminder_items`, `person_details`, `subscription_details`, `task_details`, `holiday_details`, `recurrence_rules`, `notification_preferences`, `notification_channels`, `delivery_log`, `escalation_state`, `user_settings`, `in_app_notifications`, `reminder_templates`, `calendar_feed_tokens`, `snooze_state`.
* **Row-Level Security (RLS)**: Enforces `auth.uid() = user_id` on all public tables.
* **Storage Buckets**: `logos` and `avatars` public buckets with authenticated insert/update policies.
* **Realtime**: Publications enabled on `reminder_items`, `escalation_state`, `task_details`, `subscription_details`, `person_details`.

---

## 4. Vault Secrets Configuration

The reminder dispatch functions read credentials securely from Supabase Vault.

In **Integrations &rarr; Vault &rarr; Secrets** (or via migration `20261105231500_vault_secrets.sql`):
1. **`dispatch_edge_function_base_url`**:
   * Value: `https://<PROJECT_REF>.supabase.co/functions/v1`
2. **`dispatch_anon_key`**:
   * Value: Your Supabase Publishable / Anon key (e.g. `sb_publishable_...`).

---

## 5. Scheduled Cron Jobs (`pg_cron`)

The migrations automatically schedule two recurring jobs:
1. **`invoke-reminder-dispatch`**: Runs every minute (`* * * * *`) &rarr; executes `public.invoke_dispatch_edge_function()`.
2. **`invoke-nudge-dispatch`**: Runs every minute (`* * * * *`) &rarr; executes `public.invoke_dispatch_nudge_edge_function()`.

You can view active cron jobs in the SQL Editor:
```sql
SELECT jobid, jobname, schedule, command, active FROM cron.job;
```

---

## 6. Supabase Edge Functions

RemindME includes two Edge Functions located in `RemindME-web/supabase/functions`:
* `dispatch-reminder` &mdash; Dispatches notifications via Push (FCM), Email (Resend), Telegram, or in-app.
* `dispatch-nudge` &mdash; Checks for unacknowledged reminders needing escalation nudges.

### Deploy Edge Functions:
```bash
cd RemindME-web
npx supabase functions deploy dispatch-reminder --project-ref <PROJECT_REF>
npx supabase functions deploy dispatch-nudge --project-ref <PROJECT_REF>
```

---

## 7. Google OAuth Authentication Setup

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

## 8. Supabase Auth URL Configuration

Go to **Authentication &rarr; URL Configuration** in the Supabase Dashboard:

### 1. Site URL
Set to your production web base domain:
```text
https://remind-me-web-roan.vercel.app
```

### 2. Redirect URLs (Allow List)
Add these entries:
```text
https://remind-me-web-roan.vercel.app/**
remindme://login-callback
http://localhost:3000/**
```
> **Note**: `remindme://login-callback` is required for the native Android app deep-link callback after OAuth sign-in.

---

## 9. Environment Variables Reference

### Web Application (`RemindME-web/.env` and Vercel)
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

# Media & Emails
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=...
ENCRYPTION_KEY=...
```

### Syncing to Vercel via CLI:
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
GitHub Actions builds the signed `app-release.apk` and publishes it to GitHub Releases automatically without needing a local Android SDK or JDK installation.
