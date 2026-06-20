// ===== AUTH STATE & UI =====

let currentUser = null;
let currentProfile = null;

function initials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

async function fetchProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

async function renderUserBadge(user) {
  const badge = document.getElementById('user-badge');
  const nameEl = document.getElementById('user-name');
  const loginLink = document.getElementById('login-link');
  const avatarImg = document.getElementById('user-avatar');
  const avatarFallback = document.getElementById('user-avatar-fallback');

  if (!badge) return;

  if (user) {
    badge.style.display = 'flex';
    if (loginLink) loginLink.classList.add('hidden');

    currentProfile = await fetchProfile(user.id);
    const displayName = currentProfile?.full_name || user.user_metadata?.full_name || user.email || 'User';
    if (nameEl) nameEl.textContent = displayName;

    const avatarUrl = currentProfile?.avatar_url;
    if (avatarImg && avatarFallback) {
      if (avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.classList.remove('hidden');
        avatarFallback.classList.add('hidden');
        avatarImg.onerror = () => {
          avatarImg.classList.add('hidden');
          avatarFallback.classList.remove('hidden');
          avatarFallback.textContent = initials(displayName);
        };
      } else {
        avatarImg.classList.add('hidden');
        avatarFallback.classList.remove('hidden');
        avatarFallback.textContent = initials(displayName);
      }
    }

    checkPendingInvite();
  } else {
    badge.style.display = 'none';
    if (loginLink) loginLink.classList.remove('hidden');
    currentProfile = null;
    removeInviteBanner();
  }
}

async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user ?? null;
  await renderUserBadge(currentUser);
  return currentUser;
}

async function signUp(email, password, fullName, phone) {
  const { data, error } = await supabaseClient.auth.signUp({
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
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  currentUser = null;
  await renderUserBadge(null);
}

// Re-authenticate the current user (used to confirm sensitive actions, e.g. inviting an admin)
async function reauthenticate(password) {
  if (!currentUser?.email) throw new Error('No active session.');
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: currentUser.email,
    password,
  });
  if (error) throw error;
  return true;
}

// Opens the shared re-auth modal and resolves with true once confirmed, or rejects if cancelled.
function requireReauth(contextMsg) {
  return new Promise((resolve, reject) => {
    const modal = document.getElementById('reauth-modal');
    if (!modal) { resolve(true); return; } // page has no modal (e.g. not admin.html) — skip
    const form = document.getElementById('reauth-form');
    const closeBtn = document.getElementById('reauth-close-btn');
    const msgEl = document.getElementById('reauth-msg');
    const passwordInput = document.getElementById('reauth-password');
    const contextEl = document.getElementById('reauth-context-msg');

    if (contextEl) contextEl.textContent = contextMsg || "Please re-enter your password to continue.";
    msgEl.style.display = 'none';
    passwordInput.value = '';
    modal.classList.add('open');
    passwordInput.focus();

    function cleanup() {
      modal.classList.remove('open');
      form.removeEventListener('submit', onSubmit);
      closeBtn.removeEventListener('click', onCancel);
    }
    function onCancel() {
      cleanup();
      reject(new Error('cancelled'));
    }
    async function onSubmit(e) {
      e.preventDefault();
      msgEl.className = 'form-message';
      msgEl.textContent = 'Verifying...';
      msgEl.style.display = 'block';
      try {
        await reauthenticate(passwordInput.value);
        cleanup();
        resolve(true);
      } catch (err) {
        msgEl.className = 'form-message error';
        msgEl.textContent = 'Incorrect password.';
      }
    }
    form.addEventListener('submit', onSubmit);
    closeBtn.addEventListener('click', onCancel);
  });
}

// Listen for auth state changes
supabaseClient.auth.onAuthStateChange((event, session) => {
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
  const confirmCard = document.getElementById('confirm-email-card');
  const confirmEmailAddress = document.getElementById('confirm-email-address');
  const confirmBackBtn = document.getElementById('confirm-email-back-btn');

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

  if (confirmBackBtn) {
    confirmBackBtn.addEventListener('click', () => {
      confirmCard.classList.add('hidden');
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
        signupMsg.style.display = 'none';
        signupForm.reset();
        if (confirmCard) {
          signupForm.classList.add('hidden');
          confirmEmailAddress.textContent = email;
          confirmCard.classList.remove('hidden');
        } else {
          signupMsg.className = 'form-message success';
          signupMsg.style.display = 'block';
          signupMsg.textContent = 'Account created! Check your email to confirm.';
        }
      } catch (err) {
        signupMsg.className = 'form-message error';
        signupMsg.style.display = 'block';
        signupMsg.textContent = err.message;
      }
    });
  }
}

// ===== ACCOUNT SETTINGS MODAL =====

