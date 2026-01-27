
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
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

  const initApp = async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error.message);
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(data.session);
      if (data.session) {
        await fetchProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      if (err.message?.includes('fetch')) {
        setConnectionError(true);
      } else {
        await supabase.auth.signOut();
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
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
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
           setProfile(null);
        } else if (error.message.includes('fetch')) {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      setConnectionError(true);
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

  // شاشة بانتظار الموافقة (تظهر للمستخدمين المسجلين حديثاً)
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
             <button onClick={() => supabase.auth.signOut()} className="w-full text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition">
                <LogOut className="w-4 h-4" /> تسجيل الخروج
             </button>
           </div>
        </div>
      </div>
    );
  }

  if (!profile && session) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-cairo text-right" dir="rtl">
         <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
         <p className="text-slate-600">جاري جلب بيانات ملفك الشخصي...</p>
       </div>
     );
  }

  return profile?.role === UserRole.PRINCIPAL ? (
    <PrincipalDashboard userProfile={profile} />
  ) : (
    <Dashboard userProfile={profile!} />
  );
}

export default App;
