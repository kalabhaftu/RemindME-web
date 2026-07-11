importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

var params = new URLSearchParams(self.location.search)
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

var messaging = firebase.messaging()

messaging.onBackgroundMessage(function (payload) {
  var notification = payload.notification || {}
  self.registration.showNotification(notification.title || 'RemindME', {
    body: notification.body || '',
    icon: '/icon.png',
    badge: '/favicon.ico',
  })
})
