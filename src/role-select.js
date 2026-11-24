// src/role-select.js
// Handles the Resident / Barangay Official / Admin chooser on the sign-in card
// and sends each person to the right dashboard after they sign in.

// Change these to wherever each dashboard actually lives.
export const ROLE_ROUTES = {
  resident: '/resident/',
  official: '/official/',
  admin: '/admin/',
};

const LABELS = { resident: 'Resident', official: 'Barangay Official', admin: 'Admin' };

const COPY = {
  resident: ['Resident portal', 'Sign in to report incidents and follow advisories.'],
  official: ['Barangay official portal', 'Sign in to manage reports, dispatch and announcements.'],
  admin: ['Administrator portal', 'Sign in to manage barangay accounts and system settings.'],
};

export function getSelectedRole() {
  return document.querySelector('input[name="role"]:checked')?.value ?? 'resident';
}

function applyCopy() {
  const page = document.getElementById('page');
  if (!page || page.dataset.authMode === 'sign-up') return; // main.js owns the sign-up text
  const [eyebrow, intro] = COPY[getSelectedRole()];
  document.getElementById('form-eyebrow').textContent = eyebrow;
  document.getElementById('form-intro').textContent = intro;
}

document.querySelectorAll('input[name="role"]').forEach((input) =>
  input.addEventListener('change', applyCopy)
);

// main.js rewrites the eyebrow/intro when switching sign in <-> sign up,
// so re-apply the role text whenever the mode changes back to sign-in.
const page = document.getElementById('page');
if (page) {
  new MutationObserver(applyCopy).observe(page, { attributes: true, attributeFilter: ['data-auth-mode'] });
}
applyCopy();

/**
 * Call this right after a successful sign-in in main.js:
 *
 *   const result = await routeAfterSignIn(supabase);
 *   if (!result.ok) showMessage(result.message);   // your existing message helper
 *
 * The role that counts is the one stored on the account (profiles.role),
 * NOT the chip the person tapped. The chip is only a convenience: if it
 * doesn't match the account, they're signed out with a clear message.
 */
export async function routeAfterSignIn(supabase, chosenRole = getSelectedRole()) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Please sign in again.' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile?.role || !ROLE_ROUTES[profile.role]) {
    await supabase.auth.signOut();
    return { ok: false, message: 'We could not find a role for this account. Please contact your barangay administrator.' };
  }

  if (profile.role !== chosenRole) {
    await supabase.auth.signOut();
    return { ok: false, message: `This account is not registered as ${LABELS[chosenRole]}. Choose the right role and try again.` };
  }

  window.location.assign(ROLE_ROUTES[profile.role]);
  return { ok: true };
}