
import { createClient } from '@supabase/supabase-js';

// رابط ومعرف المشروع في Supabase
const supabaseUrl = 'https://wtbkorxinnacddgksyzk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0Ymtvcnhpbm5hY2RkZ2tzeXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NzgyMzcsImV4cCI6MjA4NTA1NDIzN30.43heLFdZgNC1hNTqC1zWyDpH5hOAsk023_J8fv6gPFU';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

/**
 * دالة تفريغ وتطهير التخزين المحلي من رموز الجلسة التالفة أو المنتهية
 */
export const clearAuthStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
          toRemove.push(key);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Failed to clear localStorage keys:', e);
  }

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
          sToRemove.push(key);
        }
      }
      sToRemove.forEach(k => sessionStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Failed to clear sessionStorage keys:', e);
  }
};

/**
 * تسجيل خروج آمن محلياً يمنع خطأ "Invalid Refresh Token: Refresh Token Not Found"
 */
export const safeSignOut = async () => {
  try {
    // نستخدم scope: 'local' حتى لا يفشل الطلب إذا كان رمز التحديث محذوفاً أو غير صالح في الخادم
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.warn('Safe signOut (local error handled):', err);
  } finally {
    clearAuthStorage();
  }
};

// اعتراض أخطاء Refresh Token على مستوى المتصفح ومعالجتها تلقائياً دون تعليق التطبيق
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const errorMsg = event.reason?.message || String(event.reason || '');
    if (
      errorMsg.includes('Invalid Refresh Token') ||
      errorMsg.includes('Refresh Token Not Found') ||
      errorMsg.includes('refresh_token_not_found')
    ) {
      console.warn('Prevented unhandled rejection for invalid refresh token. Cleaning up session.');
      event.preventDefault();
      clearAuthStorage();
      try {
        supabase.auth.signOut({ scope: 'local' });
      } catch {}
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || event.error?.message || '';
    if (
      errorMsg.includes('Invalid Refresh Token') ||
      errorMsg.includes('Refresh Token Not Found') ||
      errorMsg.includes('refresh_token_not_found')
    ) {
      console.warn('Prevented window error for invalid refresh token.');
      event.preventDefault();
      clearAuthStorage();
    }
  });
}

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
    return { ok: response.status >= 200 && response.status < 500 };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { ok: false, error: err.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_ERROR' };
  }
};
