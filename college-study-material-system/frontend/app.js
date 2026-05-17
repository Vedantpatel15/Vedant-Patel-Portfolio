const state = {
  session: null,
  departments: [],
  faculty: [],
  students: [],
  materials: [],
  dashboard: null,
  activeView: "dashboard"
};

const STATIC_MODE = window.location.hostname.endsWith("github.io");
const STATIC_DB_KEY = "svit-study-material-demo-db";

const elements = {
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  roleInput: document.querySelector("#roleInput"),
  logoutButton: document.querySelector("#logoutButton"),
  sessionChip: document.querySelector("#sessionChip"),
  navTabs: document.querySelector("#navTabs"),
  manageNavButton: document.querySelector("#manageNavButton"),
  toast: document.querySelector("#toast"),
  statsGrid: document.querySelector("#statsGrid"),
  departmentSummary: document.querySelector("#departmentSummary"),
  recentMaterials: document.querySelector("#recentMaterials"),
  searchInput: document.querySelector("#searchInput"),
  departmentFilter: document.querySelector("#departmentFilter"),
  semesterFilter: document.querySelector("#semesterFilter"),
  materialsGrid: document.querySelector("#materialsGrid"),
  departmentRows: document.querySelector("#departmentRows"),
  facultyRows: document.querySelector("#facultyRows"),
  studentRows: document.querySelector("#studentRows"),
  materialForm: document.querySelector("#materialForm"),
  departmentInput: document.querySelector("#departmentInput")
};

function hashText(value) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)))
    .then(buffer => Array.from(new Uint8Array(buffer))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join(""));
}

function readStaticDb() {
  const cached = localStorage.getItem(STATIC_DB_KEY);
  if (cached) {
    return Promise.resolve(JSON.parse(cached));
  }
  return fetch("../data/db.json")
    .then(response => response.json())
    .then(db => {
      localStorage.setItem(STATIC_DB_KEY, JSON.stringify(db));
      return db;
    });
}

function writeStaticDb(db) {
  localStorage.setItem(STATIC_DB_KEY, JSON.stringify(db));
}

