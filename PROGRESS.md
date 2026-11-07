# RemindME Project Progress & Technical Roadmap

Last Updated: November 7, 2026

---

## 1. Project Status Overview

* **Supabase Project ID**: `wysdrfnnsoaphrfxcotx` (Region: `eu-west-1` Ireland)
* **Web Production URL**: `https://remind-me-web-roan.vercel.app`
* **Mobile Releases**: GitHub Releases `kalabhaftu/RemindME-mobile` (`v1.0.5` active)
* **Telegram Bot**: `@DE2XB_bot` (Bot ID: `7985462251`, Chat ID: `5627916804`)
* **Primary Test Account**: `kalabhaftu05@gmail.com` (`5de1cc3c-1930-4ab0-8602-b845a3e6f474`)

---

## 2. Completed Milestones

### A. Database & Backend Engine
- [x] **32+ Database Migrations Applied**: All custom enums, tables, RLS policies, indexes, and storage buckets migrated.
- [x] **Multi-Stage Alert Architecture**: Created migration `20261107200000_multi_alert_stage_support.sql` adding `preference_id` to `delivery_log` and updating `reminder_occurrences_due` and `reminder_occurrence_all_channels_terminal`. Allows dual reminders (e.g. 1 day before in evening + day of event in morning) per channel without premature recurrence advancement.
- [x] **Supabase Vault Secrets**: Configured `dispatch_edge_function_base_url` and `dispatch_anon_key` inside Postgres Vault.
- [x] **Automated Background Cron (`pg_cron`)**:
  - `invoke-reminder-dispatch` running every minute (`* * * * *`).
  - `invoke-nudge-dispatch` running every minute (`* * * * *`).
- [x] **Edge Functions Deployed & Secured**:
  - `dispatch-reminder` deployed with `--no-verify-jwt`.
  - `dispatch-nudge` deployed with `--no-verify-jwt`.
  - Secrets injected: `RESEND_API_KEY`, `FIREBASE_SERVICE_ACCOUNT`, `ENCRYPTION_KEY`.
- [x] **Live Dispatch Verified**: Automatic dispatch by `pg_cron` triggered at 18:36 UTC for Ealyab, verified delivered via Telegram, Email, and In-App.

### B. CI/CD & Automation
- [x] **Automated Supabase Deployment Workflow**: Created `.github/workflows/deploy-supabase.yml` in `RemindME-web` to auto-deploy migrations, edge functions, and sync secrets on push to `main`.
- [x] **One-Click Local Deployment Scripts**:
  - Windows PowerShell: `RemindME-web/scripts/deploy-supabase.ps1`
  - Linux/macOS Bash: `RemindME-web/scripts/deploy-supabase.sh`
- [x] **Vercel Synchronization**: All 20 environment variables linked and pushed to `remind-me-web` across Production, Preview, and Development.

### C. Data Ingestion & Contact Management
- [x] **31 Contacts Inserted**: All 31 people from screenshots and chat logs inserted for user `kalabhaftu05@gmail.com` with birthdays and relationships.
- [x] **124 Notification Preferences**: Configured all 4 channels (`push`, `email`, `telegram`, `in_app`) across all 31 contacts, deduplicated.

### D. Mobile App Updates (`RemindME-mobile`)
- [x] **Dynamic Calculated Lead Time UI**: Updated `NotificationPrefsForm.kt` and `BottomSheetPicker.kt` to dynamically calculate and display exact dates and times (e.g. "At time of event: Fires at 12:00 PM on Jul 24", "Morning of: Fires at 09:00 AM on Jul 23 in your timezone", etc.) based on user date selection and offset days.
- [x] **Notification Channels Defaults Sync**: Fixed bug in `NotificationPrefsStore.kt` and `SettingsViewModel.kt` where Telegram defaulted to OFF when adding new contacts. Channels now default to ON and sync seamlessly with user settings.
- [x] **Responsive Picker Layout**: Updated bottom sheet items to flex-wrap cleanly without clipping checkmarks.

### E. Documentation
- [x] **Comprehensive Setup Guide**: Updated `RemindME-web/SUPABASE_SETUP_GUIDE.md` detailing full A-to-Z setup including edge functions, secrets, vault, OAuth, Vercel, and CI/CD.

---

## 3. Local Android Build Environment (Saved for Fast Connection)

The local build environment has been prepared and organized on your system. **Local compilation is currently paused** to avoid timeouts on slow connections.

### Configured Components on Disk:
1. **Android SDK Root**: Established canonical location at `C:\Android\sdk`.
2. **Command-Line Tools**: Installed at `C:\Android\sdk\cmdline-tools\latest` (`sdkmanager` version 12.0 verified).
3. **Platform Tools**: Installed at `C:\Android\sdk\platform-tools` (`adb` version 1.0.41 verified).
4. **Environment Variables**:
   - `ANDROID_HOME = C:\Android\sdk`
   - User `PATH` updated with `C:\Android\sdk\platform-tools` and `C:\Android\sdk\cmdline-tools\latest\bin`.
5. **Local Properties**: Added `sdk.dir=C\:\\Android\\sdk` to `RemindME-mobile/local.properties`.
6. **Gradle Wrapper**: Wrapper configured for Gradle 9.1 (`RemindME-mobile/gradle/wrapper/gradle-wrapper.properties`).

### Action Plan Once on Fast Connection:
1. **Install JDK 21 (LTS)**:
   > **Note**: Your current `jdk-26.0.2` is early-access Java 26, which is incompatible with Android Gradle Plugin 9.0 and Kotlin compiler (causes class version errors).
   ```powershell
   winget install Microsoft.OpenJDK.21
   ```
2. **Download Android SDK Platform 36 (~80 MB)**:
   ```powershell
   sdkmanager "platforms;android-36"
   ```
3. **Download Android Build-Tools 36 (~60 MB)**:
   ```powershell
   sdkmanager "build-tools;36.0.0"
   ```
4. **Run Local Build**:
   ```powershell
   cd RemindME-mobile
   .\gradlew.bat assembleDebug
   ```

---

## 4. Next Steps & Pending Items
1. Apply the multi-alert stage migration to the live Supabase project when connection allows.
2. Commit and push all new backend and documentation files.
3. Review user's upcoming list of requested fixes.
