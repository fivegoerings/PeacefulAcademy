// guard.js - redirects to /login.html if not signed in
(async () => {
  try {
    const res = await fetch('/.netlify/functions/auth-me', {
      credentials: 'include'
    });
    const data = await res.json();

    if (!data?.authenticated) {
      // Not logged in → send to login
      window.location.href = '/login.html';
    } else {
      console.log('User session:', data.user);
      // You can also expose the user info globally if needed:
      window.currentUser = data.user;
    }
  } catch (err) {
    console.error('Auth check failed', err);
    window.location.href = '/login.html';
  }
})();