function nextStaticId(items, prefix, key) {
  const max = items.reduce((highest, item) => {
    const numeric = Number(String(item[key] || "").replace(prefix, ""));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function publicStaticUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function buildDashboard(db) {
  return {
    totals: {
      materials: db.materials.length,
      students: db.students.length,
      faculty: db.faculty.length,
      departments: db.departments.length
    },
    byDepartment: db.departments.map(dept => ({
      dept_id: dept.dept_id,
      dept_name: dept.dept_name,
      materials: db.materials.filter(material => material.dept_id === dept.dept_id).length,
      students: db.students.filter(student => student.dept_id === dept.dept_id).length,
      faculty: db.faculty.filter(member => member.dept_id === dept.dept_id).length
    })),
    recentMaterials: db.materials
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(material => enrichStaticMaterial(db, material))
  };
}

function enrichStaticMaterial(db, material) {
  const dept = db.departments.find(item => item.dept_id === material.dept_id);
  const faculty = db.faculty.find(item => item.faculty_id === material.uploaded_by);
  return {
    ...material,
    dept_name: dept?.dept_name || material.dept_id,
    uploaded_by_name: faculty?.name || material.uploaded_by
  };
}

function filterStaticMaterials(db, query = "") {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const deptId = params.get("deptId");
  const semester = params.get("semester");
  const q = (params.get("q") || "").trim().toLowerCase();

  return db.materials
    .filter(material => !deptId || material.dept_id === deptId)
    .filter(material => !semester || material.semester === semester)
    .filter(material => {
      if (!q) return true;
      return [material.title, material.subject, material.file_name, material.dept_id]
        .some(value => String(value).toLowerCase().includes(q));
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(material => enrichStaticMaterial(db, material));
}

const staticApi = {
  async get(path) {
    const db = await readStaticDb();
    const [route, query = ""] = path.split("?");
    if (route === "/api/departments") return db.departments;
    if (route === "/api/faculty") {
      return db.faculty.map(member => ({
        ...member,
        dept_name: db.departments.find(dept => dept.dept_id === member.dept_id)?.dept_name || member.dept_id
      }));
    }
    if (route === "/api/students") {
      return db.students.map(student => ({
        ...student,
        dept_name: db.departments.find(dept => dept.dept_id === student.dept_id)?.dept_name || student.dept_id
      }));
    }
    if (route === "/api/dashboard") return buildDashboard(db);
    if (route === "/api/materials") return filterStaticMaterials(db, query);
    throw new Error("Static route not found");
  },
  async post(path, body) {
    const db = await readStaticDb();
    if (path === "/api/login") {
      const passwordHash = await hashText(body.password || "");
      const user = db.users.find(item =>
        item.email.toLowerCase() === String(body.email || "").trim().toLowerCase() &&
        item.role === String(body.role || "").trim().toUpperCase() &&
        item.password_hash === passwordHash
      );
      if (!user) throw new Error("Invalid email, password, or role");
      return { user: publicStaticUser(user) };
    }

    if (path === "/api/materials") {
      const material = {
        mat_id: nextStaticId(db.materials, "MAT", "mat_id"),
        title: String(body.title || "").trim(),
        subject: String(body.subject || "").trim(),
        file_name: String(body.file_name || "").trim(),
        file_content_type: String(body.file_content_type || "").trim().toUpperCase(),
        file_url: String(body.file_url || "").trim(),
        dept_id: String(body.dept_id || "").trim(),
        semester: String(body.semester || "").padStart(2, "0"),
        uploaded_by: String(body.uploaded_by || "").trim(),
        created_at: new Date().toISOString()
      };
      db.materials.push(material);
      writeStaticDb(db);
      return enrichStaticMaterial(db, material);
    }
    throw new Error("Static route not found");
  },
  async del(path) {
    const db = await readStaticDb();
    const match = path.match(/^\/api\/materials\/([^/]+)$/);
    if (!match) throw new Error("Static route not found");
    db.materials = db.materials.filter(material => material.mat_id !== decodeURIComponent(match[1]));
    writeStaticDb(db);
    return { ok: true };
  }
};

const api = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Request failed");
    }
    return payload;
  },
  get(path) {
    return this.request(path);
  },
  post(path, body) {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },
  del(path) {
    return this.request(path, { method: "DELETE" });
  }
};

const dataApi = STATIC_MODE ? staticApi : api;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("is-hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.add("is-hidden");
  }, 3200);
}

function viewId(name) {
  return `${name}View`;
}

function setActiveView(name) {
  state.activeView = name;
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("is-active", view.id === viewId(name));
  });
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.classList.toggle("is-active", tab.dataset.view === name);
  });
}

function departmentName(deptId) {
  return state.departments.find(dept => dept.dept_id === deptId)?.dept_name || deptId;
}

function isFaculty() {
  return state.session?.role === "FACULTY";
}

function renderSelects() {
  const selectedDepartment = elements.departmentFilter.value;
  const selectedInputDepartment = elements.departmentInput.value || state.session?.dept_id || "";
  const filterOptions = [
    '<option value="">All departments</option>',
    ...state.departments.map(dept => `<option value="${escapeHtml(dept.dept_id)}">${escapeHtml(dept.dept_name)}</option>`)
  ];
  elements.departmentFilter.innerHTML = filterOptions.join("");
  elements.departmentFilter.value = selectedDepartment;

  elements.departmentInput.innerHTML = state.departments
    .map(dept => `<option value="${escapeHtml(dept.dept_id)}">${escapeHtml(dept.dept_name)}</option>`)
    .join("");
  elements.departmentInput.value = selectedInputDepartment;
}

