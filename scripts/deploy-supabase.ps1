# Deploy Supabase Database Migrations, Edge Functions, and Secrets locally
param (
    [string]$ProjectRef = "wysdrfnnsoaphrfxcotx"
)

Write-Host "=== Deploying RemindME Supabase Components to [$ProjectRef] ===" -ForegroundColor Cyan

# 1. Link Project
Write-Host "`n[1/4] Linking Supabase project..." -ForegroundColor Yellow
npx supabase link --project-ref $ProjectRef

# 2. Push Migrations
Write-Host "`n[2/4] Pushing Database Migrations..." -ForegroundColor Yellow
npx supabase db push --yes

# 3. Deploy Edge Functions
Write-Host "`n[3/4] Deploying Edge Functions..." -ForegroundColor Yellow
npx supabase functions deploy dispatch-reminder --no-verify-jwt --project-ref $ProjectRef
npx supabase functions deploy dispatch-nudge --no-verify-jwt --project-ref $ProjectRef

# 4. Set Edge Function Secrets from .env.local if present
Write-Host "`n[4/4] Setting Edge Function Secrets..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    $resendKey = if ($envContent -match 'RESEND_API_KEY="?([^"\r\n]+)') { $matches[1] } else { "" }
    $encKey = if ($envContent -match 'ENCRYPTION_KEY="?([^"\r\n]+)') { $matches[1] } else { "" }
    $firebaseSa = if ($envContent -match 'FIREBASE_SERVICE_ACCOUNT=''([^'']+)''') { $matches[1] } else { "" }

    $secrets = @()
    if ($resendKey) { $secrets += "RESEND_API_KEY=$resendKey" }
    if ($encKey) { $secrets += "ENCRYPTION_KEY=$encKey" }
    if ($firebaseSa) { $secrets += "FIREBASE_SERVICE_ACCOUNT=$firebaseSa" }

    if ($secrets.Count -gt 0) {
        npx supabase secrets set $secrets --project-ref $ProjectRef
        Write-Host "Edge Function secrets updated successfully." -ForegroundColor Green
    }
}

Write-Host "`n=== Supabase Deployment Completed Successfully! ===" -ForegroundColor Green
