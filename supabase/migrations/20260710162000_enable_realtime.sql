-- Enable realtime for tables
alter publication supabase_realtime add table reminder_items;
alter publication supabase_realtime add table escalation_state;
alter publication supabase_realtime add table task_details;
alter publication supabase_realtime add table person_details;
alter publication supabase_realtime add table subscription_details;
alter publication supabase_realtime add table recurrence_rules;
