import { NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Basic Telegram token format validation
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      return NextResponse.json({ error: 'Invalid Telegram bot token format' }, { status: 400 });
    }

    // Validate token with Telegram and get bot info
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!tgRes.ok) {
      return NextResponse.json({ error: 'Invalid Telegram bot token — could not connect to your bot.' }, { status: 400 });
    }
    const tgData = await tgRes.json();
    const botUsername = tgData.result?.username as string | undefined;

    const encryptedToken = encrypt(token);

    const { data: existing, error: fetchError } = await supabase
      .from('notification_channels')
      .select('id')
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to check token' }, { status: 500 });
    }

    let error;
    if (existing) {
      const { error: updateErr } = await supabase
        .from('notification_channels')
        .update({
          encrypted_token: encryptedToken,
          label: botUsername ? `@${botUsername}` : null,
        })
        .eq('id', existing.id);
      error = updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('notification_channels')
        .insert({
          user_id: user.id,
          channel: 'telegram',
          encrypted_token: encryptedToken,
          label: botUsername ? `@${botUsername}` : null,
        });
      error = insertErr;
    }

    if (error) {
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
    }

    return NextResponse.json({ success: true, botUsername });
  } catch (error: any) {
    console.error('Save telegram token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('notification_channels')
      .delete()
      .eq('user_id', user.id)
      .eq('channel', 'telegram');

    if (error) {
      return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete telegram token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_channels')
      .select('encrypted_token, label')
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
      .single();

    if (error || !data?.encrypted_token) {
      return NextResponse.json({ hasToken: false });
    }

    // Decrypt, mask and fetch bot username from metadata
    try {
      const { decrypt, maskToken } = await import('@/lib/encryption');
      const decrypted = decrypt(data.encrypted_token);
      const masked = maskToken(decrypted);

      let botUsername: string | null = null;

      // label is stored as "@username" — strip the @ for the URL
      if (data.label) {
        botUsername = data.label.replace(/^@/, '');
      } else {
        // Fallback: re-verify live with Telegram
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${decrypted}/getMe`);
          if (tgRes.ok) {
            const tgData = await tgRes.json();
            botUsername = tgData.result?.username ?? null;
          }
        } catch {}
      }

      return NextResponse.json({ hasToken: true, maskedToken: masked, botUsername });
    } catch (e) {
      console.error('Decryption error:', e);
      return NextResponse.json({ hasToken: true, maskedToken: '********', botUsername: null });
    }
  } catch (error: any) {
    console.error('Get telegram token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
