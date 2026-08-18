'use strict';
/* =========================================================
   Halaqoh Tahfidz — app.js
   Satu-satunya sistem auth + seluruh logic aplikasi.
   Bergantung pada: config.js (window.SUPABASE_CONFIG),
   surahs.js (SURAH_LIST + helper), CDN supabase-js v2,
   Chart.js v4, jsPDF v2.
   ========================================================= */

/* ============ STATE ============ */
var supabaseClient = null;
var currentSession = null;
var currentProfile = null; // { id, name, role, created_at }
var appState = { students: [], groups: [], profiles: [], records: [] };
var currentPage = 'dashboard';
var confirmCallback = null;
var chartInstances = {};
var activeRekapPeriod = 'weekly';
var groupQuickCreateContext = false;

/* =========================================================
   UTILITIES
   ========================================================= */
function todayISO() {
  var d = new Date();
  var off = d.getTimezoneOffset();
  var local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
function isoFromDate(d) {
  var off = d.getTimezoneOffset();
  var local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}
function formatDateHuman(iso) {
  if (!iso) return '-';
  var parts = iso.split('-');
  if (parts.length !== 3) return iso;
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
function formatDateHumanShort(iso) {
  var parts = iso.split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d.getDate() + ' ' + months[d.getMonth()];
}
function escapeHTML(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function emptyStateHTML(icon, text) {
  return '<div class="empty-state" style="padding:24px 8px;"><div class="empty-icon">' + icon + '</div><p>' + escapeHTML(text) + '</p></div>';
}
function supabaseErrorMessage(err) {
  if (!err) return 'Terjadi kesalahan tidak diketahui.';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  try { return JSON.stringify(err); } catch (e) { return 'Terjadi kesalahan tidak diketahui.'; }
}
function getSurahByName(name) {
  return SURAH_LIST.find(function (s) { return s.name === name; }) || null;
}
function getStudentById(id) { return appState.students.find(function (s) { return s.id === id; }) || null; }
function getGroupById(id) { return appState.groups.find(function (g) { return g.id === id; }) || null; }
function getProfileById(id) { return appState.profiles.find(function (p) { return p.id === id; }) || null; }

/* =========================================================
   TOAST
   ========================================================= */
function showToast(message, type) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function () {
    toast.classList.add('toast-out');
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 260);
  }, 2800);
}

/* =========================================================
   RIPPLE MICRO-INTERACTION
   ========================================================= */
function createRipple(e, el) {
  var rect = el.getBoundingClientRect();
  var size = Math.max(rect.width, rect.height);
  var clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
  var clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
  if (typeof clientX !== 'number') { clientX = rect.left + rect.width / 2; clientY = rect.top + rect.height / 2; }
  var span = document.createElement('span');
  span.className = 'ripple-el dark';
  span.style.width = size + 'px';
  span.style.height = size + 'px';
  span.style.left = (clientX - rect.left - size / 2) + 'px';
  span.style.top = (clientY - rect.top - size / 2) + 'px';
  el.appendChild(span);
  setTimeout(function () { if (span.parentNode) span.parentNode.removeChild(span); }, 600);
}
function setupRippleDelegation() {
  var selector = '.btn, .nav-link, .icon-btn, .type-btn, .report-tab, .record-item, .table-row-clickable';
  document.addEventListener('click', function (e) {
    var target = e.target.closest ? e.target.closest(selector) : null;
    if (!target) return;
    createRipple(e, target);
  });
}

/* =========================================================
   MODAL HELPERS
   ========================================================= */
function openModal(id) {
  var overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  var overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}
function showConfirm(title, text, onConfirm) {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalText').textContent = text;
  confirmCallback = onConfirm;
  openModal('confirmModalOverlay');
}
function setupConfirmModal() {
  document.getElementById('confirmOkBtn').addEventListener('click', function () {
    var cb = confirmCallback;
    confirmCallback = null;
    closeModal('confirmModalOverlay');
    if (typeof cb === 'function') cb();
  });
  document.getElementById('confirmCancelBtn').addEventListener('click', function () {
    confirmCallback = null;
    closeModal('confirmModalOverlay');
  });
}

/* =========================================================
   FIELD ERROR HELPERS
   ========================================================= */
function clearFieldErrors(ids) {
  ids.forEach(function (id) {
    var errEl = document.getElementById(id + 'Error');
    var inputEl = document.getElementById(id);
    if (errEl) errEl.textContent = '';
    if (inputEl) inputEl.classList.remove('invalid');
  });
}
function setFieldError(id, message) {
  var errEl = document.getElementById(id + 'Error');
  var inputEl = document.getElementById(id);
  if (errEl) errEl.textContent = message;
  if (inputEl) inputEl.classList.add('invalid');
}
function setButtonLoading(btn, loading) {
  if (!btn) return;
  var label = btn.querySelector('.btn-label');
  var spinner = btn.querySelector('.btn-spinner');
  if (label && spinner) {
    label.style.visibility = loading ? 'hidden' : '';
    spinner.hidden = !loading;
    btn.disabled = loading;
    return;
  }
  if (loading) {
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Menyimpan...';
    btn.disabled = true;
  } else {
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
    btn.disabled = false;
  }
}

/* =========================================================
   SUPABASE INIT
   ========================================================= */
function initSupabase() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') return false;
  if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) return false;
  if (window.SUPABASE_CONFIG.url.indexOf('YOUR-PROJECT-REF') !== -1 || window.SUPABASE_CONFIG.anonKey.indexOf('YOUR-ANON-PUBLIC-KEY') !== -1) return false;
  try {
    supabaseClient = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
    return true;
  } catch (e) {
    return false;
  }
}
function showFatalConfigError() {
  document.getElementById('authScreen').classList.remove('hidden');
  var msgEl = document.getElementById('loginMsg');
  msgEl.textContent = 'Konfigurasi Supabase belum diisi. Buka file config.js dan isi "url" & "anonKey" project Supabase Anda.';
  msgEl.className = 'form-msg error';
  document.getElementById('loginSubmitBtn').disabled = true;
}

/* =========================================================
   NOTE FIELD (status Lancar/Tidak Lancar disimpan di kolom note)
   Format: baris pertama = "Lancar" atau "Tidak Lancar",
   baris berikutnya (opsional) = catatan tambahan bebas.
   ========================================================= */
function parseNoteField(note) {
  if (!note) return { hasil: null, catatan: '' };
  var idx = note.indexOf('\n');
  var firstLine = (idx === -1 ? note : note.slice(0, idx)).trim();
  var rest = idx === -1 ? '' : note.slice(idx + 1).trim();
  var hasil = null;
  if (/^lancar$/i.test(firstLine)) hasil = 'lancar';
  else if (/^tidak\s*lancar$/i.test(firstLine)) hasil = 'tidak_lancar';
  if (hasil === null) return { hasil: null, catatan: note.trim() };
  return { hasil: hasil, catatan: rest };
}
function buildNoteField(hasil, catatan) {
  var label = hasil === 'lancar' ? 'Lancar' : 'Tidak Lancar';
  var trimmed = (catatan || '').trim();
  return trimmed ? (label + '\n' + trimmed) : label;
}
function hasilLabel(hasil) {
  return hasil === 'lancar' ? 'Lancar' : (hasil === 'tidak_lancar' ? 'Tidak Lancar' : '-');
}

/* =========================================================
   STATUS ENGINE — aturan Ziyadah/Murajaah
   ========================================================= */
function compareRecordChrono(a, b) {
  if (a.record_date !== b.record_date) return a.record_date < b.record_date ? -1 : 1;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}
function getLatestRecordUpTo(studentId, dateStr, excludeId) {
  var candidates = appState.records.filter(function (r) {
    return r.student_id === studentId && r.record_date <= dateStr && r.id !== excludeId;
  });
  if (!candidates.length) return null;
  candidates.sort(compareRecordChrono);
  return candidates[candidates.length - 1];
}
function isZiyadahLocked(studentId, dateStr, excludeId) {
  var last = getLatestRecordUpTo(studentId, dateStr, excludeId);
  if (!last) return false;
  var parsed = parseNoteField(last.note);
  if (last.type === 'Murajaah') return parsed.hasil === 'tidak_lancar';
  if (last.type === 'Ziyadah') return parsed.hasil === 'tidak_lancar' && last.record_date < dateStr;
  return false;
}
function getStudentStatus(studentId, dateStr) {
  var last = getLatestRecordUpTo(studentId, dateStr, null);
  if (!last) return { label: 'Normal', wajibMurajaah: false };
  var parsed = parseNoteField(last.note);
  var wajib = false;
  if (last.type === 'Murajaah') wajib = parsed.hasil === 'tidak_lancar';
  else if (last.type === 'Ziyadah') wajib = parsed.hasil === 'tidak_lancar' && last.record_date < dateStr;
  return { label: wajib ? 'Wajib Murajaah' : 'Normal', wajibMurajaah: wajib };
}

/* =========================================================
   DATA LOADING (Supabase)
   ========================================================= */
async function loadCurrentProfile() {
  try {
    var userId = currentSession.user.id;
    var res = await supabaseClient.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (res.error || !res.data) return false;
    currentProfile = res.data;
    return true;
  } catch (e) {
    return false;
  }
}

async function refreshAllData() {
  var isAdminRole = currentProfile.role === 'admin';
  try {
    var profilesRes = await supabaseClient.from('profiles').select('*');
    if (profilesRes.error) throw profilesRes.error;
    appState.profiles = profilesRes.data || [];

    var groupsRes = await supabaseClient.from('groups').select('*');
    if (groupsRes.error) throw groupsRes.error;
    appState.groups = groupsRes.data || [];

    var studentsQuery = supabaseClient.from('students').select('*');
    if (!isAdminRole) studentsQuery = studentsQuery.eq('ustadz_id', currentProfile.id);
    var studentsRes = await studentsQuery;
    if (studentsRes.error) throw studentsRes.error;
    appState.students = studentsRes.data || [];

    if (isAdminRole) {
      var recordsRes = await supabaseClient.from('records').select('*');
      if (recordsRes.error) throw recordsRes.error;
      appState.records = recordsRes.data || [];
    } else {
      var ids = appState.students.map(function (s) { return s.id; });
      if (!ids.length) {
        appState.records = [];
      } else {
        var recordsRes2 = await supabaseClient.from('records').select('*').in('student_id', ids);
        if (recordsRes2.error) throw recordsRes2.error;
        appState.records = recordsRes2.data || [];
      }
    }
  } catch (err) {
    showToast('Gagal memuat data: ' + supabaseErrorMessage(err), 'error');
  }
}

