
import React, { useState, useEffect } from 'react';
import { supabase, safeSignOut } from './supabase';
import { Profile, UserRole } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PrincipalDashboard from './components/PrincipalDashboard';
import { Loader2, WifiOff, RefreshCw, Clock, ShieldAlert, LogOut } from 'lucide-react';

// ملف App.tsx مع حماية كاملة من التعليق وإمكانية الدخول التجريبي السريع
const DEMO_PRINCIPAL: Profile = {
  id: 'demo-principal-01',
  full_name: 'أ. فهد بن عبدالله الشهري (مدير المدرسة)',
  role: UserRole.PRINCIPAL,
  mobile: '0500000001',
  is_approved: true,
  drive_link: 'https://drive.google.com/drive/folders/demo-principal',
  created_at: new Date().toISOString()
};

const DEMO_TEACHER: Profile = {
  id: 'demo-teacher-01',
  full_name: 'أ. خالد بن محمد الحربي (معلم رياضيات)',
  role: UserRole.TEACHER,
  subject: 'الرياضيات',
  mobile: '0555555555',
  is_approved: true,
  drive_link: 'https://drive.google.com/drive/folders/demo-teacher',
  created_at: new Date().toISOString()
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const handleGlobalLogout = async () => {
    try {
      sessionStorage.removeItem('itqan_demo_user');
      await safeSignOut();
    } catch (e) {}
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const handleDemoLogin = (type: 'principal' | 'teacher') => {
    const chosen = type === 'principal' ? DEMO_PRINCIPAL : DEMO_TEACHER;
    sessionStorage.setItem('itqan_demo_user', type);
    setProfile(chosen);
    setSession({ user: { id: chosen.id, email: `${chosen.mobile}@school.local` } });
    setLoading(false);
    setConnectionError(false);
  };

  const initApp = async () => {
    setLoading(true);
    setConnectionError(false);

    // 1. التحقق أولاً من وجود جلسة تجريبية نشطة
    const activeDemo = sessionStorage.getItem('itqan_demo_user');
    if (activeDemo === 'principal') {
      handleDemoLogin('principal');
      return;
    } else if (activeDemo === 'teacher') {
      handleDemoLogin('teacher');
      return;
    }

    // 2. فحص جلسة Supabase مع مؤقت زمني صارم (2.5 ثانية) لعدم تعليق المعاينة
    try {
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: null }), 2500)
      );

      const res = await Promise.race([sessionPromise, timeoutPromise]);
      const data = res?.data;
      const error = (res as any)?.error;
      
      if (error) {
        console.warn('Session check returned error:', error.message);
        await handleGlobalLogout();
        return;
      }

      if (data?.session) {
        setSession(data.session);
        await fetchProfile(data.session.user.id);
      } else {
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    } catch (err: any) {
      console.warn('initApp caught error or timeout:', err);
      const errMsg = err?.message || String(err || '');
      if (errMsg.includes('Refresh Token') || errMsg.includes('refresh_token')) {
        await handleGlobalLogout();
      } else if (errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) {
        setConnectionError(true);
        setLoading(false);
      } else {
        // بدلاً من التجميد، نفتح صفحة الدخول
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setProfile(null);
          setLoading(false);
        } else {
          setSession(session);
          await fetchProfile(session.user.id);
        }
      } catch (err: any) {
        console.warn('onAuthStateChange handler error:', err);
        const errMsg = err?.message || '';
        if (errMsg.includes('Refresh Token') || errMsg.includes('refresh_token')) {
          await handleGlobalLogout();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        if (error.message?.includes('fetch')) {
          throw error;
        }
        console.error('Error fetching profile:', error);
      }
      
      if (data) {
        setProfile(data);
      } else {
        // إذا كان المستخدم مسجل في Auth ولكن لم ينشأ له سطر في profiles، نسترجع البيانات فوراً من user_metadata
        try {
          const { data: userData } = await supabase.auth.getUser();
          const meta = userData?.user?.user_metadata;
          const userEmail = userData?.user?.email || '';
          const phoneFromEmail = userEmail.includes('@') ? userEmail.split('@')[0] : '';
          
          const recoveredProfile: Profile = {
            id: userId,
            full_name: meta?.full_name || (phoneFromEmail ? `مستخدم (${phoneFromEmail})` : 'مستخدم المنظومة'),
            mobile: meta?.mobile || phoneFromEmail || '',
            role: meta?.role || UserRole.TEACHER,
            subject: meta?.subject || '',
            is_approved: meta?.role === UserRole.PRINCIPAL ? true : false,
            created_at: new Date().toISOString()
          };

          // وضع البروفايل فوراً في الحالة لمنع تعليق الشاشة
          setProfile(recoveredProfile);

          // محاولة مزامنة السطر مع قاعدة البيانات في الخلفية
          supabase.from('profiles').upsert(recoveredProfile).then(({ error: upsertErr }) => {
            if (upsertErr) {
              console.warn('Background profile sync notice:', upsertErr.message);
            }
          });
          return;
        } catch (uErr) {
          console.warn('Error reading user metadata:', uErr);
          // في حال تعذر القراءة نهائياً، ننهي الجلسة فوراً ليعود لشاشة الدخول دون تجميد
          await handleGlobalLogout();
          return;
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('fetch')) {
        setConnectionError(true);
      } else {
        console.error('fetchProfile error:', error);
        await handleGlobalLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 font-cairo text-right" dir="rtl">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">جاري التحقق من الجلسة...</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 font-cairo text-right" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <WifiOff className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">تعذر الاتصال بالخادم</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-bold">
            يمكنك تجربة المعاينة الفورية بكافة الميزات دون انتظار الاتصال بالخادم:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => handleDemoLogin('principal')}
              className="bg-[#0f4c4c] text-white py-3 rounded-xl font-black text-xs hover:bg-[#134e4a] transition shadow-xs"
            >
              معاينة كمدير مدرسة 👑
            </button>
            <button
              onClick={() => handleDemoLogin('teacher')}
              className="bg-emerald-600 text-white py-3 rounded-xl font-black text-xs hover:bg-emerald-700 transition shadow-xs"
            >
              معاينة كمعلم 🎓
            </button>
          </div>
          <button 
            onClick={initApp} 
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> إعادة محاولة الاتصال
          </button>
        </div>
      </div>
    );
  }

  if (!session) return <Login onLogin={() => {}} />;

  if (profile && !profile.is_approved && profile.role !== UserRole.PRINCIPAL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-cairo text-right" dir="rtl">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-amber-100 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
           <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ring-8 ring-amber-50/50">
              <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
           </div>
           <h2 className="text-2xl font-black text-slate-800 mb-4">طلبك قيد المراجعة</h2>
           <p className="text-slate-500 font-bold mb-8 leading-relaxed">
              مرحباً <span className="text-[#0f4c4c]">{profile.full_name}</span>، لقد تم استلام طلب انضمامك للنظام بنجاح. يرجى الانتظار حتى يتم اعتماد حسابك من قبل مدير المدرسة.
           </p>
           <div className="space-y-3">
             <button onClick={initApp} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition shadow-lg">
                <RefreshCw className="w-4 h-4" /> تحديث حالة الطلب
             </button>
             <button onClick={handleGlobalLogout} className="w-full text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition">
                <LogOut className="w-4 h-4" /> تسجيل الخروج
             </button>
           </div>
        </div>
      </div>
    );
  }

  if (!profile && session) {
    // لمنع بقاء المستخدم معلقاً في هذه الشاشة، نعيده فوراً لتسجيل الدخول النظيف
    return <Login onLogin={() => {}} />;
  }

  return profile?.role === UserRole.PRINCIPAL ? (
    <PrincipalDashboard userProfile={profile} onLogout={handleGlobalLogout} />
  ) : (
    <Dashboard userProfile={profile!} onLogout={handleGlobalLogout} />
  );
}

export default App;
