/**
 * =====================================================================
 * ONLINE TUITION STUDENT REGISTRATION SYSTEM
 * Administrator Portal Application Logic
 * File: admin.js
 * =====================================================================
 */

(function () {
  "use strict";

  const config = window.APP_CONFIG || {};
  let supabase = null;
  let allRegistrations = [];

  const dom = {
    loginSection: document.getElementById("loginSection"),
    dashboardSection: document.getElementById("dashboardSection"),
    adminLoginForm: document.getElementById("adminLoginForm"),
    adminEmail: document.getElementById("adminEmail"),
    adminPassword: document.getElementById("adminPassword"),
    loginAlert: document.getElementById("loginAlert"),
    loginAlertMessage: document.getElementById("loginAlertMessage"),
    btnLogin: document.getElementById("btnLogin"),

    adminUserBadge: document.getElementById("adminUserBadge"),
    btnLogout: document.getElementById("btnLogout"),

    statTotalRegistrations: document.getElementById("statTotalRegistrations"),
    statTodayRegistrations: document.getElementById("statTodayRegistrations"),
    statUniqueClasses: document.getElementById("statUniqueClasses"),

    adminSearchInput: document.getElementById("adminSearchInput"),
    adminFilterClass: document.getElementById("adminFilterClass"),
    btnRefresh: document.getElementById("btnRefresh"),
    btnExportCsv: document.getElementById("btnExportCsv"),

    registrationsTableBody: document.getElementById("registrationsTableBody"),

    detailsModal: document.getElementById("detailsModal"),
    detailsModalBody: document.getElementById("detailsModalBody"),
    btnCloseDetailsModal: document.getElementById("btnCloseDetailsModal"),
    btnDismissDetailsModal: document.getElementById("btnDismissDetailsModal"),
  };

  function initSupabase() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      showLoginError("Supabase SDK is not loaded. Please check your internet connection.");
      return false;
    }

    if (
      !config.SUPABASE_URL ||
      config.SUPABASE_URL.includes("YOUR_PROJECT_REF") ||
      !config.SUPABASE_ANON_KEY ||
      config.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")
    ) {
      showLoginError("Supabase credentials not configured. Please edit config.js first.");
      return false;
    }

    supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    return true;
  }

  function showLoginError(msg) {
    dom.loginAlertMessage.textContent = msg;
    dom.loginAlert.classList.remove("hidden");
  }

  function hideLoginError() {
    dom.loginAlert.classList.add("hidden");
    dom.loginAlertMessage.textContent = "";
  }

  async function checkSession() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session) {
        showDashboard(data.session.user);
      } else {
        showLogin();
      }
    } catch (err) {
      console.error("Session check error:", err);
      showLogin();
    }
  }

  function showDashboard(user) {
    dom.loginSection.classList.add("hidden");
    dom.dashboardSection.classList.remove("hidden");
    dom.adminUserBadge.textContent = user.email || "Administrator";
    loadRegistrations();
  }

  function showLogin() {
    dom.dashboardSection.classList.add("hidden");
    dom.loginSection.classList.remove("hidden");
  }

  async function handleLogin(e) {
    e.preventDefault();
    hideLoginError();

    const email = dom.adminEmail.value.trim();
    const password = dom.adminPassword.value;

    if (!email || !password) {
      showLoginError("Please enter both email and password.");
      return;
    }

    dom.btnLogin.disabled = true;
    dom.btnLogin.textContent = "Signing In...";

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      showDashboard(data.user);
    } catch (err) {
      console.error("Login failed:", err);
      showLoginError(err.message || "Invalid login credentials. Please verify in Supabase Auth.");
    } finally {
      dom.btnLogin.disabled = false;
      dom.btnLogin.textContent = "Sign In to Admin Portal";
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out error:", err);
    }
    allRegistrations = [];
    showLogin();
  }

  async function loadRegistrations() {
    dom.registrationsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Fetching student registrations...</td></tr>`;

    try {
      const { data, error } = await supabase
        .from("student_registrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      allRegistrations = data || [];
      updateStats(allRegistrations);
      renderTable(filterRegistrations());
    } catch (err) {
      console.error("Failed to load registrations:", err);
      dom.registrationsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color: var(--color-error-600);">Failed to load registrations: ${err.message}. Make sure RLS policy allows authenticated select.</td></tr>`;
    }
  }

  function updateStats(items) {
    dom.statTotalRegistrations.textContent = items.length;

    // Today count
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = items.filter((item) => (item.created_at || "").slice(0, 10) === today).length;
    dom.statTodayRegistrations.textContent = todayCount;

    // Unique classes
    const uniqueClasses = new Set(items.map((i) => i.class_name));
    dom.statUniqueClasses.textContent = uniqueClasses.size;
  }

  function filterRegistrations() {
    const search = dom.adminSearchInput.value.toLowerCase().trim();
    const classFilter = dom.adminFilterClass.value;

    return allRegistrations.filter((item) => {
      // Class filter
      if (classFilter) {
        if (classFilter === "Other") {
          // If custom class (not Class 1-10 or First/Second Year)
          const standardClasses = [
            "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
            "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
            "First Year", "Second Year"
          ];
          if (standardClasses.includes(item.class_name)) return false;
        } else if (item.class_name !== classFilter) {
          return false;
        }
      }

      // Search query
      if (search) {
        const matchName = (item.full_name || "").toLowerCase().includes(search);
        const matchFather = (item.father_name || "").toLowerCase().includes(search);
        const matchPhone = (item.phone_number || "").toLowerCase().includes(search);
        const matchRef = (item.reference_id || "").toLowerCase().includes(search);
        return matchName || matchFather || matchPhone || matchRef;
      }

      return true;
    });
  }

  async function getSignedPhotoUrl(photoPath) {
    if (!photoPath) return null;
    try {
      const { data, error } = await supabase.storage
        .from("student-photos")
        .createSignedUrl(photoPath, 3600); // 1 hour expiration
      if (error) return null;
      return data.signedUrl;
    } catch (_e) {
      return null;
    }
  }

  async function renderTable(items) {
    if (!items || items.length === 0) {
      dom.registrationsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No student registrations found matching your criteria.</td></tr>`;
      return;
    }

    dom.registrationsTableBody.innerHTML = items
      .map(
        (reg, index) => `
        <tr data-index="${index}">
          <td>
            <img 
              id="thumb-${index}" 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23CBD5E1'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E" 
              alt="Photo" 
              class="student-photo-thumb"
            >
          </td>
          <td>
            <span class="ref-badge">${escapeHtml(reg.reference_id || "N/A")}</span>
          </td>
          <td>
            <div class="student-name-cell">${escapeHtml(reg.full_name)}</div>
            <div class="student-father-cell">S/O ${escapeHtml(reg.father_name)}</div>
          </td>
          <td class="phone-cell">
            <a href="tel:${escapeHtml(reg.phone_number)}">${escapeHtml(reg.phone_number)}</a>
            <a href="https://wa.me/${encodeURIComponent(toInternationalWhatsapp(reg.phone_number))}" target="_blank" rel="noopener" class="whatsapp-btn" title="Open WhatsApp Chat">
              WA
            </a>
          </td>
          <td>
            <span class="class-tag">${escapeHtml(reg.class_name)}</span>
          </td>
          <td style="color: var(--color-neutral-600); font-size: 0.8125rem;">
            ${formatDateTime(reg.created_at)}
          </td>
          <td>
            <button type="button" class="btn-toolbar btn-refresh view-details-btn" data-id="${reg.id}" style="padding: 4px 10px; font-size: 0.75rem; height: 32px;">
              View Details
            </button>
          </td>
        </tr>
      `
      )
      .join("");

    // Asynchronously resolve signed URLs for thumbnails
    items.forEach(async (reg, index) => {
      if (reg.photo_path) {
        const signedUrl = await getSignedPhotoUrl(reg.photo_path);
        const imgEl = document.getElementById(`thumb-${index}`);
        if (imgEl && signedUrl) {
          imgEl.src = signedUrl;
        }
      }
    });

    // Attach click listeners for View Details
    document.querySelectorAll(".view-details-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const student = allRegistrations.find((s) => s.id === id);
        if (student) showStudentModal(student);
      });
    });
  }

  async function showStudentModal(student) {
    const signedUrl = await getSignedPhotoUrl(student.photo_path);

    dom.detailsModalBody.innerHTML = `
      <div style="text-align: center;">
        <img 
          src="${signedUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23CBD5E1\'%3E%3Cpath d=\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\'/%3E%3C/svg%3E'}" 
          alt="${escapeHtml(student.full_name)}" 
          class="photo-modal-img"
        >
        <h4 style="font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-900);">${escapeHtml(student.full_name)}</h4>
        <p style="color: var(--color-neutral-500); font-size: 0.875rem;">Father: ${escapeHtml(student.father_name)}</p>
      </div>

      <div class="summary-box" style="margin-top: 16px;">
        <dl class="summary-list">
          <div class="summary-row">
            <dt>Reference ID:</dt>
            <dd><strong>${escapeHtml(student.reference_id || "N/A")}</strong></dd>
          </div>
          <div class="summary-row">
            <dt>Class / Course:</dt>
            <dd><span class="class-tag">${escapeHtml(student.class_name)}</span></dd>
          </div>
          <div class="summary-row">
            <dt>Phone Number:</dt>
            <dd>
              <a href="tel:${escapeHtml(student.phone_number)}">${escapeHtml(student.phone_number)}</a>
              <a href="https://wa.me/${encodeURIComponent(toInternationalWhatsapp(student.phone_number))}" target="_blank" rel="noopener" class="whatsapp-btn" style="margin-left: 6px;">WhatsApp</a>
            </dd>
          </div>
          <div class="summary-row">
            <dt>Registered On:</dt>
            <dd>${formatDateTime(student.created_at)}</dd>
          </div>
          <div class="summary-row">
            <dt>Photo Storage Path:</dt>
            <dd style="word-break: break-all; font-size: 0.75rem; font-family: monospace;">${escapeHtml(student.photo_path)}</dd>
          </div>
        </dl>
      </div>
    `;

    dom.detailsModal.classList.remove("hidden");
  }

  function exportToCsv() {
    if (!allRegistrations.length) {
      alert("No registrations available to export.");
      return;
    }

    const headers = ["Reference ID", "Full Name", "Father Name", "Phone Number", "Class", "Registered At", "Photo Path"];
    const rows = allRegistrations.map((reg) => [
      reg.reference_id || "",
      `"${(reg.full_name || "").replace(/"/g, '""')}"`,
      `"${(reg.father_name || "").replace(/"/g, '""')}"`,
      `"${reg.phone_number || ""}"`,
      `"${(reg.class_name || "").replace(/"/g, '""')}"`,
      `"${reg.created_at || ""}"`,
      `"${(reg.photo_path || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tuition_student_registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function toInternationalWhatsapp(phone) {
    if (!phone) return "";
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
    if (cleaned.startsWith("0")) {
      return "92" + cleaned.slice(1);
    }
    if (cleaned.startsWith("+")) {
      return cleaned.slice(1);
    }
    return cleaned;
  }

  function formatDateTime(isoString) {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleString("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (_e) {
      return isoString;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setupEvents() {
    dom.adminLoginForm.addEventListener("submit", handleLogin);
    dom.btnLogout.addEventListener("click", handleLogout);
    dom.btnRefresh.addEventListener("click", loadRegistrations);
    dom.btnExportCsv.addEventListener("click", exportToCsv);

    dom.adminSearchInput.addEventListener("input", () => {
      renderTable(filterRegistrations());
    });

    dom.adminFilterClass.addEventListener("change", () => {
      renderTable(filterRegistrations());
    });

    dom.btnCloseDetailsModal.addEventListener("click", () => {
      dom.detailsModal.classList.add("hidden");
    });
    dom.btnDismissDetailsModal.addEventListener("click", () => {
      dom.detailsModal.classList.add("hidden");
    });
  }

  function init() {
    setupEvents();
    if (initSupabase()) {
      checkSession();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
