import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helper'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: items, error } = await supabase
      .from('reminder_items')
      .select(`
        *,
        person_details (*),
        subscription_details (*),
        task_details (*),
        holiday_details (*),
        recurrence_rules (*),
        notification_preferences (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const exportData = {
      format: 'remindme-export',
      version: 1,
      exported_at: new Date().toISOString(),
      email: user.email,
      settings: settings ? {
        timezone: settings.timezone,
        nudge_delay_hours: settings.nudge_delay_hours,
        default_channels: settings.default_channels,
        default_lead_time: settings.default_lead_time,
        default_custom_time: settings.default_custom_time,
      } : null,
      reminders: items ?? [],
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="remindme-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
