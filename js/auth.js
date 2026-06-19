// ===== AUTH STATE & UI =====

let currentUser = null;

function renderUserBadge(user) {
  const badge = document.getElementById('user-badge');
  const nameEl = document.getElementById('user-name');
  if (user) {
    badge.style.display = 'flex';
    nameEl.textContent = user.user_metadata?.full_name || user.email || 'User';
  } else {
    badge.style.display = 'none';
  }
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  renderUserBadge(currentUser);
  return currentUser;
}

async function signUp(email, password, fullName, phone) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone }
    }
  });

  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  currentUser = null;
  renderUserBadge(null);
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user ?? null;
  renderUserBadge(currentUser);
});

// ===== LOGIN / SIGNUP FORM LOGIC =====

function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const loginMsg = document.getElementById('login-msg');
  const signupMsg = document.getElementById('signup-msg');

  if (showSignup) {
    showSignup.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.add('hidden');
      signupForm.classList.remove('hidden');
    });
  }

  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      signupForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      loginMsg.className = 'form-message';
      loginMsg.textContent = 'Signing in...';
      loginMsg.style.display = 'block';
      try {
        await signIn(email, password);
        loginMsg.className = 'form-message success';
        loginMsg.textContent = 'Signed in! Redirecting...';
        setTimeout(() => { window.location.href = '/'; }, 800);
      } catch (err) {
        loginMsg.className = 'form-message error';
        loginMsg.textContent = err.message;
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const phone = document.getElementById('signup-phone').value;
      const password = document.getElementById('signup-password').value;
      signupMsg.className = 'form-message';
      signupMsg.textContent = 'Creating account...';
      signupMsg.style.display = 'block';
      try {
        await signUp(email, password, name, phone);
        signupMsg.className = 'form-message success';
        signupMsg.textContent = 'Account created! Check your email to confirm. Redirecting...';
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } catch (err) {
        signupMsg.className = 'form-message error';
        signupMsg.textContent = err.message;
      }
    });
  }
}

// ===== INIT ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', async () => {
  // Mobile menu toggle (initialize first and safely)
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const desktopNav = document.querySelector('.desktop-nav');
  if (menuBtn && desktopNav) {
    menuBtn.addEventListener('click', () => {
      desktopNav.classList.toggle('open');
    });
  }

  // Safely check session and init auth forms
  try {
    await checkSession();
  } catch (err) {
    console.warn("Session check failed (might be placeholder key):", err);
  }

  try {
    initAuthForms();
  } catch (err) {
    console.warn("Auth form initialization failed:", err);
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut();
      } catch (err) {
        console.error("Signout failed:", err);
      }
      window.location.href = '/';
    });
  }
});
