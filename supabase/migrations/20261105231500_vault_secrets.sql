DELETE FROM vault.secrets WHERE name IN ('dispatch_edge_function_base_url', 'dispatch_anon_key');
SELECT vault.create_secret('https://wysdrfnnsoaphrfxcotx.supabase.co/functions/v1', 'dispatch_edge_function_base_url');
SELECT vault.create_secret('sb_publishable_Ft0eEnWaaX-t9xLkqdFOxA_DRHkYrJ9', 'dispatch_anon_key');