/* =========================================================
   AUTH FLOW
   ========================================================= */
async function handleLoginSubmit(e) {
  e.preventDefault();
  clearFieldErrors(['loginEmail', 'loginPassword']);
  var msgEl = document.getElementById('loginMsg');
  msgEl.textContent = ''; msgEl.className = 'form-msg';

  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value;
  var valid = true;
  if (!email) { setFieldError('loginEmail', 'Email wajib diisi.'); valid = false; }
  if (!password) { setFieldError('loginPassword', 'Password wajib diisi.'); valid = false; }
  if (!valid) return;

  var btn = document.getElementById('loginSubmitBtn');
  setButtonLoading(btn, true);
  try {
    var res = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    currentSession = res.data.session;
    var ok = await loadCurrentProfile();
    if (!ok) {
      await supabaseClient.auth.signOut();
      msgEl.textContent = 'Profil pengguna tidak ditemukan di tabel profiles. Hubungi administrator.';
      msgEl.className = 'form-msg error';
      return;
    }
    document.getElementById('loginForm').reset();
    await enterApp();
  } catch (err) {
    msgEl.textContent = supabaseErrorMessage(err);
    msgEl.className = 'form-msg error';
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleLogout() {
  try { await supabaseClient.auth.signOut(); } catch (e) { /* ignore */ }
  currentSession = null;
  currentProfile = null;
  appState = { students: [], groups: [], profiles: [], records: [] };
  document.getElementById('loginForm').reset();
  clearFieldErrors(['loginEmail', 'loginPassword']);
  document.getElementById('loginMsg').textContent = '';
  showAuthScreen();
}

function hideSplash() { document.getElementById('splashScreen').classList.add('hidden'); }
function showAuthScreen() {
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
}
function showAppScreen() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
}

function applyRoleUI() {
  var isAdminRole = currentProfile.role === 'admin';
  document.getElementById('sidebarUserName').textContent = currentProfile.name || '-';
  document.getElementById('sidebarUserRole').textContent = isAdminRole ? 'Administrator' : 'Ustadz';
  var initial = (currentProfile.name || '?').trim().charAt(0).toUpperCase() || '?';
  document.getElementById('sidebarUserAvatar').textContent = initial;
  document.querySelectorAll('[data-role="admin"]').forEach(function (el) {
    el.style.display = isAdminRole ? '' : 'none';
  });
  document.getElementById('navSantriLabel').textContent = isAdminRole ? 'Santri' : 'Santri Binaan';
}

async function enterApp() {
  applyRoleUI();
  showAppScreen();
  await refreshAllData();
  switchPage('dashboard');
}

/* =========================================================
   NAVIGATION
   ========================================================= */
function pageTitleFor(p) {
  var map = {
    dashboard: 'Dashboard',
    santri: currentProfile.role === 'admin' ? 'Santri' : 'Santri Binaan',
    kelompok: 'Kelompok',
    ustadz: 'Akun Ustadz',
    setoran: 'Setoran',
    rekap: 'Rekap'
  };
  return map[p] || 'Dashboard';
}
function switchPage(pageName) {
  var restrictedForNonAdmin = ['kelompok', 'ustadz'];
  if (currentProfile.role !== 'admin' && restrictedForNonAdmin.indexOf(pageName) !== -1) {
    pageName = 'dashboard';
  }
  currentPage = pageName;
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  var target = document.getElementById('page-' + pageName);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(function (n) {
    n.classList.toggle('active', n.getAttribute('data-nav') === pageName);
  });
  document.getElementById('topbarTitle').textContent = pageTitleFor(pageName);
  closeSidebarMobile();
  document.getElementById('appMain').scrollTop = 0;
  window.scrollTo(0, 0);

  if (pageName === 'dashboard') renderDashboard();
  else if (pageName === 'santri') renderSantriPage();
  else if (pageName === 'kelompok') renderKelompokPage();
  else if (pageName === 'ustadz') renderUstadzPage();
  else if (pageName === 'setoran') renderSetoranPage();
  else if (pageName === 'rekap') renderRekapPage();
}
function openSidebarMobile() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarBackdrop').classList.add('active');
}
function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('active');
}
function setupSidebarToggle() {
  document.getElementById('hamburgerBtn').addEventListener('click', openSidebarMobile);
  document.getElementById('sidebarBackdrop').addEventListener('click', closeSidebarMobile);
}
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(function (btn) {
    btn.addEventListener('click', function () { switchPage(btn.getAttribute('data-nav')); });
  });
  document.addEventListener('click', function (e) {
    var linkBtn = e.target.closest ? e.target.closest('.link-btn[data-nav]') : null;
    if (linkBtn) switchPage(linkBtn.getAttribute('data-nav'));
  });
}

/* =========================================================
   CHART HELPERS
   ========================================================= */
