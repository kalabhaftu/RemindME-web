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
      
      const token = channelData.encrypted_token;
      
      // Since we might not have a chat_id yet to send a real message, we will just verify the bot token works
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      if (!res.ok) {
        return NextResponse.json({ error: 'Invalid Telegram bot token' }, { status: 400 });
      }
      
      // We cannot send a test message yet because we need the user to chat with the bot to establish a chat_id. 
      // For this test, verifying the bot token via getMe is sufficient to prove the credentials are correct.
      return NextResponse.json({ success: true, message: 'Telegram token verified successfully!' });
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
