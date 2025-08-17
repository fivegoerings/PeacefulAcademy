// Minimal, modern fetch-based auth client for Netlify Functions
const emailForm = document.getElementById('emailForm');
const registerBtn = document.getElementById('registerBtn');
const msg = document.getElementById('emailMsg');
const googleBtn = document.getElementById('googleBtn');

function setMsg(text, ok=false){ msg.textContent = text; msg.style.color = ok ? '#16a34a' : '#dc2626'; }

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMsg('');
  const form = new FormData(emailForm);
  const body = Object.fromEntries(form);

  try {
    const r = await fetch('/.netlify/functions/auth-login', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    const data = await r.json();
    if (!r.ok) return setMsg(data.error || 'Login failed');
    setMsg('Success! Redirecting…', true);
    location.href = '/'; // send to your app’s home after login
  } catch (err) {
    setMsg('Network error. Try again.');
  }
});

registerBtn.addEventListener('click', async () => {
  setMsg('');
  const form = new FormData(emailForm);
  const body = Object.fromEntries(form);
  try {
    const r = await fetch('/.netlify/functions/auth-register', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    const data = await r.json();
    if (!r.ok) return setMsg(data.error || 'Registration failed');
    setMsg('Account created. You are signed in.', true);
    location.href = '/';
  } catch {
    setMsg('Network error. Try again.');
  }
});

googleBtn.addEventListener('click', async () => {
  // Use PKCE for Google OAuth
  const r = await fetch('/.netlify/functions/oauth-start', { credentials:'include' });
  const { authUrl } = await r.json();
  if (authUrl) location.href = authUrl;
});

