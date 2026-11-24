const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const form = document.querySelector('#auth-form');
const emailInput = document.querySelector('#email');
const emailLabel = document.querySelector('#email-label');
const fullNameInput = document.querySelector('#full-name');
const fullNameField = document.querySelector('#full-name-field');
const passwordInput = document.querySelector('#password');
const confirmInput = document.querySelector('#confirm-password');
const confirmField = document.querySelector('#confirm-field');
const submitButton = document.querySelector('#submit-button');
const modeToggle = document.querySelector('#mode-toggle');
const modePrompt = document.querySelector('#mode-prompt-text');
const intro = document.querySelector('#form-intro');
const eyebrow = document.querySelector('#form-eyebrow');
const message = document.querySelector('#form-message');
const page = document.querySelector('#page');
const landingSignUp = document.querySelector('#landing-sign-up');
const landingSignIn = document.querySelector('#landing-sign-in');
const authBack = document.querySelector('#auth-back');
const formTitle = document.querySelector('#form-title');

let mode = 'sign-in';

landingSignUp.addEventListener('click', () => {
  modeToggle.click();
  location.hash = '#signup';
  page.classList.remove('is-landing');
  page.classList.add('is-auth');
  emailInput.focus();
});

landingSignIn.addEventListener('click', () => {
  location.hash = '#signin';
  page.classList.remove('is-landing');
  page.classList.add('is-auth');
  page.dataset.authMode = 'sign-in';
  emailLabel.textContent = 'Email';
  modePrompt.textContent = 'Don’t have an account?';
  modeToggle.textContent = 'Sign up';
  emailInput.focus();
});

authBack.addEventListener('click', () => {
  if (mode === 'sign-up') modeToggle.click();
  page.classList.remove('is-auth');
  delete page.dataset.authMode;
  page.classList.add('is-landing');
  location.hash = '#start';
});

function applyHashRoute() {
  const route = location.hash || '#start';
  if (route === '#start') {
    page.classList.add('is-landing');
    page.classList.remove('is-auth');
    delete page.dataset.authMode;
    return;
  }
  page.classList.remove('is-landing');
  page.classList.add('is-auth');
  const signingUp = route === '#signup';
  mode = signingUp ? 'sign-up' : 'sign-in';
  page.dataset.authMode = mode;
  confirmField.hidden = !signingUp;
  fullNameField.hidden = !signingUp;
  fullNameInput.required = signingUp;
  confirmInput.required = signingUp;
  passwordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
  formTitle.textContent = signingUp ? 'Create Your Account' : 'Hello Welcome Back!';
  emailLabel.textContent = 'Email';
  submitButton.innerHTML = signingUp ? 'Sign Up <span aria-hidden="true">&rarr;</span>' : 'Sign In <span aria-hidden="true">&rarr;</span>';
  modePrompt.textContent = signingUp ? 'Already have an account?' : 'Don’t have an account?';
  modeToggle.textContent = signingUp ? 'Sign in' : 'Sign up';
  intro.textContent = signingUp ? 'Create an account to request access to your barangay dashboard.' : 'Sign in to manage your barangay dashboard accounts.';
  eyebrow.textContent = signingUp ? 'Create your account' : 'Administrator portal';
}
window.addEventListener('hashchange', applyHashRoute);
applyHashRoute();

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
  fullNameField.hidden = !signingUp;
  fullNameInput.required = signingUp;
  confirmInput.required = signingUp;
  passwordInput.autocomplete = signingUp ? 'new-password' : 'current-password';
  page.classList.add('is-auth');
  page.dataset.authMode = signingUp ? 'sign-up' : 'sign-in';
  formTitle.textContent = signingUp ? 'Create Your Account' : 'Hello Welcome Back!';
  emailLabel.textContent = 'Email';
  submitButton.innerHTML = signingUp ? 'Sign Up <span aria-hidden="true">&rarr;</span>' : 'Sign In <span aria-hidden="true">&rarr;</span>';
  modePrompt.textContent = signingUp ? 'Already have an account?' : 'Don’t have an account?';
  modeToggle.textContent = signingUp ? 'Sign in' : 'Sign up';
  intro.textContent = signingUp
    ? 'Create an account to request access to your barangay dashboard.'
    : 'Sign in to manage your barangay dashboard accounts.';
  eyebrow.textContent = signingUp ? 'Create your account' : 'Administrator portal';
  clearMessage();
  location.hash = mode === 'sign-up' ? '#signup' : '#signin';
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

  const signingUp = mode === 'sign-up';
  const missingInput = signingUp
    ? [fullNameInput, emailInput, passwordInput, confirmInput].find((input) => !input.value.trim())
    : [emailInput, passwordInput].find((input) => !input.value.trim());
  if (missingInput) {
    showMessage(signingUp ? 'Please complete all required fields.' : 'Please enter your email and password.');
    missingInput.focus();
    return;
  }

  if (signingUp && passwordInput.value !== confirmInput.value) {
    showMessage('Passwords do not match.');
    confirmInput.focus();
    return;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    showMessage('Account access is not configured yet. Add the Supabase URL and anon or publishable key to .env.local, then restart the dev server.');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = signingUp ? 'Creating account...' : 'Signing in...';

  try {
    const data = signingUp
      ? await sendAuthRequest('signup', { email: emailInput.value.trim(), password: passwordInput.value, data: { full_name: fullNameInput.value.trim() } })
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
      ? 'Sign Up <span aria-hidden="true">&rarr;</span>'
      : 'Sign In <span aria-hidden="true">&rarr;</span>';
  }
});
