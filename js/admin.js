// ===== ADMIN PANEL =====

let allPatients = [];

async function checkAdminAccess() {
  if (!currentUser) {
    window.location.href = '/login.html';
    return false;
  }

  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
    tbody.innerHTML = '<tr class="empty"><td colspan="7">No patient records found.</td></tr>';
    return;
  }

  tbody.innerHTML = patients.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.age ?? '-'}</td>
      <td>${p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '-'}</td>
      <td>${escapeHtml(p.phone || '-')}</td>
      <td>${p.visit_type === 'first_time' ? 'First Time' : 'Returning'}</td>
      <td>${p.payment_method === 'in_clinic' ? 'In Clinic' : 'Online'}</td>
      <td>${new Date(p.created_at).toLocaleDateString()}</td>
    </tr>
  `).join('');
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
  const { data, error } = await supabase
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

    const { error } = await supabase
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

function initAdminUI() {
  const searchInput = document.getElementById('search-input');
  const visitFilter = document.getElementById('visit-filter');
  const paymentFilter = document.getElementById('payment-filter');

  if (searchInput) searchInput.addEventListener('input', filterPatients);
  if (visitFilter) visitFilter.addEventListener('change', filterPatients);
  if (paymentFilter) paymentFilter.addEventListener('change', filterPatients);

  // Tab switching
  document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('tab-patients').classList.toggle('hidden', tab !== 'patients');
      document.getElementById('tab-clinic').classList.toggle('hidden', tab !== 'clinic');
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
  await checkAdminAccess();
  loadPatients();
  loadClinicInfoAdmin();
  initClinicForm();
  initAdminUI();

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut();
      window.location.href = '/login.html';
    });
  }
});
