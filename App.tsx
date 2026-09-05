
import React, { useState, useEffect } from 'react';
import { supabase, safeSignOut } from './supabase';
import { Profile, UserRole } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PrincipalDashboard from './components/PrincipalDashboard';
import { Loader2, WifiOff, RefreshCw, Clock, ShieldAlert, LogOut } from 'lucide-react';

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const handleGlobalLogout = async () => {
    await safeSignOut();
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const initApp = async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const { data, error } = await supabase.auth.getSession();
      
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
      console.warn('initApp caught error:', err);
      const errMsg = err?.message || String(err || '');
      if (errMsg.includes('Refresh Token') || errMsg.includes('refresh_token')) {
        await handleGlobalLogout();
      } else if (errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) {
        setConnectionError(true);
        setLoading(false);
      } else {
        await handleGlobalLogout();
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
        // إذا كان المستخدم مسجل في Auth ولكن لم ينشأ له سطر في profiles، نحاول استرجاع البيانات من user_metadata
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.warn('getUser error:', userError.message);
            setProfile(null);
            return;
          }
          const meta = userData?.user?.user_metadata;
          if (meta && meta.full_name) {
            const newProfile: any = {
              id: userId,
              full_name: meta.full_name,
              mobile: meta.mobile || (userData?.user?.email ? userData.user.email.split('@')[0] : ''),
              role: meta.role || UserRole.TEACHER,
              subject: meta.subject || '',
              is_approved: meta.role === UserRole.PRINCIPAL
            };
            const { error: insertErr } = await supabase.from('profiles').upsert(newProfile);
            if (!insertErr) {
              setProfile(newProfile);
              return;
            }
          }
        } catch (uErr) {
          console.warn('Error reading user metadata:', uErr);
        }
        setProfile(null);
      }
    } catch (error: any) {
      if (error?.message?.includes('fetch')) {
        setConnectionError(true);
      } else {
        console.error('fetchProfile error:', error);
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
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">فشل الاتصال</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            حدث خطأ أثناء محاولة الوصول لقاعدة البيانات أو انتهت صلاحية الجلسة.
          </p>
          <button onClick={initApp} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5" /> تحديث الصفحة
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
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 font-cairo text-right" dir="rtl">
         <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-4">
           <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
           <h3 className="text-lg font-bold text-slate-800">جاري إعداد وتحديث بيانات الحساب...</h3>
           <p className="text-xs text-slate-500">إذا استمرت هذه الشاشة لأكثر من بضع ثوانٍ، يمكنك إعادة تسجيل الدخول لتحديث الصلاحيات.</p>
           <button onClick={handleGlobalLogout} className="w-full mt-4 bg-slate-100 text-slate-700 hover:bg-slate-200 py-3 rounded-xl font-bold text-sm transition">
             العودة لصفحة تسجيل الدخول
           </button>
         </div>
       </div>
     );
  }

  return profile?.role === UserRole.PRINCIPAL ? (
    <PrincipalDashboard userProfile={profile} onLogout={handleGlobalLogout} />
  ) : (
    <Dashboard userProfile={profile!} onLogout={handleGlobalLogout} />
  );
}

export default App;
