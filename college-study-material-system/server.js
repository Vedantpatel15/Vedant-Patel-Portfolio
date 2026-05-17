const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const FRONTEND_DIR = path.join(ROOT, "frontend");
const DB_PATH = path.join(ROOT, "data", "db.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function publicUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function nextId(items, prefix, key) {
  const max = items.reduce((highest, item) => {
    const numeric = Number(String(item[key] || "").replace(prefix, ""));
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function getDepartmentName(db, deptId) {
  return db.departments.find(dept => dept.dept_id === deptId)?.dept_name || deptId;
}

function enrichMaterial(db, material) {
  const faculty = db.faculty.find(item => item.faculty_id === material.uploaded_by);
  return {
    ...material,
    dept_name: getDepartmentName(db, material.dept_id),
    uploaded_by_name: faculty?.name || material.uploaded_by
  };
}

function filterMaterials(db, params) {
  const deptId = params.get("deptId");
  const semester = params.get("semester");
  const subject = params.get("subject");
  const q = (params.get("q") || "").trim().toLowerCase();

  return db.materials
    .filter(material => !deptId || material.dept_id === deptId)
    .filter(material => !semester || material.semester === semester)
    .filter(material => !subject || material.subject === subject)
    .filter(material => {
      if (!q) return true;
      return [material.title, material.subject, material.file_name, material.dept_id]
        .some(value => String(value).toLowerCase().includes(q));
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(material => enrichMaterial(db, material));
}

function dashboard(db) {
  const byDepartment = db.departments.map(dept => ({
    dept_id: dept.dept_id,
    dept_name: dept.dept_name,
    materials: db.materials.filter(material => material.dept_id === dept.dept_id).length,
    students: db.students.filter(student => student.dept_id === dept.dept_id).length,
    faculty: db.faculty.filter(member => member.dept_id === dept.dept_id).length
  }));

  const recentMaterials = db.materials
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map(material => enrichMaterial(db, material));

  return {
    totals: {
      materials: db.materials.length,
      students: db.students.length,
      faculty: db.faculty.length,
      departments: db.departments.length
    },
    byDepartment,
    recentMaterials
  };
}

async function handleApi(req, res, url) {
  const db = readDb();
  const pathname = url.pathname;

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "College Study Material Management System" });
    return;
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "").trim().toUpperCase();
    const passwordHash = hashPassword(body.password || "");
    const user = db.users.find(item =>
      item.email.toLowerCase() === email &&
      item.role === role &&
      item.password_hash === passwordHash
    );

    if (!user) {
      sendError(res, 401, "Invalid email, password, or role");
      return;
    }

    user.last_login = new Date().toISOString();
    writeDb(db);
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/dashboard") {
    sendJson(res, 200, dashboard(db));
    return;
  }

  if (req.method === "GET" && pathname === "/api/departments") {
    sendJson(res, 200, db.departments);
    return;
  }

  if (req.method === "GET" && pathname === "/api/faculty") {
    sendJson(res, 200, db.faculty.map(member => ({
      ...member,
      dept_name: getDepartmentName(db, member.dept_id)
    })));
    return;
  }

  if (req.method === "GET" && pathname === "/api/students") {
    sendJson(res, 200, db.students.map(student => ({
      ...student,
      dept_name: getDepartmentName(db, student.dept_id)
    })));
    return;
  }

  if (req.method === "GET" && pathname === "/api/materials") {
    sendJson(res, 200, filterMaterials(db, url.searchParams));
    return;
  }

  if (req.method === "POST" && pathname === "/api/materials") {
    const body = await readBody(req);
    const required = ["title", "subject", "file_name", "file_content_type", "file_url", "dept_id", "semester", "uploaded_by"];
    const missing = required.filter(key => !String(body[key] || "").trim());
    if (missing.length) {
      sendError(res, 400, `Missing required field(s): ${missing.join(", ")}`);
      return;
    }

    const material = {
      mat_id: nextId(db.materials, "MAT", "mat_id"),
      title: String(body.title).trim(),
      subject: String(body.subject).trim(),
      file_name: String(body.file_name).trim(),
      file_content_type: String(body.file_content_type).trim().toUpperCase(),
      file_url: String(body.file_url).trim(),
      dept_id: String(body.dept_id).trim(),
      semester: String(body.semester).padStart(2, "0"),
      uploaded_by: String(body.uploaded_by).trim(),
      created_at: new Date().toISOString()
    };

    db.materials.push(material);
    writeDb(db);
    sendJson(res, 201, enrichMaterial(db, material));
    return;
  }

  const materialMatch = pathname.match(/^\/api\/materials\/([^/]+)$/);
  if (materialMatch && req.method === "PUT") {
    const body = await readBody(req);
    const material = db.materials.find(item => item.mat_id === materialMatch[1]);
    if (!material) {
      sendError(res, 404, "Material not found");
      return;
    }

    ["title", "subject", "file_name", "file_content_type", "file_url", "dept_id", "semester"].forEach(key => {
      if (body[key] !== undefined) {
        material[key] = key === "file_content_type"
          ? String(body[key]).trim().toUpperCase()
          : String(body[key]).trim();
      }
    });
    material.updated_at = new Date().toISOString();
    writeDb(db);
    sendJson(res, 200, enrichMaterial(db, material));
    return;
  }

  if (materialMatch && req.method === "DELETE") {
    const before = db.materials.length;
    db.materials = db.materials.filter(item => item.mat_id !== materialMatch[1]);
    if (db.materials.length === before) {
      sendError(res, 404, "Material not found");
      return;
    }
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendError(res, 404, "API route not found");
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(FRONTEND_DIR, requestedPath));

  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    serveStatic(req, res, url);
  } catch (error) {
    sendError(res, 500, error.message || "Unexpected server error");
  }
});

server.listen(PORT, () => {
  console.log(`College Study Material Management System running at http://localhost:${PORT}`);
});
