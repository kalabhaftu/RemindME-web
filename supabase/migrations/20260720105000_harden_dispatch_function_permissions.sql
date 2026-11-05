revoke execute on function public.invoke_dispatch_edge_function() from public, anon, authenticated, service_role;
grant execute on function public.invoke_dispatch_edge_function() to postgres;

revoke execute on function public.reminder_occurrences_due(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_occurrences_due(timestamptz) to postgres, service_role;

revoke execute on function public.reminders_needing_nudge() from public, anon, authenticated;
grant execute on function public.reminders_needing_nudge() to postgres, service_role;

revoke execute on function public.advance_reminder_occurrence(uuid) from public, anon, authenticated;
grant execute on function public.advance_reminder_occurrence(uuid) to postgres, service_role;
