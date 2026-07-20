import { LegalDocument } from '@/components/LegalDocument'

export default function PrivacyPage() {
  return <LegalDocument title="Privacy Policy" updated="July 20, 2026" sections={[
    { title: 'Information we store', body: ['RemindME stores your account identity, reminders, notification preferences, timezone, delivery status, and settings needed to provide the service.', 'If you import a contact, the information you choose is used to create the person reminder. Android contact access is permission-gated by the operating system.'] },
    { title: 'Connected services', body: ['When enabled, RemindME sends reminder content to the providers you select, such as email, Firebase Cloud Messaging, Telegram, or an external calendar reader. Provider privacy policies also apply.', 'Avatars and logos may be stored through configured media storage so they can be displayed across your devices.'] },
    { title: 'Security', body: ['Sensitive provider credentials and private calendar feed tokens are protected server-side. Never share a Telegram token, calendar URL, or account session.', 'No security measure is perfect. Report suspected account or delivery issues through feedback and rotate affected credentials promptly.'] },
    { title: 'Your choices', body: ['You can change notification channels, export supported account data as JSON, rotate the calendar feed link, sign out all devices, or permanently delete your account from Settings.', 'You may contact us with privacy questions or requests. This draft should receive legal review before public launch.'] },
    { title: 'Retention', body: ['Account data is retained while your account is active and removed when account deletion completes, subject to operational backups and provider retention limits.'] },
  ]} />
}
