import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/encryption'
import { getAuthenticatedUser } from '@/lib/auth-helper'
import { resolveTelegramChatId } from '@/lib/telegram'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { chatId } = await request.json()
    if (!chatId || !/^-?\d+$/.test(String(chatId))) {
      return NextResponse.json({ error: 'Valid numeric Chat ID is required' }, { status: 400 })
    }

    const { data: row, error } = await supabase
      .from('notification_channels')
      .select('id')
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
      .maybeSingle()

    if (error || !row) {
      return NextResponse.json({ error: 'Save your bot token first' }, { status: 400 })
    }

    const { error: updateErr } = await supabase
      .from('notification_channels')
      .update({ chat_id_encrypted: encrypt(String(chatId)) })
      .eq('id', row.id)

    if (updateErr) return NextResponse.json({ error: 'Failed to save Chat ID' }, { status: 500 })
    return NextResponse.json({ success: true, chatId: String(chatId) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Auto-detect chat ID from recent bot messages and persist it */
export async function PUT(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: row, error } = await supabase
      .from('notification_channels')
      .select('encrypted_token, chat_id_encrypted')
      .eq('user_id', user.id)
      .eq('channel', 'telegram')
      .maybeSingle()

    if (error || !row?.encrypted_token) {
      return NextResponse.json({ error: 'Save your bot token first' }, { status: 400 })
    }

    let token = row.encrypted_token
    try {
      token = decrypt(token)
    } catch { /* legacy raw */ }

    const chatId = await resolveTelegramChatId(token, row)

    const { error: updateErr } = await supabase
      .from('notification_channels')
      .update({ chat_id_encrypted: encrypt(chatId) })
      .eq('user_id', user.id)
      .eq('channel', 'telegram')

    if (updateErr) return NextResponse.json({ error: 'Failed to save detected Chat ID' }, { status: 500 })
    return NextResponse.json({ success: true, chatId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
