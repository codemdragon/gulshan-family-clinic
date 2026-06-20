// ===== ADMIN PANEL =====

let allPatients = [];

async function checkAdminAccess() {
  if (!currentUser) {
    window.location.href = '/login.html';
    return false;
  }

  const { data, error } = await supabaseClient
    .from('admin_users')
    .select('id')
    .eq('user_id', currentUser.id)
    .single();

  if (error || !data) {
    window.location.href = '/';
    return false;
  }

  return true;
}

async function loadPatients() {
  const { data, error } = await supabaseClient
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading patients:', error);
    return;
  }

  allPatients = data || [];
  renderTable(allPatients);
}

function renderTable(patients) {
  const tbody = document.getElementById('patients-tbody');
  if (!tbody) return;

  if (!patients.length) {
    tbody.innerHTML = '<tr class="empty"><td colspan="8">No patient records found.</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map(p => `
    <tr data-id="${p.id}">
      <td>${escapeHtml(p.name)}</td>
      <td>${p.age ?? '-'}</td>
      <td>${p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '-'}</td>
      <td>${escapeHtml(p.phone || '-')}</td>
      <td>${p.visit_type === 'first_time' ? 'First Time' : 'Returning'}</td>
      <td>${p.payment_method === 'in_clinic' ? 'In Clinic' : 'Online'}</td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td>
      <td><button class="delete-btn" data-delete-patient="${p.id}">Delete</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-delete-patient]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.deletePatient;
      if (!confirm('Delete this patient record? This cannot be undone.')) return;
      const { error } = await supabaseClient.from('patients').delete().eq('id', id);
      if (error) {
        alert('Failed to delete: ' + error.message);
        return;
      }
      allPatients = allPatients.filter(p => p.id !== id);
      renderTable(allPatients);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function filterPatients() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const visitFilter = document.getElementById('visit-filter')?.value || 'all';
  const paymentFilter = document.getElementById('payment-filter')?.value || 'all';

  let filtered = allPatients;

  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.phone && p.phone.toLowerCase().includes(search))
    );
  }

  if (visitFilter !== 'all') {
    filtered = filtered.filter(p => p.visit_type === visitFilter);
  }

  if (paymentFilter !== 'all') {
    filtered = filtered.filter(p => p.payment_method === paymentFilter);
  }

  renderTable(filtered);
}

async function loadClinicInfoAdmin() {
  const { data, error } = await supabaseClient
    .from('clinic_info')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  };

  setVal('edit-clinic-name', data.clinic_name);
  setVal('edit-email', data.email);
  setVal('edit-phone', data.phone);
  setVal('edit-address', data.address);
  setVal('edit-support-email', data.support_email);
  setVal('edit-maps-link', data.google_maps_link);
}

function initClinicForm() {
  const form = document.getElementById('clinic-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('clinic-msg');
    msg.className = 'form-message';
    msg.textContent = 'Saving...';
    msg.style.display = 'block';

    const updates = {
      clinic_name: document.getElementById('edit-clinic-name').value,
      email: document.getElementById('edit-email').value,
      phone: document.getElementById('edit-phone').value,
      address: document.getElementById('edit-address').value,
      support_email: document.getElementById('edit-support-email').value,
      google_maps_link: document.getElementById('edit-maps-link').value,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from('clinic_info')
      .update(updates)
      .eq('id', 1);

    if (error) {
      msg.className = 'form-message error';
      msg.textContent = error.message;
    } else {
      msg.className = 'form-message success';
      msg.textContent = 'Clinic information updated successfully!';
    }
  });
}

// ===== ADMINS TAB: invites + admin list =====

function statusLabel(status) {
  if (status === 'pending') return 'Pending';
  if (status === 'accepted') return 'Accepted';
  if (status === 'declined') return 'Declined';
  return status;
}

async function loadInvites() {
  const list = document.getElementById('invites-list');
  if (!list) return;

  const { data, error } = await supabaseClient
    .from('admin_invites')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = `<p class="subtitle">Failed to load invites: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data.length) {
    list.innerHTML = '<p class="subtitle">No invites sent yet.</p>';
    return;
  }

  list.innerHTML = data.map(inv => `
    <div class="invite-row" data-invite-id="${inv.id}">
      <div>
        <strong>${escapeHtml(inv.invited_email)}</strong>
        <div style="font-size:12px; color:var(--text-light);">Sent ${new Date(inv.created_at).toLocaleDateString()}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="invite-status ${inv.status}">${statusLabel(inv.status)}</span>
        ${inv.status === 'pending' ? `<button class="invite-cancel-btn" data-cancel-invite="${inv.id}">Cancel</button>` : ''}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-cancel-invite]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.cancelInvite;
      if (!confirm('Cancel this invite?')) return;
      const { error } = await supabaseClient.from('admin_invites').delete().eq('id', id);
      if (error) {
        alert('Failed to cancel: ' + error.message);
        return;
      }
      loadInvites();
    });
  });
}

