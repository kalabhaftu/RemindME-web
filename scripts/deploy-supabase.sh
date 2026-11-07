#!/usr/bin/env bash
set -e

PROJECT_REF="${1:-wysdrfnnsoaphrfxcotx}"

echo "=== Deploying RemindME Supabase Components to [$PROJECT_REF] ==="

# 1. Link Project
echo -e "\n[1/4] Linking Supabase project..."
npx supabase link --project-ref "$PROJECT_REF"

# 2. Push Migrations
echo -e "\n[2/4] Pushing Database Migrations..."
npx supabase db push --yes

# 3. Deploy Edge Functions
echo -e "\n[3/4] Deploying Edge Functions..."
npx supabase functions deploy dispatch-reminder --no-verify-jwt --project-ref "$PROJECT_REF"
npx supabase functions deploy dispatch-nudge --no-verify-jwt --project-ref "$PROJECT_REF"

# 4. Set Edge Function Secrets from .env.local if present
echo -e "\n[4/4] Setting Edge Function Secrets..."
if [ -f ".env.local" ]; then
  RESEND_KEY=$(grep -E '^RESEND_API_KEY=' .env.local | cut -d '=' -f2- | tr -d '"' || true)
  ENC_KEY=$(grep -E '^ENCRYPTION_KEY=' .env.local | cut -d '=' -f2- | tr -d '"' || true)
  FIREBASE_SA=$(grep -E '^FIREBASE_SERVICE_ACCOUNT=' .env.local | cut -d '=' -f2- | tr -d "'" || true)

  SECRETS=()
  [ -n "$RESEND_KEY" ] && SECRETS+=("RESEND_API_KEY=$RESEND_KEY")
  [ -n "$ENC_KEY" ] && SECRETS+=("ENCRYPTION_KEY=$ENC_KEY")
  [ -n "$FIREBASE_SA" ] && SECRETS+=("FIREBASE_SERVICE_ACCOUNT=$FIREBASE_SA")

  if [ ${#SECRETS[@]} -gt 0 ]; then
    npx supabase secrets set "${SECRETS[@]}" --project-ref "$PROJECT_REF"
    echo "Edge Function secrets updated."
  fi
fi

echo -e "\n=== Supabase Deployment Completed Successfully! ==="
