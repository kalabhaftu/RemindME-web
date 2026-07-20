export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';

  const swScript = `importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: ${JSON.stringify(apiKey)},
  authDomain: ${JSON.stringify(authDomain)},
  projectId: ${JSON.stringify(projectId)},
  storageBucket: ${JSON.stringify(storageBucket)},
  messagingSenderId: ${JSON.stringify(messagingSenderId)},
  appId: ${JSON.stringify(appId)},
})

var messaging = firebase.messaging()

messaging.onBackgroundMessage(function (payload) {
  var notification = payload.notification || payload.data || {}
  var reminderId = notification.reminder_item_id
  var category = notification.category
  var path = '/notifications'
  if (reminderId && category === 'person') path = '/people/' + reminderId + '/edit'
  if (reminderId && category === 'subscription') path = '/subscriptions/' + reminderId + '/edit'
  if (reminderId && category === 'task') path = '/tasks/' + reminderId + '/edit'
  if (reminderId && category === 'custom_holiday') path = '/holidays/' + reminderId + '/edit'
  self.registration.showNotification(notification.title || 'RemindME', {
    body: notification.body || '',
    icon: '/icon.png',
    badge: '/favicon.ico',
    data: { path: path },
  })
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var path = event.notification.data && event.notification.data.path || '/notifications'
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
    for (var i = 0; i < clientList.length; i++) {
      if ('focus' in clientList[i]) {
        clientList[i].navigate(path)
        return clientList[i].focus()
      }
    }
    return clients.openWindow(path)
  }))
})
`;

  return new Response(swScript, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
    },
  });
}