async function loadAdminsList() {
  const list = document.getElementById('admins-list');
  if (!list) return;

  // admin_users only stores user_id; join against profiles for display info
  const { data: admins, error } = await supabaseClient
    .from('admin_users')
    .select('id, user_id, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    list.innerHTML = `<p class="subtitle">Failed to load admins: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!admins.length) {
    list.innerHTML = '<p class="subtitle">No admins found.</p>';
    return;
  }

  const userIds = admins.map(a => a.user_id);
  const { data: profiles } = await supabaseClient
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', userIds);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  list.innerHTML = admins.map(a => {
    const p = profileMap[a.user_id];
    const isSelf = a.user_id === currentUser.id;
    return `
      <div class="invite-row">
        <div>
          <strong>${escapeHtml(p?.full_name || 'Unnamed Admin')}</strong>${isSelf ? ' <span style="color:var(--text-light); font-size:12px;">(you)</span>' : ''}
          <div style="font-size:12px; color:var(--text-light);">${escapeHtml(p?.phone || '')}</div>
        </div>
        ${isSelf ? '' : `<button class="delete-btn" data-revoke-admin="${a.user_id}">Revoke</button>`}
      </div>
    `;
  }).join('');

  list.querySelectorAll('[data-revoke-admin]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.revokeAdmin;
      if (!confirm('Revoke admin access for this user?')) return;
      try {
        await requireReauth('Confirm your password to revoke admin access.');
      } catch {
        return; // cancelled
      }
      const { error } = await supabaseClient.from('admin_users').delete().eq('user_id', userId);
      if (error) {
        alert('Failed to revoke: ' + error.message);
        return;
      }
      loadAdminsList();
    });
  });
}

function initInviteForm() {
  const form = document.getElementById('invite-admin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('invite-msg');
    const emailInput = document.getElementById('invite-email');
    const email = emailInput.value.trim();

    msg.style.display = 'none';

    // Step 1: verify it's really the admin doing this (re-auth)
    try {
      await requireReauth(`Confirm your password to invite ${email} as an admin.`);
    } catch {
      return; // cancelled
    }

    msg.className = 'form-message';
    msg.textContent = 'Checking account...';
    msg.style.display = 'block';

    const { data: hasAccount, error: checkError } = await supabaseClient.rpc('email_has_account', { check_email: email });

    if (checkError) {
      msg.className = 'form-message error';
      msg.textContent = checkError.message;
      return;
    }

    if (!hasAccount) {
      msg.className = 'form-message error';
      msg.textContent = `No account found for ${email}. They need to sign up first before you can invite them as an admin.`;
      return;
    }

    msg.textContent = 'Sending invite...';

    const { error } = await supabaseClient
      .from('admin_invites')
      .insert([{ invited_email: email, invited_by: currentUser.id }]);

    if (error) {
      msg.className = 'form-message error';
      msg.textContent = error.message;
    } else {
      msg.className = 'form-message success';
      msg.textContent = `Invite sent to ${email}. They'll see an accept/decline prompt the next time they sign in.`;
      emailInput.value = '';
      loadInvites();
    }
  });
}

function initAdminUI() {
  const searchInput = document.getElementById('search-input');
  const visitFilter = document.getElementById('visit-filter');
  const paymentFilter = document.getElementById('payment-filter');

  if (searchInput) searchInput.addEventListener('input', filterPatients);
  if (visitFilter) visitFilter.addEventListener('change', filterPatients);
  if (paymentFilter) paymentFilter.addEventListener('change', filterPatients);

  const tabs = {
    patients: document.getElementById('tab-patients'),
    clinic: document.getElementById('tab-clinic'),
    admins: document.getElementById('tab-admins'),
  };

  document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      Object.entries(tabs).forEach(([key, el]) => {
        if (el) el.classList.toggle('hidden', key !== tab);
      });
      if (tab === 'admins') {
        loadInvites();
        loadAdminsList();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  await checkAdminAccess();
  loadPatients();
  loadClinicInfoAdmin();
  initClinicForm();
  initInviteForm();
  initAdminUI();

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut();
      window.location.href = '/login.html';
    });
  }
});