// ===== APPOINTMENT FORM =====

async function submitAppointment(formData) {
  const { data, error } = await supabase
    .from('patients')
    .insert([{
      user_id: currentUser.id,
      name: formData.name,
      age: parseInt(formData.age, 10),
      gender: formData.gender,
      phone: formData.phone,
      visit_type: formData.visitType,
      payment_method: formData.payment,
    }])
    .select();

  if (error) throw error;
  return data;
}

function initAppointmentForm() {
  const form = document.getElementById('appointment-form');
  const msg = document.getElementById('form-message');
  const submitBtn = document.getElementById('submit-btn');
  const authNotice = document.getElementById('auth-notice');
  const formBody = document.getElementById('form-body');

  if (!form) return;

  // Show/hide based on auth
  if (!currentUser) {
    if (authNotice) authNotice.classList.remove('hidden');
    if (formBody) formBody.classList.add('hidden');
    return;
  }

  if (authNotice) authNotice.classList.add('hidden');
  if (formBody) formBody.classList.remove('hidden');

  // Pre-fill phone if user has profile data
  if (currentUser?.user_metadata?.phone) {
    const phoneInput = document.getElementById('patient-phone');
    if (phoneInput && !phoneInput.value) {
      phoneInput.value = currentUser.user_metadata.phone;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
    msg.className = 'form-message';
    msg.style.display = 'none';

    const formData = {
      name: document.getElementById('patient-name').value,
      age: document.getElementById('patient-age').value,
      gender: document.getElementById('patient-gender').value,
      phone: document.getElementById('patient-phone').value,
      visitType: document.querySelector('input[name="visitType"]:checked')?.value,
      payment: document.querySelector('input[name="payment"]:checked')?.value,
    };

    try {
      await submitAppointment(formData);
      msg.className = 'form-message success';
      msg.textContent = 'Appointment request submitted successfully! We will contact you soon.';
      msg.style.display = 'block';
      form.reset();
    } catch (err) {
      msg.className = 'form-message error';
      msg.textContent = err.message || 'Something went wrong. Please try again.';
      msg.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Appointment Request';
    }
  });
}

// ===== CLINIC INFO (footer) =====

async function loadClinicInfo() {
  const { data, error } = await supabase
    .from('clinic_info')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) return;

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText('footer-clinic-name', data.clinic_name);
  setText('footer-email', data.email);
  setText('footer-phone', data.phone);
  setText('footer-address', data.address);

  const mapLink = document.getElementById('footer-map-link');
  if (mapLink && data.google_maps_link) {
    mapLink.href = data.google_maps_link;
  }

  // Also update header if needed
  const headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.textContent = data.clinic_name;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await checkSession();
  } catch (err) {
    console.warn("Session check in app.js failed:", err);
  }

  try {
    initAppointmentForm();
  } catch (err) {
    console.error("Appointment form initialization failed:", err);
  }

  try {
    await loadClinicInfo();
  } catch (err) {
    console.warn("Loading clinic info failed (might be placeholder keys):", err);
  }
});
