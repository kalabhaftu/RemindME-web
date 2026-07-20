import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const channelParam = (await params).channel;
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (channelParam === 'email') {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RemindME <onboarding@resend.dev>',
          to: user.email,
          subject: 'Test Notification - RemindME',
          html: '<p>This is a test notification from your RemindME settings.</p>'
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({ error: 'Failed to send email: ' + errorText }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    } 
    
    if (channelParam === 'telegram') {
      // Fetch user's telegram token
      const { data: channelData, error: dbError } = await supabase
        .from('notification_channels')
        .select('id, encrypted_token, chat_id_encrypted')
        .eq('user_id', user.id)
        .eq('channel', 'telegram')
        .single();
        
      if (dbError || !channelData?.encrypted_token) {
        return NextResponse.json({ error: 'Telegram token not found. Please save it first.' }, { status: 400 });
      }
      
      let token = channelData.encrypted_token;
      try {
        const { decrypt } = await import('@/lib/encryption');
        token = decrypt(token);
      } catch (e) {
        // If decryption fails, assume it might be a legacy raw token
        console.log('Using legacy raw token for Telegram test');
      }
      
      // verify the bot token works
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      if (!res.ok) {
        return NextResponse.json({ error: 'Invalid Telegram bot token' }, { status: 400 });
      }
      
      let chatId: string | number | null = null;
      if (channelData.chat_id_encrypted) {
        try {
          const { decrypt } = await import('@/lib/encryption');
          chatId = decrypt(channelData.chat_id_encrypted);
        } catch {
          chatId = null;
        }
      }

      if (!chatId) {
        const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
        if (!updatesRes.ok) {
          return NextResponse.json({ error: 'Failed to fetch updates from Telegram. Please make sure you have sent a message to the bot.' }, { status: 500 });
        }
        const updatesData = await updatesRes.json();
        const messages = updatesData.result || [];
        const lastMessage = [...messages].reverse().find(m => m.message?.chat?.id);
        if (!lastMessage) {
          return NextResponse.json({ error: 'No chat history found. Send /start to your bot once, then test again.' }, { status: 400 });
        }
        chatId = lastMessage.message.chat.id;
        await supabase
          .from('notification_channels')
          .update({ chat_id_encrypted: (await import('@/lib/encryption')).encrypt(String(chatId)) })
          .eq('id', channelData.id);
      }
      
      // Send the test message
      const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'This is a test notification from your RemindME settings! Your bot is correctly configured.',
        })
      });
      
      if (!sendRes.ok) {
        return NextResponse.json({ error: 'Failed to send test message via Telegram' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Test message sent successfully!' });
    }
    
    if (channelParam === 'push') {
      // Fetch ALL user push tokens (send to every registered device)
      const { data: channelData, error: dbError } = await supabase
        .from('notification_channels')
        .select('id, encrypted_token')
        .eq('user_id', user.id)
        .eq('channel', 'push');

      if (dbError || !channelData || channelData.length === 0) {
        return NextResponse.json({ error: 'Push device token not found. Please sign in to the mobile app first to register your device.' }, { status: 400 });
      }

      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccount) {
        return NextResponse.json({ error: 'FIREBASE_SERVICE_ACCOUNT is not configured on the web server.' }, { status: 500 });
      }

      try {
        const { FcmDeliveryError, sendFcmNotification } = await import('@/lib/fcm');
        const results = await Promise.allSettled(
          channelData.map((cd) =>
            sendFcmNotification(
              serviceAccount,
              cd.encrypted_token,
              'Test Notification',
              'This is a test push notification from your RemindME settings!'
            )
          )
        );
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          failed.forEach((r: any) => console.error('FCM delivery failure:', r.reason));
          await Promise.all(
            results.map((result, index) => {
              if (result.status !== 'rejected' || !(result.reason instanceof FcmDeliveryError) || !result.reason.unregistered) {
                return Promise.resolve();
              }
              return supabase.from('notification_channels').delete().eq('id', channelData[index].id);
            })
          );
          if (failed.length === results.length) {
            const staleCount = results.filter(
              result => result.status === 'rejected' && result.reason instanceof FcmDeliveryError && result.reason.unregistered
            ).length;
            return NextResponse.json({ error: staleCount === results.length ? 'Push token expired. Open the mobile app once to register this device again.' : 'All push deliveries failed', deviceCount: channelData.length }, { status: 410 });
          }
        }
      } catch (err: any) {
        return NextResponse.json({ error: 'FCM delivery failed: ' + err.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deviceCount: channelData.length });
    }
    
    if (channelParam === 'in_app') {
      const { error } = await supabase.from('in_app_notifications').insert({
        user_id: user.id,
        title: 'Test Notification',
        body: 'This is a test notification from your settings.'
      });
      if (error) {
        return NextResponse.json({ error: 'Failed to create in-app notification' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported channel' }, { status: 400 });
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
