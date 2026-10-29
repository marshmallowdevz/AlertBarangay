import { useEffect, useState } from "react";
import { Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { getDashboardPath } from "./dashboardRoutes.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

function App() {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const isSignup = mode === "signup";

  const routeUser = (user) => {
    const path = getDashboardPath(user);
    if (path) {
      window.location.assign(path);
      return true;
    }
    setMessage("Your account is signed in but does not have a dashboard assigned. Please contact your barangay administrator.");
    setMessageType("error");
    return false;
  };

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => { active = false; };
    }

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage("We could not check your saved session. Please sign in again.");
          setMessageType("error");
        } else if (data.session?.user) {
          routeUser(data.session.user);
        }
      })
      .catch((error) => {
        console.error("Unable to check the saved session.", error);
        if (active) {
          setMessage("We could not check your saved session. Please sign in again.");
          setMessageType("error");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured || submitting) return;

    setSubmitting(true);
    setMessage("");
    setMessageType("error");

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: "resident",
            },
          },
        });
        if (error) throw error;

        if (data.session?.user) {
          routeUser(data.session.user);
        } else {
          setMessage("Your account was created. Check your email to confirm it, then sign in.");
          setMessageType("success");
          setMode("login");
          setPassword("");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        routeUser(data.user);
      }
    } catch (error) {
      console.error("Unable to submit the account request.", error);
      setMessage(error.message || "We could not complete your request. Please try again.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (nextMode) => {
    setMode(nextMode);
    setMessage("");
    setMessageType("error");
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    setMessage("You have been signed out. Sign in with an assigned account to continue.");
    setMessageType("success");
  };

  return (
    <main className="portal-shell">
      <section className="welcome-panel" aria-label="About AlertBarangay">
        <div className="welcome-copy">
          <span className="welcome-mark"><Shield aria-hidden="true" /></span>
          <h1>AlertBarangay</h1>
          <p className="welcome-description">
            Report problems in your barangay and follow every update, all in one place.
          </p>
          <p className="motto">“Bayanihan at Malasakit, Kaligtasan ay Makakamtan.”</p>
        </div>
        <div className="panel-glow" aria-hidden="true" />
      </section>

      <section className="auth-panel" aria-label="Resident portal account">
        <div className="auth-content">
          <span className="portal-mark"><Shield aria-hidden="true" /></span>
          <p className="eyebrow">ALERTBARANGAY RESIDENT PORTAL</p>
          <p className="auth-intro">
            {isSignup ? "Create an account to get started." : "Log in to continue to your account."}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              id="login-tab"
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={!isSignup ? "active" : ""}
              onClick={() => handleTabChange("login")}
            >
              Log in
            </button>
            <button
              id="signup-tab"
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={isSignup ? "active" : ""}
              onClick={() => handleTabChange("signup")}
            >
              Sign up
            </button>
          </div>

          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <label>
                Full name
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <span className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </label>

            {message && (
              <p className={"form-message " + messageType} role={messageType === "error" ? "alert" : "status"}>
                {message}
                {message.includes("dashboard assigned") && (
                  <button type="button" className="message-action" onClick={handleSignOut}>Sign out</button>
                )}
              </p>
            )}

            {!isSupabaseConfigured && (
              <p className="form-message error" role="alert">
                Add your Supabase URL and publishable key to the local environment to enable accounts.
              </p>
            )}

            <button className="submit-button" type="submit" disabled={loading || submitting || !isSupabaseConfigured}>
              <span>{loading ? "Checking..." : submitting ? "Please wait..." : isSignup ? "Create account" : "Log in"}</span>
              {!loading && !submitting && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <p className="account-prompt">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button type="button" onClick={() => handleTabChange(isSignup ? "login" : "signup")}>
              {isSignup ? "Log in" : "Create an account"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;