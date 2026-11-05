import { useEffect, useState } from 'react';
import './Official.css';
import Official from './Official';
import LoginView from './LoginView';
import { configError, isConfigured, supabase } from './supabaseClient';

function AuthStatus({ children }) {
  return <main className="logout-screen"><p role="status">{children}</p></main>;
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
      <p>This account is not provisioned as a barangay official.</p>
      {error && <p className="logout-error" role="alert">{error}</p>}
      <button type="button" className="btn btn-gold" onClick={signOut}>Sign out</button>
    </main>
  );
}

function isOfficial(user) {
  return user?.app_metadata?.barangay_role === 'official';
}

const authEnabled = import.meta.env.VITE_REQUIRE_AUTH === 'true';

export default function AuthApp({ LandingPage } = {}) {
  if (window.location.pathname === '/' && LandingPage) return <LandingPage />;
  if (!authEnabled) return <Official user={null} />;
  return <AuthenticatedApp LandingPage={LandingPage} />;
}

function AuthenticatedApp({ LandingPage }) {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isConfigured);

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
  if (pathname === '/dashboard' && session && !isOfficial(session.user)) {
    return <AccessDenied onSignOut={signOut} />;
  }
  if (pathname === '/dashboard' && session) {
    return <Official user={session.user} onSignOut={signOut} />;
  }
  return <LoginView onSignIn={signIn} configMessage={!isConfigured ? configError : ''} />;
}
