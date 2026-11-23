const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const form = document.querySelector('#auth-form');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const confirmInput = document.querySelector('#confirm-password');
const confirmField = document.querySelector('#confirm-field');
const submitButton = document.querySelector('#submit-button');
const modeToggle = document.querySelector('#mode-toggle');
const modePrompt = document.querySelector('#mode-prompt-text');
const intro = document.querySelector('#form-intro');
const eyebrow = document.querySelector('#form-eyebrow');
const message = document.querySelector('#form-message');

let mode = 'sign-in';

function showMessage(text, kind = 'error') {
  message.textContent = text;
  message.dataset.kind = kind;
  message.dataset.visible = 'true';
}

function clearMessage() {
  message.textContent = '';
  delete message.dataset.visible;
  delete message.dataset.kind;
}

modeToggle.addEventListener('click', () => {
  mode = mode === 'sign-in' ? 'sign-up' : 'sign-in';
  const signingUp = mode === 'sign-up';

  confirmField.hidden = !signingUp;
  confirmInput.required = signingUp;
  passwordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
  submitButton.innerHTML = signingUp ? 'Create account <span aria-hidden="true">&rarr;</span>' : 'Sign in <span aria-hidden="true">&rarr;</span>';
  modePrompt.textContent = signingUp ? 'Already have an account?' : 'New to Alert Barangay?';
  modeToggle.textContent = signingUp ? 'Sign in' : 'Create an account';
  intro.textContent = signingUp
    ? 'Create an account to request access to your barangay dashboard.'
    : 'Sign in to manage your barangay dashboard accounts.';
  eyebrow.textContent = signingUp ? 'Create your account' : 'Administrator portal';
  clearMessage();
});

document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    const showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    button.dataset.visible = String(showing);
    button.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', String(showing));
  });
});

async function sendAuthRequest(path, credentials) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(credentials),
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.msg || data.message || data.error_description || data.error;
    throw new Error(error || 'We could not complete that request. Please try again.');
  }
  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  if (!supabaseUrl || !supabaseAnonKey) {
    showMessage('Account access is not configured yet. Add the Supabase URL and anon or publishable key to .env.local, then restart the dev server.');
    return;
  }

  if (mode === 'sign-up' && passwordInput.value !== confirmInput.value) {
    showMessage('The passwords do not match. Please check both fields.');
    confirmInput.focus();
    return;
  }

  const signingUp = mode === 'sign-up';
  submitButton.disabled = true;
  submitButton.textContent = signingUp ? 'Creating account...' : 'Signing in...';

  try {
    const data = signingUp
      ? await sendAuthRequest('signup', { email: emailInput.value.trim(), password: passwordInput.value })
      : await sendAuthRequest('token?grant_type=password', { email: emailInput.value.trim(), password: passwordInput.value });

    if (signingUp && !data.access_token) {
      showMessage('Your account was created. Check your email for a confirmation link before signing in.', 'success');
    } else if (signingUp) {
      modeToggle.click();
      showMessage('Your account is ready. You can now sign in.', 'success');
    } else {
      showMessage(`Signed in as ${data.user?.email || emailInput.value.trim()}.`, 'success');
      form.reset();
    }
  } catch (error) {
    showMessage(error.name === 'TimeoutError'
      ? 'The request took too long. Check your connection and try again.'
      : error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = mode === 'sign-up'
      ? 'Create account <span aria-hidden="true">&rarr;</span>'
      : 'Sign in <span aria-hidden="true">&rarr;</span>';
  }
});
