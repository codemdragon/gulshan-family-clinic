// ===== RESET PASSWORD PAGE =====

document.addEventListener('DOMContentLoaded', () => {
  const checkingEl = document.getElementById('reset-checking');
  const invalidEl = document.getElementById('reset-invalid');
  const formEl = document.getElementById('reset-password-form');
  const msgEl = document.getElementById('reset-password-msg');

  let recoveryReady = false;

  function showForm() {
    recoveryReady = true;
    checkingEl.classList.add('hidden');
    invalidEl.classList.add('hidden');
    formEl.classList.remove('hidden');
  }

  function showInvalid() {
    checkingEl.classList.add('hidden');
    formEl.classList.add('hidden');
    invalidEl.classList.remove('hidden');
  }

  // Supabase fires this event once it parses the recovery token from the URL
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      showForm();
    }
  });

  // Fallback: if no recovery event fires within a few seconds, the link was bad/expired
  setTimeout(() => {
    if (!recoveryReady) showInvalid();
  }, 4000);

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    msgEl.style.display = 'none';

    if (newPassword !== confirmPassword) {
      msgEl.className = 'form-message error';
      msgEl.textContent = "Passwords don't match.";
      msgEl.style.display = 'block';
      return;
    }

    msgEl.className = 'form-message';
    msgEl.textContent = 'Updating password...';
    msgEl.style.display = 'block';

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    if (error) {
      msgEl.className = 'form-message error';
      msgEl.textContent = error.message;
    } else {
      msgEl.className = 'form-message success';
      msgEl.textContent = 'Password updated! Redirecting to sign in...';
      formEl.reset();
      setTimeout(async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '/login.html';
      }, 1500);
    }
  });
});