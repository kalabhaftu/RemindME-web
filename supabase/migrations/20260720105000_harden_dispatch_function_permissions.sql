revoke execute on function public.invoke_dispatch_edge_function() from public, anon, authenticated, service_role;
grant execute on function public.invoke_dispatch_edge_function() to postgres;

revoke execute on function public.reminder_occurrences_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_occurrences_due(timestamptz) to postgres, service_role;

revoke execute on function public.reminders_needing_nudge() from public, anon, authenticated;
grant execute on function public.reminders_needing_nudge() to postgres, service_role;

revoke execute on function public.advance_reminder_occurrence(uuid) from public, anon, authenticated;
grant execute on function public.advance_reminder_occurrence(uuid) to postgres, service_role;

revoke execute on function public.trigger_nudge_engine() from public, anon, authenticated, service_role;
grant execute on function public.trigger_nudge_engine() to postgres;
alter function public.trigger_nudge_engine() set search_path = public;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;
grant execute on function public.rls_auto_enable() to postgres;