function injectSettingsModal() {
  if (document.getElementById('settings-modal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal-overlay" id="settings-modal">
      <div class="modal-card">
        <div class="modal-header">
          <h2>Account Settings</h2>
          <button class="modal-close" type="button" id="settings-close-btn">&times;</button>
        </div>
        <form id="settings-form">
          <div class="avatar-preview-row">
            <img class="avatar-preview" id="settings-avatar-preview" alt="" src="">
            <div style="flex:1;">
              <label for="settings-avatar-url" style="display:block; font-weight:600; font-size:13px; margin-bottom:4px;">Profile Picture URL</label>
              <input type="url" id="settings-avatar-url" placeholder="https://example.com/photo.jpg" style="width:100%; padding:8px 10px; border:1.5px solid var(--border); border-radius:6px; font-size:13px;">
            </div>
          </div>
          <div class="form-group">
            <label for="settings-full-name">Full Name</label>
            <input type="text" id="settings-full-name" placeholder="Your name">
          </div>
          <div class="form-group">
            <label for="settings-phone">Phone Number</label>
            <input type="tel" id="settings-phone" placeholder="+92-300-1234567">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="settings-email" disabled style="background:var(--bg); color:var(--text-light);">
          </div>
          <button type="submit" class="btn-submit">Save Changes</button>
          <div class="form-message" id="settings-msg"></div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(wrap.firstElementChild);

  const modal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('settings-close-btn');
  const form = document.getElementById('settings-form');
  const avatarUrlInput = document.getElementById('settings-avatar-url');
  const avatarPreview = document.getElementById('settings-avatar-preview');

  function closeModal() { modal.classList.remove('open'); }
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  avatarUrlInput.addEventListener('input', () => {
    avatarPreview.src = avatarUrlInput.value || '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('settings-msg');
    msg.className = 'form-message';
    msg.textContent = 'Saving...';
    msg.style.display = 'block';

    const updates = {
      id: currentUser.id,
      full_name: document.getElementById('settings-full-name').value,
      phone: document.getElementById('settings-phone').value || null,
      avatar_url: avatarUrlInput.value || null,
    };

    const { error } = await supabaseClient.from('profiles').upsert(updates);

    if (error) {
      msg.className = 'form-message error';
      msg.textContent = error.message;
    } else {
      msg.className = 'form-message success';
      msg.textContent = 'Saved!';
      await renderUserBadge(currentUser);
      setTimeout(closeModal, 900);
    }
  });
}

async function openSettingsModal() {
  if (!currentUser) return;
  injectSettingsModal();
  const modal = document.getElementById('settings-modal');
  document.getElementById('settings-full-name').value = currentProfile?.full_name || '';
  document.getElementById('settings-phone').value = currentProfile?.phone || '';
  document.getElementById('settings-avatar-url').value = currentProfile?.avatar_url || '';
  document.getElementById('settings-avatar-preview').src = currentProfile?.avatar_url || '';
  document.getElementById('settings-email').value = currentUser.email || '';
  modal.classList.add('open');
}

// ===== ADMIN INVITE ACCEPT BANNER (shown to the invited person) =====

function removeInviteBanner() {
  const existing = document.getElementById('invite-banner');
  if (existing) existing.remove();
}

async function checkPendingInvite() {
  if (!currentUser?.email) return;
  removeInviteBanner();

  const { data, error } = await supabaseClient
    .from('admin_invites')
    .select('*')
    .eq('status', 'pending')
    .ilike('invited_email', currentUser.email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || !data.length) return;

  const invite = data[0];
  const header = document.querySelector('header');
  if (!header) return;

  const banner = document.createElement('div');
  banner.id = 'invite-banner';
  banner.className = 'invite-banner';
  banner.style.marginTop = '20px';
  banner.innerHTML = `
    <p>\u{1F6E1}\uFE0F You've been invited to become an <strong>admin</strong> of Gulshan Clinic. Do you accept?</p>
    <div class="invite-banner-actions">
      <button class="btn-small btn-submit" id="invite-accept-btn" style="background:var(--primary); color:#fff; width:auto;">Accept</button>
      <button class="btn-small" id="invite-decline-btn" style="background:var(--white); border:1px solid var(--border); width:auto;">Decline</button>
    </div>
  `;
  header.insertAdjacentElement('afterend', banner);

  document.getElementById('invite-accept-btn').addEventListener('click', async () => {
    const { error } = await supabaseClient
      .from('admin_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);
    if (!error) {
      removeInviteBanner();
      alert("You're now an admin! Visit /admin.html to manage the clinic.");
    }
  });

  document.getElementById('invite-decline-btn').addEventListener('click', async () => {
    const { error } = await supabaseClient
      .from('admin_invites')
      .update({ status: 'declined' })
      .eq('id', invite.id);
    if (!error) removeInviteBanner();
  });
}

// ===== INIT ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', async () => {
  // Mobile menu toggle with smooth slide animation
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const desktopNav = document.querySelector('.desktop-nav');
  if (menuBtn && desktopNav) {
    menuBtn.addEventListener('click', () => {
      const isOpen = desktopNav.classList.toggle('open');
      menuBtn.classList.toggle('open', isOpen);
    });
    desktopNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        desktopNav.classList.remove('open');
        menuBtn.classList.remove('open');
      });
    });
  }

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

  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }

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