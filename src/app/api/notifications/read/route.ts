import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helper'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const now = new Date().toISOString()

    if (body.all) {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (body.id) {
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ read_at: now })
        .eq('id', body.id)
        .eq('user_id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: 'id or all required' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
