const form = document.getElementById('authForm');
const msg = document.getElementById('formMsg');
const signInBtn = document.getElementById('submitBtn');        // left button
const createBtn = document.getElementById('toggleModeBtn');     // right button now acts as "Create account"
const googleBtn = document.getElementById('googleBtn');

function setOk(t){ msg.textContent=t; msg.className='msg ok'; }
function setErr(t){ msg.textContent=t; msg.className='msg err'; }
function clearMsg(){ msg.textContent=''; msg.className='msg'; }
function setBusy(b){
  [signInBtn, createBtn, googleBtn].forEach(el=> el && (el.disabled=b));
}
async function safeJson(res){ try { return await res.json(); } catch { return {}; } }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMsg();
  const body = Object.fromEntries(new FormData(form));
  if (!body.email || !body.password) return setErr('Email and password are required.');
  setBusy(true);
  try {
    const r = await fetch('/.netlify/functions/auth-login', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify(body), credentials:'include'
    });
    const data = await safeJson(r);
    if (!r.ok) return setErr(data.error || 'Login failed');
    setOk('Signed in. Redirecting…'); location.href = '/';
  } catch { setErr('Network error. Try again.'); }
  finally { setBusy(false); }
});

createBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  clearMsg();
  const body = Object.fromEntries(new FormData(form));
  if (!body.email || !body.password) return setErr('Email and password are required.');
  setBusy(true);
  try {
    const r = await fetch('/.netlify/functions/auth-register', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify(body), credentials:'include'
    });
    const data = await safeJson(r);
    if (!r.ok) return setErr(data.error || 'Registration failed');
    setOk('Account created. Redirecting…'); location.href = '/';
  } catch { setErr('Network error. Try again.'); }
  finally { setBusy(false); }
});

googleBtn?.addEventListener('click', async () => {
  clearMsg(); setBusy(true);
  try {
    const r = await fetch('/.netlify/functions/oauth-start', { credentials:'include' });
    const { authUrl, error } = await safeJson(r);
    if (error || !authUrl) return setErr(error || 'Google sign-in failed to start');
    location.href = authUrl;
  } catch { setErr('Network error starting Google sign-in.'); setBusy(false); }
});

