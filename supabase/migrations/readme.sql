-- view all jobs 

select jobid, jobname, schedule, command, nodename, nodeport, database, username, active
from cron.job
order by jobname;

-- drop job

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'dispatch_engine'
  ) THEN
    PERFORM cron.unschedule('dispatch_engine');
  END IF;
END $$;

-- it was an update for 20260719000000_fix_reminder_occurrences_due.sql