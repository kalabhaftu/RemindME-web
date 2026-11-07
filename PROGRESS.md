# RemindME Project Progress & Technical Roadmap

Last Updated: November 7, 2026

---

## 1. Project Status Overview

* **Supabase Project ID**: `wysdrfnnsoaphrfxcotx` (Region: `eu-west-1` Ireland)
* **Web Production URL**: `https://remind-me-web-roan.vercel.app`
* **Mobile Releases**: GitHub Releases `kalabhaftu/RemindME-mobile` (`v1.0.6` bumped and ready for release)
* **Telegram Bot**: `@DE2XB_bot` (Bot ID: `7985462251`, Chat ID: `5627916804`)
* **Primary Test Account**: `kalabhaftu05@gmail.com` (`5de1cc3c-1930-4ab0-8602-b845a3e6f474`)

---

## 2. GitHub Repository Secrets Required (For CI/CD)

The following secrets must be set in GitHub under **Settings &rarr; Secrets and variables &rarr; Actions**:

### A. `RemindME-web` Repository Secrets
| Secret Name | Value Description | Example / Location |
| :--- | :--- | :--- |
| `SUPABASE_PROJECT_ID` | Project reference ID | `wysdrfnnsoaphrfxcotx` |
| `SUPABASE_ACCESS_TOKEN` | Supabase Personal Access Token | From [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database connection password | `kalremindme12` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON | Raw JSON string from Firebase Console |
| `ENCRYPTION_KEY` | Telegram token encryption key | 32-character string |

### B. `RemindME-mobile` Repository Secrets
| Secret Name | Value Description | Current Status |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://wysdrfnnsoaphrfxcotx.supabase.co` | Configured |
| `SUPABASE_ANON_KEY` | Supabase publishable anon key | Configured |
| `WEB_API_URL` | `https://remind-me-web-roan.vercel.app` | Configured |
| `GOOGLE_WEB_CLIENT_ID` | OAuth 2.0 Web Client ID | Configured |
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded `.jks` release keystore | Configured in GitHub repo |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | Configured in GitHub repo |
| `ANDROID_KEY_ALIAS` | Key alias | Configured in GitHub repo |
| `ANDROID_KEY_PASSWORD` | Key password | Configured in GitHub repo |

---

## 3. Comprehensive Fixes & Implementation (11 User-Reported Areas)

### Area 1: Inconsistent Color Usage & Theme Rule Adherence - [COMPLETED]
* **Fix**: Unified component backgrounds using semantic tokens (`appControlColor()`, `appSurfaceColor()`, `Accent500`, `TextPrimary`, `TextSecondary`). Standardized primary button tint to vibrant `Accent500` with white text across all forms.

### Area 2: Dropdowns & Pickers Using Emojis Instead of Clean Vector Icons - [COMPLETED]
* **Fix**: Cleaned `RELATIONSHIP_LABELS` in `AppConstants.kt` to remove emoji literals (`👨‍👩‍👧`, `💑`, `👫`, `💍`). Dropdowns and detail cards now show clean textual labels without font rendering artifacts.

### Area 3: Form Layout Spacing & Multi-Screen Responsiveness - [COMPLETED]
* **Fix**: Replaced 0-margin and cramped stacks with standardized 16.dp vertical spacing between all form controls (`Name` &rarr; 16.dp &rarr; `DateTile` &rarr; 16.dp &rarr; `Gender` &rarr; 16.dp &rarr; `Relationship` &rarr; 16.dp &rarr; `Notes` &rarr; 24.dp &rarr; `Notifications`).

### Area 4: Text, Background, and Chip Sizing Inconsistency - [COMPLETED]
* **Fix**: Unified corner radius (16.dp) and heights (56.dp min-height for inputs and pickers, 52.dp for primary buttons).

### Area 5: Robust Offline Session Management & Zero Unwanted Logouts - [COMPLETED]
* **Fix**:
  * Implemented `AuthCache` (`remindme_auth_cache`) in SharedPreferences to persist `last_user_id` and `last_user_email`.
  * Updated `Navigation.kt`: On launch, if network fails or refresh token errors occur (`NotAuthenticated(isSignOut = false)`), cached session is preserved and user stays on `Main` with local cached data instead of being logged out.
  * Explicit sign-out properly clears `AuthCache` and transitions to `Login`.
  * Updated `OfflineReminderRepository.kt` to fall back to `AuthCache.getUserId(context)`.

### Area 6: Pull-to-Refresh Z-Index & Layout Position - [COMPLETED]
* **Fix**: Updated `AppPullToRefresh` to apply `topPadding = 100.dp` and `zIndex(50f)` on `PullToRefreshDefaults.Indicator`, ensuring the refresh spinner is positioned below the TopBar and above content.

### Area 7: Settings Screen Input UX & Save Feedback - [COMPLETED]
* **Fix**:
  * Replaced casual raw textfield for `nudgeDelayHours` with structured quick-choice chips (`1h`, `2h`, `4h`, `8h`, `12h`, `24h`).
  * Added live visual "Saved (Xh)" pill with a checkmark badge providing instant confirmation upon selection.
  * Updated default timing picker to display descriptive options:
    * "At time of event: Fires at 12:00 PM on the event date."
    * "Morning of: Fires at 09:00 AM in your timezone."
    * "Noon of: Fires at 12:00 PM in your timezone."
    * "Evening of: Fires at 18:00 (6:00 PM) in your timezone."
    * "Custom: Any exact time you choose (e.g., 15:00)."

### Area 8: Full Edit Page Feature Parity - [COMPLETED]
* **Fix**:
  * Fixed `AddPersonViewModel.loadPerson` to hydrate `customRelationship` and existing `notificationPreferences`.
  * Standardized button labels to "Save Changes" on all edit screens (`AddPersonScreen`, `AddSubscriptionScreen`, `AddTaskScreen`).
  * Updated `ReminderPreviewScreen` with complete subscription details (currency, amount, cycle, next renewal), notification preferences with advance day offsets, and a delete reminder action with confirmation.

### Area 9: Visual Alignment & Uniform Component Styling in Add Screens - [COMPLETED]
* **Fix**:
  * Harmonized `AppTextField`, `PickerField` in `BottomSheetPicker.kt`, and `DateTile.kt` to share `appControlColor()`, `RoundedCornerShape(16.dp)`, and 56.dp touch targets.
  * Harmonized `AppButton` to `RoundedCornerShape(16.dp)`, 52.dp minimum height, and `Accent500` tint.

### Area 10: Web and Mobile Full Feature Parity - [COMPLETED]
* **Fix**:
  * Implemented local multi-alert scheduling in `NotificationSchedulingService.kt` so all enabled channels and advance offsets schedule discrete alarms instead of only the earliest.
  * Aligned task icon keys between Web and Mobile (`drop`, `barbell`, `book`, `money`, `pill`, `trash`).

### Area 11: Alignment, Heights & Typography Harmonization - [COMPLETED]
* **Fix**: Aligned row content in Currency/Amount, DateTile icon and label baselines, and removed mismatched card wrappers.

---

## 4. Offline Add & Background Sync Architecture - [COMPLETED]

* **Local Cache Creation**:
  * When adding People, Subscriptions, or Tasks offline, `Add*ViewModel` resolves `userId` via `AuthCache.getUserId(getApplication())` and generates client UUIDs.
  * `OfflineReminderRepository.addReminder()` saves the item locally to SQLite and enqueues an `add` operation in `pending_ops`.
* **Background Logo Resolver**:
  * If a subscription is added offline, it saves with the user-typed name.
  * During `OfflineReminderRepository.syncPending()`, when connection is restored, background `LogoResolver.resolve(item.name)` automatically fetches the brand logo before saving to remote.
* **Auto-Sync on Connectivity**:
  * Connectivity listener / `OfflineSyncWorker` picks up pending operations and syncs them to Supabase without user intervention.

---

## 5. Mobile Version Bump

* Bumped `RemindME-mobile/app/build.gradle.kts`:
  * `versionCode = 6`
  * `versionName = "1.0.6"`

---

## 6. Local Android Build Environment (Paused Until Fast Connection)
* Root: `C:\Android\sdk` (contains `cmdline-tools/latest`, `platform-tools`).
* When fast connection is available:
  1. `winget install Microsoft.OpenJDK.21`
  2. `sdkmanager "platforms;android-36" "build-tools;36.0.0"`
  3. `./gradlew assembleRelease`
