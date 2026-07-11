import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAJgA94nvnv8lpBekeL_2umrdXuQM_GbVg',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'myfirebasemessagingservi-eadc7.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'myfirebasemessagingservi-eadc7',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'myfirebasemessagingservi-eadc7.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '811223410064',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:811223410064:web:695600d61c40fb2f167f15',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-5GFW5VGQK9',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY || ''

export async function requestFcmToken(): Promise<string | null> {
  if (!messaging) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return null
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    return token
  } catch (err) {
    console.error('FCM token registration failed:', err)
    return null
  }
}

export function onForegroundMessage(cb: (payload: any) => void) {
  if (!messaging) return
  onMessage(messaging, cb)
}
