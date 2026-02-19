import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');

    if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await adminClient.rpc('process_scheduled_allowances');

    if (error) {
      console.error('process_scheduled_allowances error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const processed: Array<{
      kid_id: string;
      kid_name: string;
      family_id: string;
      amount_added: number;
      payments_count: number;
    }> = data ?? [];

    console.log(`Processed ${processed.length} allowance(s)`);

    for (const row of processed) {
      try {
        await adminClient.functions.invoke('send-push', {
          body: {
            family_id: row.family_id,
            notification: {
              title: `Allowance for ${row.kid_name}`,
              message: `${row.kid_name} received $${Number(row.amount_added).toFixed(2)} in allowance.`,
            },
          },
        });
      } catch (pushErr) {
        console.error('Push notification failed for', row.kid_name, pushErr);
      }
    }

    return new Response(
      JSON.stringify({ processed: processed.length, details: processed }),
      { headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  } catch (err) {
    console.error('process-allowances error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
