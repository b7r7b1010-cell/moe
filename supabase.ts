
import { createClient } from '@supabase/supabase-js';

// تم تصحيح الرابط هنا بناءً على معرف المشروع الصحيح (acddg)
const supabaseUrl = 'https://wtbkorxinnacddgksyzk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Ymtvcnhpbm5hY2RkZ2tzeXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzgyMzcsImV4cCI6MjA4NTA1NDIzN30.43heLFdZgNC1hNTqC1zWyDpH5hOAsk023_J8fv6gPFU';

export const supabase = createClient(supabaseUrl, supabaseKey);

// وظيفة فحص اتصال محسنة للتعامل مع حالات الـ Timeout
export const testSupabaseConnection = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); 

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    // إذا عاد الرد بـ 200 أو حتى 401 (غير مصرح) فهذا يعني أن الخادم موجود ومتاح
    return { ok: response.status >= 200 && response.status < 500 };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { ok: false, error: err.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_ERROR' };
  }
};
