import { createClient } from '@supabase/supabase-js';

// Публичный (publishable) ключ — он живёт в каждом клиентском бандле, это норма:
// безопасность держится не на секретности ключа, а на RLS в базе.
// Секретный ключ (sb_secret_…) в клиент не попадает — он только на сервере.
export const SUPABASE_URL = 'https://vnylpvmhelzlxusvydab.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mMoc0qtDgEURev1yF2ieFg_78QmwOq0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bushka:auth' }
});
