import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string }> }
) {
  try {
    const channelParam = (await params).channel;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
        .select('encrypted_token')
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
      
      // Try to get chat_id from getUpdates
      const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
      if (!updatesRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch updates from Telegram. Please make sure you have sent a message to the bot.' }, { status: 500 });
      }
      
      const updatesData = await updatesRes.json();
      const messages = updatesData.result || [];
      if (messages.length === 0) {
        return NextResponse.json({ error: 'No chat history found. Please send a message (e.g., /start) to your bot first, then try testing again.' }, { status: 400 });
      }
      
      // Find the most recent valid chat_id
      const lastMessage = [...messages].reverse().find(m => m.message?.chat?.id);
      if (!lastMessage) {
        return NextResponse.json({ error: 'Could not extract your chat ID from recent messages. Please send a new text message to the bot and try again.' }, { status: 400 });
      }
      const chatId = lastMessage.message.chat.id;
      
      // Send the test message
      const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ This is a test notification from your RemindME settings! Your bot is correctly configured.',
        })
      });
      
      if (!sendRes.ok) {
        return NextResponse.json({ error: 'Failed to send test message via Telegram' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Test message sent successfully!' });
    }
    
    if (channelParam === 'push') {
      // Push requires FCM setup
      return NextResponse.json({ success: true, message: 'Push test simulation successful' });
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