function chartAvailable() { return typeof Chart !== 'undefined'; }
function destroyChart(key) {
  if (chartInstances[key]) { chartInstances[key].destroy(); delete chartInstances[key]; }
}
function computeDailyTrend(records, days) {
  var labels = [], counts = [];
  var today = new Date();
  for (var i = days - 1; i >= 0; i--) {
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    var iso = isoFromDate(d);
    labels.push(formatDateHumanShort(iso));
    counts.push(records.filter(function (r) { return r.record_date === iso; }).length);
  }
  return { labels: labels, counts: counts };
}
function computeRekapTrendSeries(periodRecords, range, period) {
  var labels = [], counts = [];
  if (period === 'weekly') {
    for (var d = new Date(range.start.getTime()); d <= range.end; d.setDate(d.getDate() + 1)) {
      var iso = isoFromDate(d);
      labels.push(formatDateHumanShort(iso));
      counts.push(periodRecords.filter(function (r) { return r.record_date === iso; }).length);
    }
  } else if (period === 'monthly') {
    var weekLabels = ['Mgg 1', 'Mgg 2', 'Mgg 3', 'Mgg 4', 'Mgg 5'];
    weekLabels.forEach(function (wk, idx) {
      var weekNo = idx + 1;
      var count = periodRecords.filter(function (r) {
        var day = parseInt(r.record_date.split('-')[2], 10);
        return Math.ceil(day / 7) === weekNo;
      }).length;
      if (count > 0 || weekNo <= 4) { labels.push(wk); counts.push(count); }
    });
  } else {
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    while (cursor <= range.end) {
      var mIdx = cursor.getMonth(), mYear = cursor.getFullYear();
      labels.push(monthNames[mIdx]);
      counts.push(periodRecords.filter(function (r) {
        var rd = new Date(r.record_date + 'T00:00:00');
        return rd.getMonth() === mIdx && rd.getFullYear() === mYear;
      }).length);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return { labels: labels, counts: counts };
}

function renderTrendChart(canvasId, fallbackId, days) {
  var canvas = document.getElementById(canvasId);
  var fallback = fallbackId ? document.getElementById(fallbackId) : null;
  if (!chartAvailable()) { canvas.style.display = 'none'; if (fallback) fallback.hidden = false; return; }
  canvas.style.display = 'block'; if (fallback) fallback.hidden = true;
  var trend = computeDailyTrend(appState.records, days);
  try {
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: trend.labels, datasets: [{ label: 'Setoran', data: trend.counts, borderColor: '#0f6e4f', backgroundColor: 'rgba(15,110,79,0.12)', fill: true, tension: 0.35, pointRadius: 3 }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { ticks: { color: '#6b7280' }, grid: { display: false } }
        }
      }
    });
  } catch (e) { canvas.style.display = 'none'; if (fallback) fallback.hidden = false; }
}
function renderTypeChart(canvasId, fallbackId, records) {
  var canvas = document.getElementById(canvasId);
  var fallback = fallbackId ? document.getElementById(fallbackId) : null;
  var z = records.filter(function (r) { return r.type === 'Ziyadah'; }).length;
  var m = records.filter(function (r) { return r.type === 'Murajaah'; }).length;
  if (!chartAvailable()) { canvas.style.display = 'none'; if (fallback) fallback.hidden = false; return; }
  if (z === 0 && m === 0) { canvas.style.display = 'none'; if (fallback) { fallback.hidden = false; fallback.textContent = 'Belum ada data.'; } return; }
  canvas.style.display = 'block'; if (fallback) fallback.hidden = true;
  try {
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels: ['Ziyadah', 'Murajaah'], datasets: [{ data: [z, m], backgroundColor: ['#0891b2', '#c9972f'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: '#6b7280', boxWidth: 10, font: { size: 11 } } } } }
    });
  } catch (e) { canvas.style.display = 'none'; if (fallback) fallback.hidden = false; }
}
function renderHasilChart(canvasId, records) {
  var canvas = document.getElementById(canvasId);
  var l = 0, t = 0;
  records.forEach(function (r) { var p = parseNoteField(r.note); if (p.hasil === 'lancar') l++; else if (p.hasil === 'tidak_lancar') t++; });
  if (!chartAvailable() || (l === 0 && t === 0)) { canvas.style.display = 'none'; return; }
  canvas.style.display = 'block';
  try {
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels: ['Lancar', 'Tidak Lancar'], datasets: [{ data: [l, t], backgroundColor: ['#16a34a', '#dc2626'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: '#6b7280', boxWidth: 10, font: { size: 11 } } } } }
    });
  } catch (e) { canvas.style.display = 'none'; }
}
function renderScoreChart(canvasId, rows) {
  var canvas = document.getElementById(canvasId);
  var filtered = rows.filter(function (r) { return r.count > 0; }).sort(function (a, b) { return b.avg - a.avg; }).slice(0, 15);
  if (!chartAvailable() || !filtered.length) { canvas.style.display = 'none'; return; }
  canvas.style.display = 'block';
  try {
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: filtered.map(function (r) { return r.student.name; }), datasets: [{ data: filtered.map(function (r) { return r.avg; }), backgroundColor: '#0f6e4f', borderRadius: 6, maxBarThickness: 22 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, max: 100, ticks: { color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)' } }, y: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } } }
      }
    });
  } catch (e) { canvas.style.display = 'none'; }
}
function renderRekapTrendChart(canvasId, periodRecords, range, period) {
  var canvas = document.getElementById(canvasId);
  if (!chartAvailable()) { canvas.style.display = 'none'; return; }
  var series = computeRekapTrendSeries(periodRecords, range, period);
  if (!series.labels.length) { canvas.style.display = 'none'; return; }
  canvas.style.display = 'block';
  try {
    destroyChart(canvasId);
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: series.labels, datasets: [{ data: series.counts, backgroundColor: '#c9972f', borderRadius: 6, maxBarThickness: 34 }] },
      options: {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b7280' }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { ticks: { color: '#6b7280' }, grid: { display: false } } }
      }
    });
  } catch (e) { canvas.style.display = 'none'; }
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function renderDashboard() {
  var isAdminRole = currentProfile.role === 'admin';
  document.getElementById('dashScopeDesc').textContent = isAdminRole ? 'Ringkasan seluruh santri.' : 'Ringkasan santri binaan Anda.';

  var totalSantri = appState.students.length;
  var totalSetoran = appState.records.length;
  var z = 0, m = 0, l = 0, t = 0, sum = 0, n = 0;
  appState.records.forEach(function (r) {
    if (r.type === 'Ziyadah') z++; else if (r.type === 'Murajaah') m++;
    var p = parseNoteField(r.note);
    if (p.hasil === 'lancar') l++; else if (p.hasil === 'tidak_lancar') t++;
    if (typeof r.score === 'number') { sum += r.score; n++; }
  });
  var avg = n ? Math.round((sum / n) * 10) / 10 : 0;
  var today = todayISO();
  var wajibStudents = appState.students.filter(function (s) { return getStudentStatus(s.id, today).wajibMurajaah; });

  document.getElementById('statTotalSantri').textContent = totalSantri;
  document.getElementById('statTotalSetoran').textContent = totalSetoran;
  document.getElementById('statZiyadah').textContent = z;
  document.getElementById('statMurajaah').textContent = m;
  document.getElementById('statLancar').textContent = l;
  document.getElementById('statTidakLancar').textContent = t;
  document.getElementById('statWajibMurajaah').textContent = wajibStudents.length;
  document.getElementById('statRataRata').textContent = avg;

  renderDashRecent();
  renderDashWajibMurajaah(wajibStudents);
  renderTrendChart('chartDashTrend', 'chartDashTrendFallback', 7);
  renderTypeChart('chartDashType', 'chartDashTypeFallback', appState.records);
}
function renderRecordItemHTML(r) {
  var student = getStudentById(r.student_id);
  var parsed = parseNoteField(r.note);
  var icon = r.type === 'Ziyadah' ? '📗' : '🔁';
  return '' +
    '<div class="record-item">' +
    '<div class="record-icon ' + r.type + '">' + icon + '</div>' +
    '<div class="record-info">' +
    '<div class="record-title">' + escapeHTML(student ? student.name : 'Santri') + '</div>' +
    '<div class="record-meta">' + (r.type === 'Ziyadah' ? 'Ziyadah' : 'Murajaah') + ' &middot; ' + escapeHTML(r.from_surah) + ':' + r.from_ayat + '-' + escapeHTML(r.to_surah) + ':' + r.to_ayat + ' &middot; ' + formatDateHuman(r.record_date) + '</div>' +
    '</div>' +
    '<span class="badge ' + (parsed.hasil === 'lancar' ? 'badge-lancar' : 'badge-tidak') + '">' + hasilLabel(parsed.hasil) + '</span>' +
    '</div>';
}
function renderDashRecent() {
  var el = document.getElementById('dashRecentList');
  var sorted = appState.records.slice().sort(function (a, b) { return compareRecordChrono(b, a); }).slice(0, 6);
  if (!sorted.length) { el.innerHTML = emptyStateHTML('📖', 'Belum ada setoran.'); return; }
  el.innerHTML = sorted.map(renderRecordItemHTML).join('');
}
function renderDashWajibMurajaah(list) {
  var el = document.getElementById('dashWajibMurajaahList');
  if (!list.length) { el.innerHTML = emptyStateHTML('✅', 'Tidak ada santri yang wajib murajaah saat ini.'); return; }
  el.innerHTML = list.map(function (s) {
    return '<div class="mini-student-row"><div><div class="mini-student-name">' + escapeHTML(s.name) + '</div><div class="mini-student-meta">' + escapeHTML(s.class_name || '-') + '</div></div><span class="badge badge-wajib">Wajib Murajaah</span></div>';
  }).join('');
}

/* =========================================================
   SANTRI PAGE
   ========================================================= */
