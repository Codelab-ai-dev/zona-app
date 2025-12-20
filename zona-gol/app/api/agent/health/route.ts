import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string; details?: any }> = {};

  // 1. Check LLM API Key (Groq or OpenAI)
  const llmApiKey = process.env.LLM_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const llmProvider = process.env.LLM_API_KEY ? 'custom' : process.env.GROQ_API_KEY ? 'groq' : 'openai';
  checks.llm = {
    ok: !!llmApiKey,
    error: llmApiKey ? undefined : 'LLM API key not configured (set GROQ_API_KEY or OPENAI_API_KEY)',
    details: {
      provider: llmProvider,
      model: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
    },
  };

  // 1b. Check OpenAI API Key (for embeddings)
  checks.embeddings = {
    ok: !!process.env.OPENAI_API_KEY,
    error: process.env.OPENAI_API_KEY ? undefined : 'OPENAI_API_KEY not configured (needed for embeddings)',
  };

  // 2. Check Kapso API Key
  checks.kapso = {
    ok: !!process.env.KAPSO_API_KEY,
    error: process.env.KAPSO_API_KEY ? undefined : 'KAPSO_API_KEY not configured',
  };

  // 3. Check Database connection
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('leagues').select('id').limit(1);
    checks.database = {
      ok: !error,
      error: error?.message,
    };
  } catch (e: any) {
    checks.database = { ok: false, error: e.message };
  }

  // 4. Check agent tables exist
  try {
    const supabase = await createServerSupabaseClient();

    const tables = ['whatsapp_user_links', 'agent_conversations'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id').limit(1);
      checks[`table_${table}`] = {
        ok: !error,
        error: error?.message,
      };
    }
  } catch (e: any) {
    checks.agent_tables = { ok: false, error: e.message };
  }

  // 5. Check is_within_24h_window function
  try {
    const supabase = await createServerSupabaseClient();
    // @ts-ignore
    const { error } = await supabase.rpc('is_within_24h_window', {
      p_phone_number: '+0000000000',
    });
    checks.function_24h_window = {
      ok: !error,
      error: error?.message,
    };
  } catch (e: any) {
    checks.function_24h_window = { ok: false, error: e.message };
  }

  // 6. Check whatsapp_user_links count
  try {
    const supabase = await createServerSupabaseClient();
    const { count, error } = await supabase
      .from('whatsapp_user_links')
      .select('*', { count: 'exact', head: true });
    checks.whatsapp_links = {
      ok: !error,
      error: error?.message,
      details: { count },
    };
  } catch (e: any) {
    checks.whatsapp_links = { ok: false, error: e.message };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    status: allOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  });
}