function renderDashboard() {
  if (!state.dashboard) return;
  const totals = state.dashboard.totals;
  const cards = [
    ["Materials", totals.materials],
    ["Students", totals.students],
    ["Faculty", totals.faculty],
    ["Departments", totals.departments]
  ];

  elements.statsGrid.innerHTML = cards
    .map(([label, value]) => `
      <article class="stat-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `)
    .join("");

  elements.departmentSummary.innerHTML = state.dashboard.byDepartment
    .map(item => `
      <article class="summary-item">
        <div>
          <strong>${escapeHtml(item.dept_name)}</strong>
          <span class="summary-metrics">${item.students} students, ${item.faculty} faculty</span>
        </div>
        <span class="type-chip">${item.materials} materials</span>
      </article>
    `)
    .join("");

  elements.recentMaterials.innerHTML = state.dashboard.recentMaterials
    .map(material => `
      <article class="compact-item">
        <strong>${escapeHtml(material.title)}</strong>
        <span class="meta">${escapeHtml(material.subject)} - ${escapeHtml(material.dept_id)} - Sem ${escapeHtml(material.semester)}</span>
      </article>
    `)
    .join("");
}

function materialCard(material) {
  const safeUrl = escapeHtml(material.file_url);
  const deleteButton = isFaculty()
    ? `<button class="button button-danger" type="button" data-delete-material="${escapeHtml(material.mat_id)}">Delete</button>`
    : "";

  return `
    <article class="material-card">
      <div class="material-top">
        <span class="type-chip">${escapeHtml(material.file_content_type)}</span>
        <span class="meta">${escapeHtml(material.mat_id)}</span>
      </div>
      <div>
        <h3>${escapeHtml(material.title)}</h3>
        <span class="meta">${escapeHtml(material.subject)}</span>
      </div>
      <div class="meta">
        ${escapeHtml(material.dept_name)} - Semester ${escapeHtml(material.semester)}
      </div>
      <div class="meta">
        Uploaded by ${escapeHtml(material.uploaded_by_name)}
      </div>
      <div class="material-actions">
        <a class="button button-secondary" href="${safeUrl}" target="_blank" rel="noopener">Open file</a>
        ${deleteButton}
      </div>
    </article>
  `;
}

function renderMaterials() {
  if (!state.materials.length) {
    elements.materialsGrid.innerHTML = '<div class="empty-state">No materials match the current filters.</div>';
    return;
  }

  elements.materialsGrid.innerHTML = state.materials.map(materialCard).join("");
}

function renderMasters() {
  elements.departmentRows.innerHTML = state.departments
    .map(dept => `
      <tr>
        <td>${escapeHtml(dept.dept_id)}</td>
        <td>${escapeHtml(dept.dept_name)}</td>
        <td>${escapeHtml(dept.dept_code)}</td>
      </tr>
    `)
    .join("");

  elements.facultyRows.innerHTML = state.faculty
    .map(member => `
      <tr>
        <td>${escapeHtml(member.faculty_id)}</td>
        <td>${escapeHtml(member.name)}</td>
        <td>${escapeHtml(member.dept_name)}</td>
        <td>${escapeHtml(member.designation)}</td>
      </tr>
    `)
    .join("");

  elements.studentRows.innerHTML = state.students
    .map(student => `
      <tr>
        <td>${escapeHtml(student.student_id)}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.enrollment_no)}</td>
        <td>${escapeHtml(student.dept_name)}</td>
        <td>${escapeHtml(student.semester)}</td>
      </tr>
    `)
    .join("");
}

function renderSession() {
  if (!state.session) {
    elements.sessionChip.textContent = "Not signed in";
    elements.sessionChip.classList.add("is-muted");
    elements.logoutButton.classList.add("is-hidden");
    elements.navTabs.classList.add("is-hidden");
    elements.loginForm.classList.remove("is-hidden");
    return;
  }

  elements.sessionChip.textContent = `${state.session.name} - ${state.session.role}`;
  elements.sessionChip.classList.remove("is-muted");
  elements.logoutButton.classList.remove("is-hidden");
  elements.navTabs.classList.remove("is-hidden");
  elements.loginForm.classList.add("is-hidden");
  elements.manageNavButton.classList.toggle("is-hidden", !isFaculty());
}

