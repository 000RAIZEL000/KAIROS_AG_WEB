const API_BASE = "http://127.0.0.1:8000";

let currentUser = null;
let tournaments = [];

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    window.scrollTo(0, 0);
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector("i");
    input.type = input.type === "password" ? "text" : "password";
    icon.className = input.type === "password" ? "bi bi-eye" : "bi bi-eye-slash";
}

function showAlert(message, type = "info") {
    const box = document.getElementById("alertBox");
    if (!box) return;

    box.innerHTML = `
    <div class="alert alert-${type} custom-alert alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function saveSession(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    currentUser = user;
    updateHeader();
}

function restoreSession() {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
        currentUser = JSON.parse(user);
        updateHeader();
        showScreen("homeScreen");
        loadTournaments();
    }
}

function updateHeader() {
    if (!currentUser) return;
    document.getElementById("userName").textContent = currentUser.nombre || currentUser.email || "Usuario";
    document.getElementById("roleBadge").textContent = (currentUser.role || "user").toUpperCase();
}

function logout() {
    localStorage.clear();
    currentUser = null;
    tournaments = [];
    showScreen("landingScreen");
}

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || data.message || "Error en la solicitud");
    }

    return data;
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
        const res = await apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });

        const token = res.access_token || res.token;
        const user = res.user || { email, nombre: email.split("@")[0], role: "user" };

        saveSession(token, user);
        showScreen("homeScreen");
        showAlert("Sesión iniciada correctamente.", "success");
        loadTournaments();
    } catch (error) {
        alert(error.message || "No se pudo iniciar sesión.");
    }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        nombre: document.getElementById("registerNombre").value.trim(),
        email: document.getElementById("registerEmail").value.trim().toLowerCase(),
        telefono: document.getElementById("registerTelefono").value.trim() || null,
        password: document.getElementById("registerPassword").value.trim()
    };

    try {
        const res = await apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        saveSession(res.access_token, res.user);
        showScreen("homeScreen");
        showAlert("Cuenta creada correctamente.", "success");
        loadTournaments();
    } catch (error) {
        alert(error.message || "No se pudo registrar.");
    }
});

document.getElementById("forgotForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value.trim().toLowerCase();

    try {
        const res = await apiRequest("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email })
        });

        alert(res.message || "Se enviaron las instrucciones al correo.");
        showScreen("loginScreen");
    } catch (error) {
        alert(error.message || "No se pudo procesar la solicitud.");
    }
});

document.getElementById("tournamentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        nombre: document.getElementById("torneoNombre").value.trim(),
        deporte: document.getElementById("torneoDeporte").value.trim(),
        modalidad: document.getElementById("torneoModalidad").value.trim(),
        estado: document.getElementById("torneoEstado").value,
        fecha_inicio: document.getElementById("torneoInicio").value || null,
        fecha_fin: document.getElementById("torneoFin").value || null,
        direccion: document.getElementById("torneoDireccion").value.trim() || null,
        descripcion: document.getElementById("torneoDescripcion").value.trim() || null
    };

    try {
        await apiRequest("/torneos/", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        const modal = bootstrap.Modal.getInstance(document.getElementById("tournamentModal"));
        modal.hide();
        document.getElementById("tournamentForm").reset();
        showAlert("Campeonato creado correctamente.", "success");
        loadTournaments();
    } catch (error) {
        showAlert(error.message || "No se pudo crear el campeonato.", "danger");
    }
});

async function loadTournaments() {
    try {
        const data = await apiRequest("/torneos/");
        tournaments = Array.isArray(data) ? data : [];
    } catch (error) {
        tournaments = sampleTournaments();
        showAlert("No se pudo conectar con la API. Se muestran datos de ejemplo.", "warning");
    }

    renderTournaments();
}

function getStatusClass(status) {
    const value = (status || "").toLowerCase();
    if (value === "activo") return "status-activo";
    if (value === "pendiente") return "status-pendiente";
    if (value === "finalizado") return "status-finalizado";
    return "";
}

function renderTournaments() {
    const list = document.getElementById("tournamentList");
    const empty = document.getElementById("emptyState");

    list.innerHTML = "";

    document.getElementById("totalCount").textContent = tournaments.length;
    document.getElementById("sportsCount").textContent = new Set(tournaments.map(t => t.deporte)).size;

    if (!tournaments.length) {
        empty.classList.remove("d-none");
        return;
    }

    empty.classList.add("d-none");

    tournaments.forEach(item => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-xl-4";

        col.innerHTML = `
      <div class="tournament-card">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h5 class="fw-bold mb-1">${item.nombre}</h5>
            <span class="chip ${getStatusClass(item.estado)}">${item.estado || "Activo"}</span>
          </div>
          <div class="text-info fs-4"><i class="bi bi-trophy"></i></div>
        </div>

        <div class="d-flex flex-wrap gap-2 mb-3">
          <span class="chip"><i class="bi bi-dribbble"></i>${item.deporte || "Sin deporte"}</span>
          <span class="chip"><i class="bi bi-people"></i>${item.modalidad || "General"}</span>
        </div>

        <p class="muted mb-3">${item.descripcion || "Sin descripción disponible."}</p>

        <div class="small muted mb-3">
          ${item.direccion ? `<div><i class="bi bi-geo-alt me-1"></i>${item.direccion}</div>` : ""}
          ${item.fecha_inicio ? `<div><i class="bi bi-calendar-event me-1"></i>Inicio: ${item.fecha_inicio}</div>` : ""}
        </div>

        <div class="d-flex gap-2">
          <button class="btn btn-outline-info btn-sm flex-fill">Ver detalle</button>
        </div>
      </div>
    `;

        list.appendChild(col);
    });
}

function sampleTournaments() {
    return [
        {
            id: 1,
            nombre: "Copa Kairos 2026",
            deporte: "Fútbol",
            modalidad: "Mixto",
            descripcion: "Torneo principal con fase de grupos y eliminación directa.",
            direccion: "Bogotá, Coliseo Central",
            fecha_inicio: "2026-05-10",
            estado: "Activo"
        },
        {
            id: 2,
            nombre: "Liga Urbana",
            deporte: "Baloncesto",
            modalidad: "Masculino",
            descripcion: "Competencia distrital para clubes locales.",
            direccion: "Medellín, Unidad Deportiva",
            fecha_inicio: "2026-06-01",
            estado: "Pendiente"
        },
        {
            id: 3,
            nombre: "Festival Deportivo",
            deporte: "Voleibol",
            modalidad: "Femenino",
            descripcion: "Evento multideportivo con enfoque juvenil.",
            direccion: "Cali, Polideportivo Sur",
            fecha_inicio: "2026-04-18",
            estado: "Finalizado"
        }
    ];
}

restoreSession();