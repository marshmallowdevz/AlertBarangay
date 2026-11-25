import { useEffect, useState } from 'react';
import './Official.css';
import Official from './Official';
import LoginView from './LoginView';
import LoadingIndicator from './LoadingIndicator';
import { configError, isConfigured, supabase } from './supabaseClient';

function AuthStatus({ children }) {
  return <main className="logout-screen"><LoadingIndicator message={children} className="auth-loading" /></main>;
}

function AccessDenied({ onSignOut }) {
  const [error, setError] = useState('');
  const signOut = async () => {
    try {
      await onSignOut();
    } catch (signOutError) {
      setError(signOutError.message || 'Unable to sign out. Try again.');
    }
  };

  return (
    <main className="logout-screen">
      <h1>Access denied</h1>
      <p>This account is not provisioned as a barangay official or admin.</p>
      {error && <p className="logout-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-gold" onClick={signOut}>Sign out</button>
    </main>
  );
}

function staffClaim(user) {
  const role = user?.app_metadata?.barangay_role ?? user?.app_metadata?.role;
  const normalized = String(role || '').toLowerCase();
  return ['official', 'admin'].includes(normalized) ? normalized : '';
}

const authEnabled = import.meta.env.VITE_REQUIRE_AUTH !== 'false';

export default function AuthApp({ LandingPage } = {}) {
  if (window.location.pathname === '/' && LandingPage) return <LandingPage />;
  if (!authEnabled) return <Official user={null} />;
  return <AuthenticatedApp LandingPage={LandingPage} />;
}

function AuthenticatedApp({ LandingPage }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isConfigured);
  const [staffRole, setStaffRole] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffCheckedUserId, setStaffCheckedUserId] = useState('');

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    if (!isConfigured) {
      return () => window.removeEventListener('popstate', handlePopState);
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthLoading(false);
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Unable to restore the Supabase session.', error);
        setSession(data.session);
      })
      .catch((error) => {
        if (active) console.error('Unable to restore the Supabase session.', error);
      })
      .finally(() => { if (active) setAuthLoading(false); });

    return () => {
      active = false;
      window.removeEventListener('popstate', handlePopState);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const user = session?.user;
    if (!user) {
      setStaffRole('');
      setStaffLoading(false);
      setStaffCheckedUserId('');
      return () => { active = false; };
    }

    const claimedRole = staffClaim(user);
    if (claimedRole) {
      setStaffRole(claimedRole);
      setStaffLoading(false);
      setStaffCheckedUserId(user.id);
      return () => { active = false; };
    }

    setStaffRole('');
    setStaffCheckedUserId('');
    setStaffLoading(true);
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        const role = String(data?.role || '').toLowerCase();
        setStaffRole(['official', 'admin'].includes(role) ? role : '');
        setStaffCheckedUserId(user.id);
      })
      .catch((error) => {
        if (active) {
          console.error('Unable to verify the barangay role.', error);
          setStaffRole('');
          setStaffCheckedUserId(user.id);
        }
      })
      .finally(() => { if (active) setStaffLoading(false); });

    return () => { active = false; };
  }, [session?.user?.id, session?.user?.app_metadata?.barangay_role, session?.user?.app_metadata?.role]);

  useEffect(() => {
    if (authLoading) return;
    if (pathname === '/') {
      if (LandingPage) return;
      window.location.replace('/login');
      return;
    }
    if (!['/login', '/dashboard'].includes(pathname)) {
      window.location.replace('/login');
      return;
    }
    if (pathname === '/dashboard' && !session) window.location.replace('/login');
    if (pathname === '/login' && session) window.location.replace('/dashboard');
  }, [authLoading, LandingPage, pathname, session]);

  const signIn = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  if (authLoading) return <AuthStatus>Loading your account...</AuthStatus>;
  if (pathname === '/' && LandingPage) return <LandingPage />;
  if (pathname === '/dashboard' && session && (staffLoading || staffCheckedUserId !== session.user.id)) return <AuthStatus>Checking barangay access...</AuthStatus>;
  if (pathname === '/dashboard' && session && !staffRole) {
    return <AccessDenied onSignOut={signOut} />;
  }
  if (pathname === '/dashboard' && session) {
    return <Official user={session.user} staffRole={staffRole} onSignOut={signOut} />;
  }
  return <LoginView onSignIn={signIn} configMessage={!isConfigured ? configError : ''} />;
}