function renderAll() {
  renderSession();
  renderSelects();
  renderDashboard();
  renderMaterials();
  renderMasters();
}

async function loadBaseData() {
  const [departments, faculty, students, dashboard] = await Promise.all([
    dataApi.get("/api/departments"),
    dataApi.get("/api/faculty"),
    dataApi.get("/api/students"),
    dataApi.get("/api/dashboard")
  ]);
  state.departments = departments;
  state.faculty = faculty;
  state.students = students;
  state.dashboard = dashboard;
  renderAll();
}

function materialQuery() {
  const params = new URLSearchParams();
  const q = elements.searchInput.value.trim();
  const deptId = elements.departmentFilter.value;
  const semester = elements.semesterFilter.value;

  if (q) params.set("q", q);
  if (deptId) params.set("deptId", deptId);
  if (semester) params.set("semester", semester);
  return params.toString();
}

async function loadMaterials() {
  const query = materialQuery();
  state.materials = await dataApi.get(`/api/materials${query ? `?${query}` : ""}`);
  renderMaterials();
}

function applyRoleDefaults() {
  if (!state.session) return;
  if (state.session.dept_id) {
    elements.departmentFilter.value = state.session.dept_id;
    elements.departmentInput.value = state.session.dept_id;
  }
  if (state.session.role === "STUDENT" && state.session.semester) {
    elements.semesterFilter.value = state.session.semester;
  }
}

async function refreshAfterMutation() {
  const [dashboard, materials] = await Promise.all([
    dataApi.get("/api/dashboard"),
    dataApi.get(`/api/materials${materialQuery() ? `?${materialQuery()}` : ""}`)
  ]);
  state.dashboard = dashboard;
  state.materials = materials;
  renderAll();
}

elements.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const payload = {
    email: elements.emailInput.value,
    password: elements.passwordInput.value,
    role: elements.roleInput.value
  };

  try {
    const result = await dataApi.post("/api/login", payload);
    state.session = result.user;
    applyRoleDefaults();
    await loadMaterials();
    renderAll();
    setActiveView("dashboard");
    showToast("Signed in successfully");
  } catch (error) {
    showToast(error.message);
  }
});

elements.logoutButton.addEventListener("click", () => {
  state.session = null;
  elements.passwordInput.value = "";
  elements.searchInput.value = "";
  elements.departmentFilter.value = "";
  elements.semesterFilter.value = "";
  setActiveView("dashboard");
  renderAll();
});

elements.navTabs.addEventListener("click", event => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  if (button.dataset.view === "manage" && !isFaculty()) return;
  setActiveView(button.dataset.view);
});

[elements.searchInput, elements.departmentFilter, elements.semesterFilter].forEach(control => {
  control.addEventListener("input", () => {
    loadMaterials().catch(error => showToast(error.message));
  });
});

elements.materialForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!isFaculty()) {
    showToast("Faculty role is required");
    return;
  }

  const formData = new FormData(elements.materialForm);
  const payload = Object.fromEntries(formData.entries());
  payload.uploaded_by = state.session.user_id;

  try {
    await dataApi.post("/api/materials", payload);
    elements.materialForm.reset();
    elements.departmentInput.value = state.session.dept_id || state.departments[0]?.dept_id || "";
    await refreshAfterMutation();
    setActiveView("materials");
    showToast("Material saved");
  } catch (error) {
    showToast(error.message);
  }
});

elements.materialsGrid.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete-material]");
  if (!button) return;

  const materialId = button.dataset.deleteMaterial;
  try {
    await dataApi.del(`/api/materials/${encodeURIComponent(materialId)}`);
    await refreshAfterMutation();
    showToast("Material deleted");
  } catch (error) {
    showToast(error.message);
  }
});

async function init() {
  await loadBaseData();
  await loadMaterials();
  renderAll();
}

init().catch(error => {
  showToast(error.message);
});