function populateGroupFilterSelect() {
  var sel = document.getElementById('santriFilterGroup');
  var current = sel.value;
  sel.innerHTML = '<option value="all">Semua Kelompok</option>' + appState.groups.map(function (g) { return '<option value="' + g.id + '">' + escapeHTML(g.name) + '</option>'; }).join('');
  sel.value = current || 'all';
}
function populateUstadzFilterSelect() {
  var sel = document.getElementById('santriFilterUstadz');
  var current = sel.value;
  var list = appState.profiles.filter(function (p) { return p.role === 'ustadz'; });
  sel.innerHTML = '<option value="all">Semua Ustadz</option>' + list.map(function (u) { return '<option value="' + u.id + '">' + escapeHTML(u.name) + '</option>'; }).join('');
  sel.value = current || 'all';
}
function getFilteredStudents() {
  var search = document.getElementById('santriSearch').value.trim().toLowerCase();
  var isAdminRole = currentProfile.role === 'admin';
  var groupFilter = isAdminRole ? document.getElementById('santriFilterGroup').value : 'all';
  var ustadzFilter = isAdminRole ? document.getElementById('santriFilterUstadz').value : 'all';
  return appState.students.filter(function (s) {
    if (search && s.name.toLowerCase().indexOf(search) === -1) return false;
    if (groupFilter !== 'all' && s.group_id !== groupFilter) return false;
    if (ustadzFilter !== 'all' && s.ustadz_id !== ustadzFilter) return false;
    return true;
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });
}
function renderSantriPage() {
  var isAdminRole = currentProfile.role === 'admin';
  document.getElementById('santriScopeDesc').textContent = isAdminRole ? 'Kelola seluruh data santri.' : 'Daftar santri binaan Anda.';
  if (isAdminRole) { populateGroupFilterSelect(); populateUstadzFilterSelect(); }
  renderSantriTable();
}
function renderSantriTable() {
  var tbody = document.getElementById('santriTableBody');
  var emptyEl = document.getElementById('santriEmptyState');
  var isAdminRole = currentProfile.role === 'admin';
  var list = getFilteredStudents();
  if (!list.length) { tbody.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  var today = todayISO();
  tbody.innerHTML = list.map(function (s) {
    var group = getGroupById(s.group_id);
    var ustadz = getProfileById(s.ustadz_id);
    var status = getStudentStatus(s.id, today);
    var actionCell = isAdminRole ?
      '<td class="row-actions">' +
      '<button type="button" class="btn btn-ghost btn-small" data-action="edit-student" data-id="' + s.id + '">Edit</button>' +
      '<button type="button" class="btn btn-danger btn-small" data-action="delete-student" data-id="' + s.id + '">Hapus</button>' +
      '</td>' : '';
    return '<tr>' +
      '<td>' + escapeHTML(s.name) + '</td>' +
      '<td>' + escapeHTML(s.class_name || '-') + '</td>' +
      '<td>' + escapeHTML(group ? group.name : '-') + '</td>' +
      '<td>' + escapeHTML(ustadz ? ustadz.name : '-') + '</td>' +
      '<td><span class="badge ' + (status.wajibMurajaah ? 'badge-wajib' : 'badge-normal') + '">' + status.label + '</span></td>' +
      actionCell +
      '</tr>';
  }).join('');
  tbody.querySelectorAll('[data-action="edit-student"]').forEach(function (btn) {
    btn.addEventListener('click', function () { openStudentModalForEdit(btn.getAttribute('data-id')); });
  });
  tbody.querySelectorAll('[data-action="delete-student"]').forEach(function (btn) {
    btn.addEventListener('click', function () { handleDeleteStudent(btn.getAttribute('data-id'), false); });
  });
}
function setupSantriFilters() {
  document.getElementById('santriSearch').addEventListener('input', renderSantriTable);
  document.getElementById('santriFilterGroup').addEventListener('change', renderSantriTable);
  document.getElementById('santriFilterUstadz').addEventListener('change', renderSantriTable);
}

/* ---------- Student Modal ---------- */
function populateGroupSelect(selectEl, selectedId) {
  selectEl.innerHTML = '<option value="">- Pilih Kelompok -</option>' + appState.groups.map(function (g) { return '<option value="' + g.id + '">' + escapeHTML(g.name) + '</option>'; }).join('');
  selectEl.value = selectedId || '';
}
function populateUstadzSelect(selectEl, selectedId) {
  var list = appState.profiles.filter(function (p) { return p.role === 'ustadz'; });
  selectEl.innerHTML = '<option value="">- Pilih Ustadz -</option>' + list.map(function (u) { return '<option value="' + u.id + '">' + escapeHTML(u.name) + '</option>'; }).join('');
  selectEl.value = selectedId || '';
}
function openStudentModalForAdd() {
  if (currentProfile.role !== 'admin') { showToast('Anda tidak memiliki akses untuk ini.', 'error'); return; }
  document.getElementById('studentModalTitle').textContent = 'Tambah Santri';
  document.getElementById('studentId').value = '';
  document.getElementById('studentName').value = '';
  document.getElementById('studentClass').value = '';
  populateGroupSelect(document.getElementById('studentGroup'), '');
  populateUstadzSelect(document.getElementById('studentUstadz'), '');
  document.getElementById('studentFormMsg').textContent = '';
  document.getElementById('studentDeleteBtn').hidden = true;
  clearFieldErrors(['studentName', 'studentGroup', 'studentUstadz']);
  openModal('studentModalOverlay');
}
function openStudentModalForEdit(id) {
  var s = getStudentById(id);
  if (!s) return;
  document.getElementById('studentModalTitle').textContent = 'Edit Santri';
  document.getElementById('studentId').value = s.id;
  document.getElementById('studentName').value = s.name;
  document.getElementById('studentClass').value = s.class_name || '';
  populateGroupSelect(document.getElementById('studentGroup'), s.group_id);
  populateUstadzSelect(document.getElementById('studentUstadz'), s.ustadz_id);
  document.getElementById('studentFormMsg').textContent = '';
  document.getElementById('studentDeleteBtn').hidden = false;
  clearFieldErrors(['studentName', 'studentGroup', 'studentUstadz']);
  openModal('studentModalOverlay');
}
async function handleStudentFormSubmit(e) {
  e.preventDefault();
  if (currentProfile.role !== 'admin') { showToast('Anda tidak memiliki akses untuk ini.', 'error'); return; }
  clearFieldErrors(['studentName', 'studentGroup', 'studentUstadz']);
  var msgEl = document.getElementById('studentFormMsg');
  msgEl.textContent = ''; msgEl.className = 'form-msg';

  var id = document.getElementById('studentId').value;
  var name = document.getElementById('studentName').value.trim();
  var className = document.getElementById('studentClass').value.trim();
  var groupId = document.getElementById('studentGroup').value;
  var ustadzId = document.getElementById('studentUstadz').value;

  var valid = true;
  if (!name) { setFieldError('studentName', 'Nama santri wajib diisi.'); valid = false; }
  if (!ustadzId) { setFieldError('studentUstadz', 'Ustadz pembina wajib dipilih.'); valid = false; }
  if (!valid) return;

  var payload = { name: name, class_name: className || null, group_id: groupId || null, ustadz_id: ustadzId };
  var btn = document.getElementById('studentSaveBtn');
  setButtonLoading(btn, true);
  try {
    var res = id
      ? await supabaseClient.from('students').update(payload).eq('id', id)
      : await supabaseClient.from('students').insert(payload);
    if (res.error) throw res.error;
    closeModal('studentModalOverlay');
    showToast(id ? 'Data santri berhasil diperbarui.' : 'Santri berhasil ditambahkan.');
    await refreshAllData();
    switchPage('santri');
  } catch (err) {
    msgEl.textContent = supabaseErrorMessage(err);
    msgEl.className = 'form-msg error';
  } finally {
    setButtonLoading(btn, false);
  }
}
function handleDeleteStudent(id, fromModal) {
  if (currentProfile.role !== 'admin') { showToast('Anda tidak memiliki akses untuk ini.', 'error'); return; }
  var s = getStudentById(id);
  showConfirm('Hapus Santri', 'Data santri "' + (s ? s.name : '') + '" akan dihapus permanen beserta riwayat setorannya (jika ada relasi). Lanjutkan?', async function () {
    try {
      var res = await supabaseClient.from('students').delete().eq('id', id);
      if (res.error) throw res.error;
      if (fromModal) closeModal('studentModalOverlay');
      showToast('Santri berhasil dihapus.');
      await refreshAllData();
      switchPage('santri');
    } catch (err) {
      showToast('Gagal menghapus santri: ' + supabaseErrorMessage(err), 'error');
    }
  });
}

/* =========================================================
   KELOMPOK PAGE
   ========================================================= */
function renderKelompokPage() {
  var tbody = document.getElementById('kelompokTableBody');
  var emptyEl = document.getElementById('kelompokEmptyState');
  if (!appState.groups.length) { tbody.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  var sorted = appState.groups.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  tbody.innerHTML = sorted.map(function (g) {
    var ustadz = getProfileById(g.ustadz_id);
    var count = appState.students.filter(function (s) { return s.group_id === g.id; }).length;
    return '<tr>' +
      '<td>' + escapeHTML(g.name) + '</td>' +
      '<td>' + escapeHTML(ustadz ? ustadz.name : '-') + '</td>' +
      '<td>' + count + '</td>' +
      '<td class="row-actions">' +
      '<button type="button" class="btn btn-ghost btn-small" data-action="edit-group" data-id="' + g.id + '">Edit</button>' +
      '<button type="button" class="btn btn-danger btn-small" data-action="delete-group" data-id="' + g.id + '">Hapus</button>' +
      '</td>' +
      '</tr>';
  }).join('');
  tbody.querySelectorAll('[data-action="edit-group"]').forEach(function (btn) {
    btn.addEventListener('click', function () { openGroupModalForEdit(btn.getAttribute('data-id')); });
  });
  tbody.querySelectorAll('[data-action="delete-group"]').forEach(function (btn) {
    btn.addEventListener('click', function () { handleDeleteGroup(btn.getAttribute('data-id'), false); });
  });
}
function openGroupModalForAdd(quickMode) {
  groupQuickCreateContext = !!quickMode;
  document.getElementById('groupModalTitle').textContent = 'Buat Kelompok';
  document.getElementById('groupId').value = '';
  document.getElementById('groupName').value = '';
  populateUstadzSelect(document.getElementById('groupUstadz'), '');
  document.getElementById('groupFormMsg').textContent = '';
  document.getElementById('groupDeleteBtn').hidden = true;
  clearFieldErrors(['groupName', 'groupUstadz']);
  document.getElementById('groupModalOverlay').classList.toggle('stacked', groupQuickCreateContext);
  openModal('groupModalOverlay');
}
function openGroupModalForEdit(id) {
  groupQuickCreateContext = false;
  var g = getGroupById(id);
  if (!g) return;
  document.getElementById('groupModalTitle').textContent = 'Edit Kelompok';
  document.getElementById('groupId').value = g.id;
  document.getElementById('groupName').value = g.name;
  populateUstadzSelect(document.getElementById('groupUstadz'), g.ustadz_id);
  document.getElementById('groupFormMsg').textContent = '';
  document.getElementById('groupDeleteBtn').hidden = false;
  clearFieldErrors(['groupName', 'groupUstadz']);
  document.getElementById('groupModalOverlay').classList.remove('stacked');
  openModal('groupModalOverlay');
}
async function handleGroupFormSubmit(e) {
  e.preventDefault();
  if (currentProfile.role !== 'admin') { showToast('Anda tidak memiliki akses untuk ini.', 'error'); return; }
  clearFieldErrors(['groupName', 'groupUstadz']);
  var msgEl = document.getElementById('groupFormMsg');
  msgEl.textContent = ''; msgEl.className = 'form-msg';

  var id = document.getElementById('groupId').value;
  var name = document.getElementById('groupName').value.trim();
  var ustadzId = document.getElementById('groupUstadz').value;
  var valid = true;
  if (!name) { setFieldError('groupName', 'Nama kelompok wajib diisi.'); valid = false; }
  if (!ustadzId) { setFieldError('groupUstadz', 'Ustadz pembina wajib dipilih.'); valid = false; }
  if (!valid) return;

  var payload = { name: name, ustadz_id: ustadzId };
  var btn = document.getElementById('groupSaveBtn');
  setButtonLoading(btn, true);
  try {
    var newId = id;
    if (id) {
      var updRes = await supabaseClient.from('groups').update(payload).eq('id', id);
      if (updRes.error) throw updRes.error;
    } else {
      var insRes = await supabaseClient.from('groups').insert(payload).select().single();
      if (insRes.error) throw insRes.error;
      if (insRes.data) newId = insRes.data.id;
    }
    await refreshAllData();

    if (groupQuickCreateContext) {
      populateGroupSelect(document.getElementById('studentGroup'), newId);
      document.getElementById('groupModalOverlay').classList.remove('stacked');
      closeModal('groupModalOverlay');
      showToast('Kelompok berhasil dibuat dan dipilih.');
    } else {
      closeModal('groupModalOverlay');
      showToast(id ? 'Kelompok berhasil diperbarui.' : 'Kelompok berhasil dibuat.');
      switchPage('kelompok');
    }
  } catch (err) {
    msgEl.textContent = supabaseErrorMessage(err);
    msgEl.className = 'form-msg error';
  } finally {
    setButtonLoading(btn, false);
    groupQuickCreateContext = false;
  }
}
function handleDeleteGroup(id, fromModal) {
  var g = getGroupById(id);
  showConfirm('Hapus Kelompok', 'Kelompok "' + (g ? g.name : '') + '" akan dihapus. Lanjutkan?', async function () {
    try {
      var res = await supabaseClient.from('groups').delete().eq('id', id);
      if (res.error) throw res.error;
      if (fromModal) closeModal('groupModalOverlay');
      showToast('Kelompok berhasil dihapus.');
      await refreshAllData();
      switchPage('kelompok');
    } catch (err) {
      showToast('Gagal menghapus kelompok: ' + supabaseErrorMessage(err), 'error');
    }
  });
}

/* =========================================================
   AKUN USTADZ PAGE
   ========================================================= */
function renderUstadzPage() {
  var tbody = document.getElementById('ustadzTableBody');
  var emptyEl = document.getElementById('ustadzEmptyState');
  var list = appState.profiles.filter(function (p) { return p.role === 'ustadz'; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  if (!list.length) { tbody.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  tbody.innerHTML = list.map(function (u) {
    var count = appState.students.filter(function (s) { return s.ustadz_id === u.id; }).length;
    return '<tr><td>' + escapeHTML(u.name) + '</td><td title="Email tidak disimpan di tabel profiles">—</td><td>' + count + '</td></tr>';
  }).join('');
}
async function handleUstadzFormSubmit(e) {
  e.preventDefault();
  if (currentProfile.role !== 'admin') { showToast('Anda tidak memiliki akses untuk ini.', 'error'); return; }
  clearFieldErrors(['ustadzName', 'ustadzEmail', 'ustadzPassword']);
  var msgEl = document.getElementById('ustadzFormMsg');
  msgEl.textContent = ''; msgEl.className = 'form-msg';

  var name = document.getElementById('ustadzName').value.trim();
  var email = document.getElementById('ustadzEmail').value.trim();
  var password = document.getElementById('ustadzPassword').value;

  var valid = true;
  if (!name) { setFieldError('ustadzName', 'Nama wajib diisi.'); valid = false; }
  if (!email || email.indexOf('@') === -1) { setFieldError('ustadzEmail', 'Email tidak valid.'); valid = false; }
  if (!password || password.length < 6) { setFieldError('ustadzPassword', 'Password minimal 6 karakter.'); valid = false; }
  if (!valid) return;

  var btn = document.getElementById('ustadzSaveBtn');
  setButtonLoading(btn, true);
  try {
    var adminSessionRes = await supabaseClient.auth.getSession();
    var adminSession = adminSessionRes.data ? adminSessionRes.data.session : null;

    var signUpRes = await supabaseClient.auth.signUp({ email: email, password: password });
    if (signUpRes.error) throw signUpRes.error;
    var newUser = signUpRes.data ? signUpRes.data.user : null;
    if (!newUser) throw new Error('Gagal membuat akun (tidak ada data user yang dikembalikan Supabase).');

    // upsert (bukan insert polos): beberapa project Supabase punya trigger yang
    // otomatis membuat baris "profiles" saat auth.users baru dibuat — upsert
    // memastikan proses ini tetap berhasil baik trigger itu ada atau tidak.
    var profileRes = await supabaseClient.from('profiles').upsert({ id: newUser.id, name: name, role: 'ustadz' }, { onConflict: 'id' });
    if (profileRes.error) throw profileRes.error;

    if (adminSession) {
      await supabaseClient.auth.setSession({ access_token: adminSession.access_token, refresh_token: adminSession.refresh_token });
      currentSession = adminSession;
    }

    document.getElementById('ustadzForm').reset();
    closeModal('ustadzModalOverlay');
    showToast('Akun ustadz "' + name + '" berhasil dibuat.');
    await refreshAllData();
    switchPage('ustadz');
  } catch (err) {
    msgEl.textContent = supabaseErrorMessage(err);
    msgEl.className = 'form-msg error';
  } finally {
    setButtonLoading(btn, false);
  }
}

/* =========================================================
   SETORAN PAGE
   ========================================================= */
function getFilteredRecords() {
  var search = document.getElementById('setoranSearch').value.trim().toLowerCase();
  var typeFilter = document.getElementById('setoranFilterType').value;
  var hasilFilter = document.getElementById('setoranFilterHasil').value;
  var from = document.getElementById('setoranFilterFrom').value;
  var to = document.getElementById('setoranFilterTo').value;
  return appState.records.filter(function (r) {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    var parsed = parseNoteField(r.note);
    if (hasilFilter !== 'all' && parsed.hasil !== hasilFilter) return false;
    if (from && r.record_date < from) return false;
    if (to && r.record_date > to) return false;
    if (search) {
      var student = getStudentById(r.student_id);
      var hay = (student ? student.name : '').toLowerCase();
      if (hay.indexOf(search) === -1) return false;
    }
    return true;
  }).sort(function (a, b) { return compareRecordChrono(b, a); });
}
function renderSetoranPage() {
  document.getElementById('setoranScopeDesc').textContent = currentProfile.role === 'admin' ? 'Kelola seluruh setoran hafalan.' : 'Kelola setoran santri binaan Anda.';
  renderSetoranTable();
}
function renderSetoranTable() {
  var tbody = document.getElementById('setoranTableBody');
  var emptyEl = document.getElementById('setoranEmptyState');
  var list = getFilteredRecords();
  if (!list.length) { tbody.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  tbody.innerHTML = list.map(function (r) {
    var student = getStudentById(r.student_id);
    var parsed = parseNoteField(r.note);
    return '<tr>' +
      '<td>' + formatDateHuman(r.record_date) + '</td>' +
      '<td>' + escapeHTML(student ? student.name : '-') + '</td>' +
      '<td><span class="badge ' + (r.type === 'Ziyadah' ? 'badge-ziyadah' : 'badge-murajaah') + '">' + (r.type === 'Ziyadah' ? 'Ziyadah' : 'Murajaah') + '</span></td>' +
      '<td>' + escapeHTML(r.from_surah) + ' : ' + r.from_ayat + '</td>' +
      '<td>' + escapeHTML(r.to_surah) + ' : ' + r.to_ayat + '</td>' +
      '<td>' + (r.score != null ? r.score : '-') + '</td>' +
      '<td><span class="badge ' + (parsed.hasil === 'lancar' ? 'badge-lancar' : 'badge-tidak') + '">' + hasilLabel(parsed.hasil) + '</span></td>' +
      '<td class="row-actions">' +
      '<button type="button" class="btn btn-ghost btn-small" data-action="edit-record" data-id="' + r.id + '">Edit</button>' +
      '<button type="button" class="btn btn-danger btn-small" data-action="delete-record" data-id="' + r.id + '">Hapus</button>' +
      '</td>' +
      '</tr>';
  }).join('');
  tbody.querySelectorAll('[data-action="edit-record"]').forEach(function (btn) {
    btn.addEventListener('click', function () { openSetoranModalForEdit(btn.getAttribute('data-id')); });
  });
  tbody.querySelectorAll('[data-action="delete-record"]').forEach(function (btn) {
    btn.addEventListener('click', function () { handleDeleteRecord(btn.getAttribute('data-id'), false); });
  });
}
function setupSetoranFilters() {
  ['setoranSearch', 'setoranFilterType', 'setoranFilterHasil', 'setoranFilterFrom', 'setoranFilterTo'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('input', renderSetoranTable);
    el.addEventListener('change', renderSetoranTable);
  });
  document.getElementById('setoranFilterReset').addEventListener('click', function () {
    document.getElementById('setoranSearch').value = '';
    document.getElementById('setoranFilterType').value = 'all';
    document.getElementById('setoranFilterHasil').value = 'all';
    document.getElementById('setoranFilterFrom').value = '';
    document.getElementById('setoranFilterTo').value = '';
    renderSetoranTable();
  });
}

/* ---------- Setoran Modal ---------- */
function populateSetoranStudentSelect(selectedId) {
  var sel = document.getElementById('setoranStudent');
  var list = appState.students.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  sel.innerHTML = list.map(function (s) { return '<option value="' + s.id + '">' + escapeHTML(s.name) + '</option>'; }).join('');
  if (selectedId) sel.value = selectedId;
}
function populateSurahSelect(selectEl, selectedName) {
  selectEl.innerHTML = surahOptionsHTML();
  if (selectedName) selectEl.value = selectedName;
}
function setSetoranTypeUI(type) {
  document.getElementById('setoranTypeZiyadahBtn').classList.toggle('active', type === 'Ziyadah');
  document.getElementById('setoranTypeMurajaahBtn').classList.toggle('active', type === 'Murajaah');
  updateSetoranStatusHint();
}
function setSetoranHasilUI(hasil) {
  document.getElementById('setoranHasilLancarBtn').classList.toggle('active', hasil === 'lancar');
  document.getElementById('setoranHasilTidakBtn').classList.toggle('active', hasil === 'tidak_lancar');
}
function getSetoranTypeUI() { return document.getElementById('setoranTypeMurajaahBtn').classList.contains('active') ? 'Murajaah' : 'Ziyadah'; }
function getSetoranHasilUI() { return document.getElementById('setoranHasilTidakBtn').classList.contains('active') ? 'tidak_lancar' : 'lancar'; }
function updateSetoranStatusHint() {
  var studentId = document.getElementById('setoranStudent').value;
  var date = document.getElementById('setoranDate').value || todayISO();
  var excludeId = document.getElementById('setoranId').value || null;
  var hintEl = document.getElementById('setoranStudentStatus');
  if (!studentId) { hintEl.textContent = '-'; hintEl.classList.remove('locked'); return; }
  var status = getStudentStatus(studentId, date);
  var locked = isZiyadahLocked(studentId, date, excludeId);
  var type = getSetoranTypeUI();
  if (type === 'Ziyadah' && locked) {
    hintEl.textContent = 'Ziyadah terkunci untuk tanggal ini — santri wajib Murajaah terlebih dahulu (setoran Ziyadah pada tanggal sebelumnya masih Tidak Lancar).';
    hintEl.classList.add('locked');
  } else {
    hintEl.textContent = 'Status saat ini: ' + status.label + '.';
    hintEl.classList.remove('locked');
  }
}
function openSetoranModalForAdd(presetStudentId) {
  if (!appState.students.length) { showToast('Belum ada santri. Tambahkan santri terlebih dahulu.', 'error'); return; }
  document.getElementById('setoranModalTitle').textContent = 'Catat Setoran';
  document.getElementById('setoranId').value = '';
  populateSetoranStudentSelect(presetStudentId || appState.students[0].id);
  populateSurahSelect(document.getElementById('setoranFromSurah'), SURAH_LIST[0].name);
  populateSurahSelect(document.getElementById('setoranToSurah'), SURAH_LIST[0].name);
  document.getElementById('setoranFromAyat').value = 1;
  document.getElementById('setoranToAyat').value = 1;
  document.getElementById('setoranDate').value = todayISO();
  document.getElementById('setoranScore').value = '';
  document.getElementById('setoranCatatan').value = '';
  setSetoranTypeUI('Ziyadah');
  setSetoranHasilUI('lancar');
  document.getElementById('setoranFormMsg').textContent = '';
  document.getElementById('setoranSurahError').textContent = '';
  document.getElementById('setoranScoreError').textContent = '';
  document.getElementById('setoranDeleteBtn').hidden = true;
  clearFieldErrors(['setoranStudent']);
  updateSetoranStatusHint();
  openModal('setoranModalOverlay');
}
function openSetoranModalForEdit(id) {
  var r = appState.records.find(function (x) { return x.id === id; });
  if (!r) return;
  document.getElementById('setoranModalTitle').textContent = 'Edit Setoran';
  document.getElementById('setoranId').value = r.id;
  populateSetoranStudentSelect(r.student_id);
  populateSurahSelect(document.getElementById('setoranFromSurah'), r.from_surah);
  populateSurahSelect(document.getElementById('setoranToSurah'), r.to_surah);
  document.getElementById('setoranFromAyat').value = r.from_ayat;
  document.getElementById('setoranToAyat').value = r.to_ayat;
  document.getElementById('setoranDate').value = r.record_date;
  document.getElementById('setoranScore').value = r.score;
  var parsed = parseNoteField(r.note);
  document.getElementById('setoranCatatan').value = parsed.catatan || '';
  setSetoranTypeUI(r.type);
  setSetoranHasilUI(parsed.hasil || 'lancar');
  document.getElementById('setoranFormMsg').textContent = '';
  document.getElementById('setoranSurahError').textContent = '';
  document.getElementById('setoranScoreError').textContent = '';
  document.getElementById('setoranDeleteBtn').hidden = false;
  clearFieldErrors(['setoranStudent']);
  updateSetoranStatusHint();
  openModal('setoranModalOverlay');
}
async function handleSetoranFormSubmit(e) {
  e.preventDefault();
  clearFieldErrors(['setoranStudent']);
  document.getElementById('setoranSurahError').textContent = '';
  document.getElementById('setoranScoreError').textContent = '';
  var msgEl = document.getElementById('setoranFormMsg');
  msgEl.textContent = ''; msgEl.className = 'form-msg';

  var id = document.getElementById('setoranId').value;
  var studentId = document.getElementById('setoranStudent').value;
  var type = getSetoranTypeUI();
  var fromSurah = document.getElementById('setoranFromSurah').value;
  var fromAyat = parseInt(document.getElementById('setoranFromAyat').value, 10);
  var toSurah = document.getElementById('setoranToSurah').value;
  var toAyat = parseInt(document.getElementById('setoranToAyat').value, 10);
  var date = document.getElementById('setoranDate').value;
  var score = parseInt(document.getElementById('setoranScore').value, 10);
  var hasil = getSetoranHasilUI();
  var catatan = document.getElementById('setoranCatatan').value;

  var valid = true;
  if (!studentId) { setFieldError('setoranStudent', 'Santri wajib dipilih.'); valid = false; }
  if (!date) { msgEl.textContent = 'Tanggal wajib diisi.'; msgEl.className = 'form-msg error'; valid = false; }

  var fromInfo = getSurahByName(fromSurah);
  var toInfo = getSurahByName(toSurah);
  if (!fromInfo || !toInfo) {
    document.getElementById('setoranSurahError').textContent = 'Pilih surat yang valid.';
    valid = false;
  } else {
    if (toInfo.no < fromInfo.no) {
      document.getElementById('setoranSurahError').textContent = 'Surat sampai tidak boleh sebelum surat dari.';
      valid = false;
    } else if (toInfo.no === fromInfo.no && toAyat < fromAyat) {
      document.getElementById('setoranSurahError').textContent = 'Ayat sampai tidak boleh sebelum ayat dari (surat sama).';
      valid = false;
    }
    if (!fromAyat || fromAyat < 1 || fromAyat > fromInfo.ayahCount) {
      document.getElementById('setoranSurahError').textContent = 'Ayat "Dari" tidak valid untuk surat ' + fromInfo.name + ' (maks ' + fromInfo.ayahCount + ' ayat).';
      valid = false;
    }
    if (!toAyat || toAyat < 1 || toAyat > toInfo.ayahCount) {
      document.getElementById('setoranSurahError').textContent = 'Ayat "Sampai" tidak valid untuk surat ' + toInfo.name + ' (maks ' + toInfo.ayahCount + ' ayat).';
      valid = false;
    }
  }
  if (isNaN(score) || score < 0 || score > 100) {
    document.getElementById('setoranScoreError').textContent = 'Nilai harus di antara 0-100.';
    valid = false;
  }
  if (!valid) return;

  if (type === 'Ziyadah' && isZiyadahLocked(studentId, date, id || null)) {
    msgEl.textContent = 'Ziyadah terkunci untuk tanggal ini karena setoran Ziyadah sebelumnya (tanggal lebih awal) masih Tidak Lancar. Silakan catat Murajaah terlebih dahulu.';
    msgEl.className = 'form-msg error';
    return;
  }

  var note = buildNoteField(hasil, catatan);
  var basePayload = {
    student_id: studentId, type: type, from_surah: fromSurah, from_ayat: fromAyat,
    to_surah: toSurah, to_ayat: toAyat, score: score, note: note, record_date: date
  };

  var btn = document.getElementById('setoranSaveBtn');
  setButtonLoading(btn, true);
  try {
    var res;
    if (id) {
      res = await supabaseClient.from('records').update(basePayload).eq('id', id);
    } else {
      var insertPayload = Object.assign({}, basePayload, { ustadz_id: currentProfile.id });
      res = await supabaseClient.from('records').insert(insertPayload);
    }
    if (res.error) throw res.error;
    closeModal('setoranModalOverlay');
    showToast(id ? 'Setoran berhasil diperbarui.' : 'Setoran berhasil disimpan.');
    await refreshAllData();
    switchPage(currentPage);
  } catch (err) {
    msgEl.textContent = supabaseErrorMessage(err);
    msgEl.className = 'form-msg error';
  } finally {
    setButtonLoading(btn, false);
  }
}
function handleDeleteRecord(id, fromModal) {
  showConfirm('Hapus Setoran', 'Data setoran ini akan dihapus secara permanen. Lanjutkan?', async function () {
    try {
      var res = await supabaseClient.from('records').delete().eq('id', id);
      if (res.error) throw res.error;
      if (fromModal) closeModal('setoranModalOverlay');
      showToast('Setoran berhasil dihapus.');
      await refreshAllData();
      switchPage(currentPage);
    } catch (err) {
      showToast('Gagal menghapus setoran: ' + supabaseErrorMessage(err), 'error');
    }
  });
}

/* =========================================================
   REKAP PAGE
   ========================================================= */
function isDateInRange(dateStr, start, end) {
  var d = new Date(dateStr + 'T00:00:00');
  var s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  var e = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
  return d >= s && d <= e;
}
function getRekapRange(period) {
  var now = new Date();
  var end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var start;
  if (period === 'weekly') {
    start = new Date(end.getTime()); start.setDate(end.getDate() - 6);
  } else if (period === 'monthly') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    var month = now.getMonth();
    if (month >= 6) { start = new Date(now.getFullYear(), 6, 1); end = new Date(now.getFullYear(), 11, 31); }
    else { start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 5, 30); }
  }
  return { start: start, end: end };
}
function getRekapPeriodLabel(period) {
  var r = getRekapRange(period);
  if (period === 'weekly') return formatDateHuman(isoFromDate(r.start)) + ' - ' + formatDateHuman(isoFromDate(r.end));
  if (period === 'monthly') {
    var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var now = new Date();
    return months[now.getMonth()] + ' ' + now.getFullYear();
  }
  var now2 = new Date();
  return 'Semester ' + (now2.getMonth() >= 6 ? 'Ganjil' : 'Genap') + ' ' + now2.getFullYear();
}
function computeStudentRekapRow(student, periodRecords) {
  var mine = periodRecords.filter(function (r) { return r.student_id === student.id; });
  var z = 0, m = 0, l = 0, t = 0, sum = 0, n = 0;
  mine.forEach(function (r) {
    if (r.type === 'Ziyadah') z++; else if (r.type === 'Murajaah') m++;
    var p = parseNoteField(r.note);
    if (p.hasil === 'lancar') l++; else if (p.hasil === 'tidak_lancar') t++;
    if (typeof r.score === 'number') { sum += r.score; n++; }
  });
  var avg = n ? Math.round((sum / n) * 10) / 10 : 0;
  var status = getStudentStatus(student.id, todayISO());
  var allZiyadah = appState.records.filter(function (r) { return r.student_id === student.id && r.type === 'Ziyadah'; }).sort(compareRecordChrono);
  var last = allZiyadah.length ? allZiyadah[allZiyadah.length - 1] : null;
  var lastHafalan = last ? (last.to_surah + ' : ' + last.to_ayat) : '-';
  return { student: student, ziyadah: z, murajaah: m, lancar: l, tidak: t, avg: avg, status: status.label, lastHafalan: lastHafalan, count: mine.length };
}
function setupRekapTabsUI() {
  document.querySelectorAll('#rekapTabs .report-tab').forEach(function (t) {
    t.classList.toggle('active', t.getAttribute('data-period') === activeRekapPeriod);
  });
}
function renderRekapPage() {
  setupRekapTabsUI();
  renderRekapContent();
}
function renderRekapContent() {
  var range = getRekapRange(activeRekapPeriod);
  document.getElementById('rekapPeriodLabel').textContent = getRekapPeriodLabel(activeRekapPeriod);
  var periodRecords = appState.records.filter(function (r) { return isDateInRange(r.record_date, range.start, range.end); });

  var totalSantri = appState.students.length;
  var totalSetoran = periodRecords.length;
  var z = 0, m = 0, l = 0, t = 0, sum = 0, n = 0;
  periodRecords.forEach(function (r) {
    if (r.type === 'Ziyadah') z++; else if (r.type === 'Murajaah') m++;
    var p = parseNoteField(r.note);
    if (p.hasil === 'lancar') l++; else if (p.hasil === 'tidak_lancar') t++;
    if (typeof r.score === 'number') { sum += r.score; n++; }
  });
  var avg = n ? Math.round((sum / n) * 10) / 10 : 0;
  var wajibCount = appState.students.filter(function (s) { return getStudentStatus(s.id, todayISO()).wajibMurajaah; }).length;

  document.getElementById('rekapTotalSantri').textContent = totalSantri;
  document.getElementById('rekapTotalSetoran').textContent = totalSetoran;
  document.getElementById('rekapZiyadah').textContent = z;
  document.getElementById('rekapMurajaah').textContent = m;
  document.getElementById('rekapLancar').textContent = l;
  document.getElementById('rekapTidakLancar').textContent = t;
  document.getElementById('rekapRataRata').textContent = avg;
  document.getElementById('rekapWajibMurajaah').textContent = wajibCount;

  renderTypeChart('chartRekapType', null, periodRecords);
  renderHasilChart('chartRekapHasil', periodRecords);
  var rows = appState.students.map(function (s) { return computeStudentRekapRow(s, periodRecords); });
  renderScoreChart('chartRekapScore', rows);
  renderRekapTrendChart('chartRekapTrend', periodRecords, range, activeRekapPeriod);
  renderRekapTable(rows);
}
function renderRekapTable(rows) {
  var tbody = document.getElementById('rekapTableBody');
  var emptyEl = document.getElementById('rekapEmptyState');
  var sorted = rows.slice().sort(function (a, b) { return a.student.name.localeCompare(b.student.name); });
  if (!sorted.length) { tbody.innerHTML = ''; emptyEl.hidden = false; return; }
  emptyEl.hidden = true;
  tbody.innerHTML = sorted.map(function (row, idx) {
    return '<tr>' +
      '<td>' + (idx + 1) + '</td>' +
      '<td>' + escapeHTML(row.student.name) + '</td>' +
      '<td>' + row.ziyadah + '</td>' +
      '<td>' + row.murajaah + '</td>' +
      '<td>' + row.lancar + '</td>' +
      '<td>' + row.tidak + '</td>' +
      '<td>' + row.avg + '</td>' +
      '<td><span class="badge ' + (row.status === 'Wajib Murajaah' ? 'badge-wajib' : 'badge-normal') + '">' + row.status + '</span></td>' +
      '<td>' + escapeHTML(row.lastHafalan) + '</td>' +
      '</tr>';
  }).join('');
}
function setupRekapTabs() {
  document.getElementById('rekapTabs').addEventListener('click', function (e) {
    var btn = e.target.closest('.report-tab');
    if (!btn) return;
    activeRekapPeriod = btn.getAttribute('data-period');
    renderRekapPage();
  });
}

/* =========================================================
   PDF REKAP EXPORT
   ========================================================= */
function truncateTextPdf(doc, text, maxWidth) {
  text = text == null ? '' : String(text);
  if (doc.getTextWidth(text) <= maxWidth) return text;
  while (text.length > 1 && doc.getTextWidth(text + '...') > maxWidth) { text = text.slice(0, -1); }
  return text + '...';
}
async function buildRekapChartImages(periodRecords, rows, range, period) {
  var images = {};
  if (!chartAvailable()) return images;
  var container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  function makeCanvas() {
    var c = document.createElement('canvas');
    c.width = 640; c.height = 320;
    container.appendChild(c);
    return c;
  }
  var tempCharts = [];
  try {
    var z = periodRecords.filter(function (r) { return r.type === 'Ziyadah'; }).length;
    var m = periodRecords.filter(function (r) { return r.type === 'Murajaah'; }).length;
    if (z > 0 || m > 0) {
      var c1 = makeCanvas();
      var ch1 = new Chart(c1.getContext('2d'), {
        type: 'doughnut',
        data: { labels: ['Ziyadah', 'Murajaah'], datasets: [{ data: [z, m], backgroundColor: ['#0891b2', '#c9972f'] }] },
        options: { responsive: false, animation: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 13 } } } } }
      });
      tempCharts.push(ch1);
      images.type = c1.toDataURL('image/png', 1.0);
    }

    var l = 0, t = 0;
    periodRecords.forEach(function (r) { var p = parseNoteField(r.note); if (p.hasil === 'lancar') l++; else if (p.hasil === 'tidak_lancar') t++; });
    if (l > 0 || t > 0) {
      var c2 = makeCanvas();
      var ch2 = new Chart(c2.getContext('2d'), {
        type: 'doughnut',
        data: { labels: ['Lancar', 'Tidak Lancar'], datasets: [{ data: [l, t], backgroundColor: ['#16a34a', '#dc2626'] }] },
        options: { responsive: false, animation: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 13 } } } } }
      });
      tempCharts.push(ch2);
      images.hasil = c2.toDataURL('image/png', 1.0);
    }

    var zScores = periodRecords.filter(function (r) { return r.type === 'Ziyadah' && typeof r.score === 'number'; }).map(function (r) { return r.score; });
    var mScores = periodRecords.filter(function (r) { return r.type === 'Murajaah' && typeof r.score === 'number'; }).map(function (r) { return r.score; });
    var zAvg = zScores.length ? Math.round((zScores.reduce(function (a, b) { return a + b; }, 0) / zScores.length) * 10) / 10 : 0;
    var mAvg = mScores.length ? Math.round((mScores.reduce(function (a, b) { return a + b; }, 0) / mScores.length) * 10) / 10 : 0;
    if (zScores.length || mScores.length) {
      var c3 = makeCanvas();
      var ch3 = new Chart(c3.getContext('2d'), {
        type: 'bar',
        data: { labels: ['Ziyadah', 'Murajaah'], datasets: [{ data: [zAvg, mAvg], backgroundColor: ['#0891b2', '#c9972f'] }] },
        options: { responsive: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { font: { size: 12 } } }, x: { ticks: { font: { size: 13 } } } } }
      });
      tempCharts.push(ch3);
      images.score = c3.toDataURL('image/png', 1.0);
    }

    var trendData = computeRekapTrendSeries(periodRecords, range, period);
    if (trendData.labels.length) {
      var c4 = makeCanvas();
      var ch4 = new Chart(c4.getContext('2d'), {
        type: 'bar',
        data: { labels: trendData.labels, datasets: [{ data: trendData.counts, backgroundColor: '#0f6e4f' }] },
        options: { responsive: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }, x: { ticks: { font: { size: 10 } } } } }
      });
      tempCharts.push(ch4);
      images.trend = c4.toDataURL('image/png', 1.0);
    }
  } finally {
    tempCharts.forEach(function (c) { c.destroy(); });
    document.body.removeChild(container);
  }
  return images;
}
function handleDownloadRekapPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('Library PDF gagal dimuat. Periksa koneksi internet dan coba lagi.', 'error');
    return;
  }
  generateRekapPdf().catch(function (err) {
    showToast('Gagal membuat PDF: ' + (err && err.message ? err.message : 'terjadi kesalahan.'), 'error');
  });
}
async function generateRekapPdf() {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'pt', format: 'a4' });
  var pageWidth = doc.internal.pageSize.getWidth();
  var pageHeight = doc.internal.pageSize.getHeight();
  var margin = 40;
  var y = margin;

  var range = getRekapRange(activeRekapPeriod);
  var periodRecords = appState.records.filter(function (r) { return isDateInRange(r.record_date, range.start, range.end); });
  var periodLabel = getRekapPeriodLabel(activeRekapPeriod);
  var periodTitle = activeRekapPeriod === 'weekly' ? 'Rekap Pekanan' : activeRekapPeriod === 'monthly' ? 'Rekap Bulanan' : 'Rekap Semester';

  var totalSantri = appState.students.length;
  var totalSetoran = periodRecords.length;
  var z = 0, m = 0, l = 0, t = 0, sum = 0, n = 0;
  periodRecords.forEach(function (r) {
    if (r.type === 'Ziyadah') z++; else if (r.type === 'Murajaah') m++;
    var p = parseNoteField(r.note);
    if (p.hasil === 'lancar') l++; else if (p.hasil === 'tidak_lancar') t++;
    if (typeof r.score === 'number') { sum += r.score; n++; }
  });
  var avg = n ? Math.round((sum / n) * 10) / 10 : 0;
  var rows = appState.students.map(function (s) { return computeStudentRekapRow(s, periodRecords); })
    .sort(function (a, b) { return a.student.name.localeCompare(b.student.name); });

  /* ---------- Header ---------- */
  doc.setFillColor(15, 110, 79);
  doc.roundedRect(margin, y, 32, 32, 8, 8, 'F');
  doc.setTextColor(230, 194, 101);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HT', margin + 16, y + 21, { align: 'center' });

  doc.setTextColor(20, 30, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text("HALAQOH TAHFIDZ AL-QUR'AN", margin + 42, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(90, 100, 95);
  doc.text('Rekap Perkembangan Hafalan Santri', margin + 42, y + 28);

  y += 48;
  doc.setDrawColor(225, 228, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(20, 30, 25);
  doc.text(periodTitle, margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 95);
  doc.text('Pengelola: ' + (currentProfile.name || '-') + ' (' + (currentProfile.role === 'admin' ? 'Administrator' : 'Ustadz') + ')', margin, y);
  y += 13;
  doc.text('Periode: ' + periodLabel, margin, y);
  y += 13;
  doc.text('Tanggal dibuat: ' + formatDateHuman(todayISO()), margin, y);
  y += 22;

  /* ---------- Stat cards ---------- */
  var statItems = [
    { label: 'Total Santri', value: String(totalSantri) },
    { label: 'Total Setoran', value: String(totalSetoran) },
    { label: 'Ziyadah', value: String(z) },
    { label: 'Murajaah', value: String(m) },
    { label: 'Lancar', value: String(l) },
    { label: 'Tidak Lancar', value: String(t) },
    { label: 'Rata-rata Nilai', value: String(avg) }
  ];
  var cols = 4, gap = 8;
  var boxW = (pageWidth - margin * 2 - gap * (cols - 1)) / cols;
  var boxH = 46;
  statItems.forEach(function (item, i) {
    var col = i % cols, row = Math.floor(i / cols);
    var bx = margin + col * (boxW + gap), by = y + row * (boxH + gap);
    doc.setFillColor(246, 248, 246);
    doc.roundedRect(bx, by, boxW, boxH, 7, 7, 'F');
    doc.setFontSize(8.3);
    doc.setTextColor(110, 120, 112);
    doc.text(item.label, bx + 9, by + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 110, 79);
    doc.text(item.value, bx + 9, by + 35);
    doc.setFont('helvetica', 'normal');
  });
  y += Math.ceil(statItems.length / cols) * (boxH + gap) + 14;

  if (y > pageHeight - 260) { doc.addPage(); y = margin; }

  /* ---------- Charts (2x2) ---------- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(20, 30, 25);
  doc.text('Grafik Perkembangan', margin, y);
  y += 10;

  var chartImages = await buildRekapChartImages(periodRecords, rows, range, activeRekapPeriod);
  var chartW = (pageWidth - margin * 2 - 12) / 2;
  var chartH = 118;
  var chartTitles = ['Ziyadah vs Murajaah', 'Lancar vs Tidak Lancar', 'Rata-rata Nilai (Ziyadah vs Murajaah)', 'Perkembangan Jumlah Setoran'];
  var chartKeys = ['type', 'hasil', 'score', 'trend'];
  for (var row2 = 0; row2 < 2; row2++) {
    var rowY = y + row2 * (chartH + 32);
    for (var col2 = 0; col2 < 2; col2++) {
      var idx = row2 * 2 + col2;
      var cx = margin + col2 * (chartW + 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 70, 62);
      doc.text(chartTitles[idx], cx, rowY);
      var img = chartImages[chartKeys[idx]];
      if (img) {
        doc.addImage(img, 'PNG', cx, rowY + 6, chartW, chartH);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(150, 150, 150);
        doc.text('Data tidak tersedia pada periode ini.', cx, rowY + 30);
      }
    }
  }
  y += 2 * (chartH + 32) + 6;

  if (y > pageHeight - 120) { doc.addPage(); y = margin; }

  /* ---------- Table ---------- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 25);
  doc.text('Rekap per Santri', margin, y);
  y += 18;

  var colX = { no: margin, nama: margin + 26, z: margin + 150, m: margin + 190, l: margin + 230, t: margin + 270, avg: margin + 318, status: margin + 358 };
  var hafalanX = colX.status + 55;

  function drawRekapTableHeader() {
    doc.setFillColor(15, 110, 79);
    doc.rect(margin, y - 12, pageWidth - margin * 2, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(255, 255, 255);
    doc.text('No', colX.no + 3, y);
    doc.text('Nama Santri', colX.nama, y);
    doc.text('Ziy.', colX.z, y);
    doc.text('Mur.', colX.m, y);
    doc.text('Lncr', colX.l, y);
    doc.text('TdkL', colX.t, y);
    doc.text('Avg', colX.avg, y);
    doc.text('Status', colX.status, y);
    doc.text('Hafalan Terakhir', hafalanX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
  }
  drawRekapTableHeader();

  if (!rows.length) {
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(10);
    doc.text('Tidak ada data santri pada periode ini.', margin, y);
    y += 16;
  } else {
    rows.forEach(function (row, idx) {
      if (y > pageHeight - 50) { doc.addPage(); y = margin; drawRekapTableHeader(); }
      if (idx % 2 === 0) { doc.setFillColor(247, 248, 247); doc.rect(margin, y - 10, pageWidth - margin * 2, 15, 'F'); }
      doc.setFontSize(8);
      doc.setTextColor(50, 55, 50);
      doc.text(String(idx + 1), colX.no + 3, y);
      doc.text(truncateTextPdf(doc, row.student.name, 118), colX.nama, y);
      doc.text(String(row.ziyadah), colX.z, y);
      doc.text(String(row.murajaah), colX.m, y);
      doc.text(String(row.lancar), colX.l, y);
      doc.text(String(row.tidak), colX.t, y);
      doc.text(String(row.avg), colX.avg, y);
      if (row.status === 'Wajib Murajaah') doc.setTextColor(220, 38, 38); else doc.setTextColor(22, 163, 74);
      doc.text(row.status, colX.status, y);
      doc.setTextColor(50, 55, 50);
      doc.text(truncateTextPdf(doc, row.lastHafalan, 95), hafalanX, y);
      y += 15;
    });
  }

  /* ---------- Footer ---------- */
  var pageCount = doc.internal.getNumberOfPages();
  for (var p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(225, 228, 220);
    doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(140, 145, 138);
    doc.text('Generated by Halaqoh Tahfidz', margin, pageHeight - 20);
    doc.text('Halaman ' + p + ' dari ' + pageCount, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  doc.save('Rekap_Halaqoh_' + activeRekapPeriod + '_' + todayISO() + '.pdf');
  showToast('Laporan PDF berhasil dibuat.');
}

/* =========================================================
   WIRE STATIC EVENT LISTENERS (dipanggil sekali saat init)
   ========================================================= */
function wireStaticEventListeners() {
  setupRippleDelegation();
  setupSidebarToggle();
  setupNavigation();
  setupConfirmModal();

  document.querySelectorAll('.pass-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-target');
      var input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') { input.type = 'text'; btn.classList.add('showing'); }
      else { input.type = 'password'; btn.classList.remove('showing'); }
    });
  });

  document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Santri
  document.getElementById('addSantriBtn').addEventListener('click', openStudentModalForAdd);
  document.getElementById('studentModalClose').addEventListener('click', function () { closeModal('studentModalOverlay'); });
  document.getElementById('studentModalOverlay').addEventListener('click', function (e) { if (e.target.id === 'studentModalOverlay') closeModal('studentModalOverlay'); });
  document.getElementById('studentForm').addEventListener('submit', handleStudentFormSubmit);
  document.getElementById('studentDeleteBtn').addEventListener('click', function () {
    var id = document.getElementById('studentId').value;
    if (id) handleDeleteStudent(id, true);
  });
  document.getElementById('studentQuickGroupBtn').addEventListener('click', function () { openGroupModalForAdd(true); });
  setupSantriFilters();

  // Kelompok
  document.getElementById('addKelompokBtn').addEventListener('click', function () { openGroupModalForAdd(false); });
  document.getElementById('groupModalClose').addEventListener('click', function () {
    document.getElementById('groupModalOverlay').classList.remove('stacked');
    groupQuickCreateContext = false;
    closeModal('groupModalOverlay');
  });
  document.getElementById('groupModalOverlay').addEventListener('click', function (e) {
    if (e.target.id === 'groupModalOverlay') {
      document.getElementById('groupModalOverlay').classList.remove('stacked');
      groupQuickCreateContext = false;
      closeModal('groupModalOverlay');
    }
  });
  document.getElementById('groupForm').addEventListener('submit', handleGroupFormSubmit);
  document.getElementById('groupDeleteBtn').addEventListener('click', function () {
    var id = document.getElementById('groupId').value;
    if (id) handleDeleteGroup(id, true);
  });

  // Akun Ustadz
  document.getElementById('addUstadzBtn').addEventListener('click', function () {
    if (currentProfile.role !== 'admin') { showToast('Anda tidak memiliki akses untuk ini.', 'error'); return; }
    document.getElementById('ustadzForm').reset();
    clearFieldErrors(['ustadzName', 'ustadzEmail', 'ustadzPassword']);
    document.getElementById('ustadzFormMsg').textContent = '';
    openModal('ustadzModalOverlay');
  });
  document.getElementById('ustadzModalClose').addEventListener('click', function () { closeModal('ustadzModalOverlay'); });
  document.getElementById('ustadzModalOverlay').addEventListener('click', function (e) { if (e.target.id === 'ustadzModalOverlay') closeModal('ustadzModalOverlay'); });
  document.getElementById('ustadzForm').addEventListener('submit', handleUstadzFormSubmit);

  // Setoran
  document.getElementById('addSetoranBtn').addEventListener('click', function () { openSetoranModalForAdd(); });
  document.getElementById('setoranModalClose').addEventListener('click', function () { closeModal('setoranModalOverlay'); });
  document.getElementById('setoranModalOverlay').addEventListener('click', function (e) { if (e.target.id === 'setoranModalOverlay') closeModal('setoranModalOverlay'); });
  document.getElementById('setoranForm').addEventListener('submit', handleSetoranFormSubmit);
  document.getElementById('setoranDeleteBtn').addEventListener('click', function () {
    var id = document.getElementById('setoranId').value;
    if (id) handleDeleteRecord(id, true);
  });
  document.getElementById('setoranTypeZiyadahBtn').addEventListener('click', function () { setSetoranTypeUI('Ziyadah'); });
  document.getElementById('setoranTypeMurajaahBtn').addEventListener('click', function () { setSetoranTypeUI('Murajaah'); });
  document.getElementById('setoranHasilLancarBtn').addEventListener('click', function () { setSetoranHasilUI('lancar'); });
  document.getElementById('setoranHasilTidakBtn').addEventListener('click', function () { setSetoranHasilUI('tidak_lancar'); });
  document.getElementById('setoranStudent').addEventListener('change', updateSetoranStatusHint);
  document.getElementById('setoranDate').addEventListener('change', updateSetoranStatusHint);
  document.getElementById('setoranDate').addEventListener('input', updateSetoranStatusHint);
  setupSetoranFilters();

  // Rekap
  setupRekapTabs();
  document.getElementById('downloadRekapPdfBtn').addEventListener('click', handleDownloadRekapPdf);
}

/* =========================================================
   INIT
   ========================================================= */
async function init() {
  wireStaticEventListeners();
  var ready = initSupabase();
  if (!ready) {
    hideSplash();
    showFatalConfigError();
    return;
  }
  try {
    var sessionRes = await supabaseClient.auth.getSession();
    hideSplash();
    if (sessionRes.error || !sessionRes.data || !sessionRes.data.session) {
      showAuthScreen();
      return;
    }
    currentSession = sessionRes.data.session;
    var ok = await loadCurrentProfile();
    if (!ok) {
      await supabaseClient.auth.signOut();
      showAuthScreen();
      showToast('Profil pengguna tidak ditemukan. Hubungi administrator.', 'error');
      return;
    }
    await enterApp();
  } catch (err) {
    hideSplash();
    showAuthScreen();
    showToast('Gagal memeriksa sesi: ' + supabaseErrorMessage(err), 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
