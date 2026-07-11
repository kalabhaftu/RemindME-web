import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
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

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Basic Telegram token format validation
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      return NextResponse.json({ error: 'Invalid Telegram bot token format' }, { status: 400 });
    }

    const encryptedToken = encrypt(token);

    const { error } = await supabase.from('notification_channels').upsert({
      user_id: user.id,
      channel: 'telegram',
      encrypted_token: encryptedToken
    }, { onConflict: 'user_id,channel' });

    if (error) {
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save telegram token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_channels')
      .select('encrypted_token')
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
      .single();

    if (error || !data?.encrypted_token) {
      return NextResponse.json({ hasToken: false });
    }

    // Decrypt and mask
    try {
      const { decrypt, maskToken } = await import('@/lib/encryption');
      const decrypted = decrypt(data.encrypted_token);
      const masked = maskToken(decrypted);
      return NextResponse.json({ hasToken: true, maskedToken: masked });
    } catch (e) {
      console.error('Decryption error:', e);
      // If decryption fails (e.g. legacy unencrypted text), we just say it has a token but can't mask safely
      return NextResponse.json({ hasToken: true, maskedToken: '********' });
    }
  } catch (error: any) {
    console.error('Get telegram token error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
