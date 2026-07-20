import { LegalDocument } from '@/components/LegalDocument'

export default function TermsPage() {
  return <LegalDocument title="Terms of Service" updated="July 20, 2026" sections={[
    { title: 'Using RemindME', body: ['RemindME helps you organize personal reminders, birthdays, subscriptions, holidays, and tasks. You are responsible for the accuracy of reminder information and for reviewing notifications before acting on them.', 'You must use the service lawfully and must not abuse delivery channels, attempt unauthorized access, or use another person’s account.'] },
    { title: 'Notifications and integrations', body: ['Email, push, in-app, Telegram, and calendar subscriptions are optional channels. Delivery depends on the connected provider, device permissions, network availability, and the settings you choose.', 'Calendar feeds are read-only private links. Treat a feed link like a password and regenerate it if you believe it was exposed.'] },
    { title: 'Your data', body: ['You retain ownership of the reminder, contact, avatar, and other content you submit. You can export supported account data as JSON and request account deletion from Settings.', 'RemindME may suspend access when necessary to protect the service, users, or delivery providers.'] },
    { title: 'Availability and responsibility', body: ['RemindME is provided on an availability basis. It is not an emergency alert system and should not be used as the sole safeguard for medical, financial, legal, or safety-critical deadlines.', 'These draft terms should be reviewed and approved for the jurisdictions where RemindME is offered before public launch.'] },
    { title: 'Contact', body: ['Questions or feedback can be sent through the feedback action in Settings.'] },
  ]} />
}
