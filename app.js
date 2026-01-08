// app.js - FULL CODE

const LS = {
  TOKEN: "M_HUB_TOKEN",
  USER: "M_HUB_USER",
};

const state = {
  page: "login",
  token: "",
  user: null,
  tasks: [],
  current: null,
};

init();

async function init() {
  document.getElementById("appName").textContent = window.APP_CONFIG.APP_NAME || "M_HUB";
  await registerSW();

  // Button handlers existing (still used for desktop/fallback)
  const btnLogout = document.getElementById("btnLogout");
  if(btnLogout) btnLogout.addEventListener("click", logout);
  
  const btnBack = document.getElementById("btnBack");
  if(btnBack) btnBack.addEventListener("click", () => {
    if (state.page === "task") goTasks();
  });

  const token = localStorage.getItem(LS.TOKEN) || "";
  const user = safeJsonParse(localStorage.getItem(LS.USER) || "");
  if (token && user) {
    state.token = token;
    state.user = user;
    await goTasks();
  } else {
    renderLogin();
  }
}

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function setHeaderButtons() {
  const btnLogout = document.getElementById("btnLogout");
  const btnBack = document.getElementById("btnBack");
  if(btnLogout) btnLogout.classList.toggle("hidden", state.page === "login");
  if(btnBack) btnBack.classList.toggle("hidden", state.page !== "task");
}

function setView(node) {
  const view = document.getElementById("view");
  view.innerHTML = "";
  view.appendChild(node);
  setHeaderButtons();
}

function logout() {
  localStorage.removeItem(LS.TOKEN);
  localStorage.removeItem(LS.USER);
  state.token = "";
  state.user = null;
  state.tasks = [];
  state.current = null;
  toast("Logout berhasil", "success");
  renderLogin();
}

function renderLogin() {
  state.page = "login";
  const node = el("div", { class: "grid gap-4 pt-10" }, [
    el("div", { class: "bg-white rounded-2xl shadow-sm border border-slate-200 p-6" }, [
      el("div", { class: "text-2xl font-bold mb-1" }, ["Masuk M_HUB"]),
      el("div", { class: "text-slate-600 text-sm" }, ["Gunakan USERID dan PASSWORD dari HR."]),
      el("div", { class: "grid gap-3 mt-6" }, [
        labeledInput("USERID", "text", "contoh: 0004.MTK.0209", "login_userid"),
        labeledInput("PASSWORD", "password", "••••••••", "login_password"),
        el(
          "button",
          {
            class: "mt-4 w-full bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-800 shadow-lg active:scale-95 transition-transform",
            onclick: onLogin,
            type: "button",
          },
          ["Masuk"]
        ),
      ]),
    ]),
  ]);

  setView(node);
}

function labeledInput(label, type, placeholder, id) {
  return el("label", { class: "grid gap-1" }, [
    el("div", { class: "text-xs font-bold text-slate-500 uppercase tracking-wide" }, [label]),
    el("input", {
      id,
      type,
      placeholder,
      class: "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-colors",
      autocomplete: "off",
    }),
  ]);
}

async function onLogin() {
  const userId = document.getElementById("login_userid").value.trim();
  const password = document.getElementById("login_password").value.trim();
  if (!userId || !password) return toast("USERID dan PASSWORD wajib diisi", "error");

  setLoading(true, "Login...");
  try {
    const res = await apiLogin(userId, password);
    state.token = res.token;
    state.user = res.user;

    localStorage.setItem(LS.TOKEN, state.token);
    localStorage.setItem(LS.USER, JSON.stringify(state.user));

    toast(`Selamat datang, ${state.user.name || state.user.userId}`, "success");
    await goTasks();
  } catch (e) {
    toast(String(e.message || e), "error");
  } finally {
    setLoading(false);
  }
}

async function goTasks() {
  state.page = "tasks";
  setLoading(true, "Memuat task...");
  try {
    const res = await apiListTasks(state.token);
    state.tasks = res.items || [];
    renderTasks();
  } catch (e) {
    toast(String(e.message || e), "error");
    logout();
  } finally {
    setLoading(false);
  }
}

// --- NEW RENDER TASKS WITH BOTTOM NAV ---
function renderTasks() {
  const list = el("div", { class: "pb-24" }, []); 

  // Header Selamat Datang
  const u = state.user || {};
  list.appendChild(el("div", { class: "mb-6 px-1" }, [
    el("h1", { class: "text-2xl font-bold text-slate-900" }, ["Halo, " + (u.name ? u.name.split(" ")[0] : "Karyawan")]),
    el("p", { class: "text-slate-500 text-sm" }, ["Selesaikan tugasmu hari ini."])
  ]));

  if (!state.tasks.length) {
    list.appendChild(el("div", { class: "text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200" }, ["Hore! Tidak ada tugas aktif."]));
  } else {
    // Render Kartu Native
    state.tasks.forEach(t => {
      list.appendChild(cardTaskNative(t, () => openTask(t.taskSheet)));
    });
  }

  // Pasang Bottom Nav
  const nav = bottomNav("tasks", (tab) => {
    if (tab === "profile") {
      if(confirm("Logout dari aplikasi?")) logout();
    }
  });

  setView(el("div", {}, [list, nav]));
}

async function openTask(taskSheet) {
  const t = state.tasks.find(x => x.taskSheet === taskSheet);
  
  // Alert jika REJECTED
  if (t && t.status === "REJECTED") {
    toast("Status: Ditolak. Silakan perbaiki data Anda.", "error");
  }

  state.page = "task";
  setLoading(true, "Memuat form...");
  try {
    const res = await apiGetSchema(state.token, taskSheet);
    state.current = res;
    // Inject status agar bisa dibaca komponen lain jika perlu
    state.current.submissionStatus = t ? t.status : "NEW"; 
    renderTaskForm();
  } catch (e) {
    toast(String(e.message || e), "error");
  } finally {
    setLoading(false);
  }
}

function renderTaskForm() {
  const { task, fields, data, submissionStatus } = state.current;
  const isApproved = submissionStatus === "APPROVED";

  const title = el("div", { class: "mb-6" }, [
    el("div", { class: "text-xl font-bold" }, [task.title || task.taskSheet]),
    el("div", { class: "text-sm text-slate-600 mt-1" }, [task.desc || ""]),
  ]);

  const form = el("form", { class: "grid gap-5", onsubmit: (ev) => ev.preventDefault() }, []);
  
  // Jika Approved, form readonly
  const forceReadonly = isApproved;
  
  for (const f of fields) {
    // Jika forceReadonly aktif, kita manipulasi field readonly
    if (forceReadonly) f.readonly = true;
    form.appendChild(renderField(f, data));
  }

  const actions = el("div", { class: "flex items-center gap-3 pt-4 border-t border-slate-100 mt-2" }, [
    el(
      "button",
      {
        class: "flex-1 bg-slate-900 text-white rounded-xl py-3 font-bold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed",
        onclick: onSubmitTask,
        type: "button",
        disabled: isApproved ? "true" : undefined
      },
      [isApproved ? "Sudah Disetujui" : "Submit Data"]
    ),
    el(
      "button",
      {
        class: "px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold",
        onclick: () => goTasks(),
        type: "button",
      },
      ["Batal"]
    ),
  ]);

  const card = el("div", { class: "bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-20" }, [
    title,
    form,
    actions,
  ]);

  setView(card);
}

function renderField(f, prefill) {
  const key = f.fieldKey;
  const value = (prefill && typeof prefill[key] !== "undefined") ? prefill[key] : "";

  const labelLine = el("div", { class: "flex items-center justify-between gap-2" }, [
    el("div", { class: "text-sm font-bold text-slate-700" }, [f.label || key]),
    f.required ? badge("Wajib", "danger") : el("span"),
  ]);

  const help = f.helpText ? el("div", { class: "text-xs text-slate-500 mb-1" }, [f.helpText]) : null;
  const wrap = el("div", { class: "grid gap-1.5" }, [labelLine]);
  if (help) wrap.appendChild(help);

  const common = {
    "data-field-key": key,
    class: "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-colors text-sm",
  };
  if (f.readonly) {
    common.disabled = "true";
    common.class += " opacity-60 cursor-not-allowed";
  }

  if (f.type === "text" || f.type === "date" || f.type === "number") {
    const input = el("input", { ...common, type: f.type, value: value || "", placeholder: f.placeholder || "" });
    wrap.appendChild(input);
    return wrap;
  }

  if (f.type === "paragraph") {
    const ta = el("textarea", { ...common, rows: "4", placeholder: f.placeholder || "" });
    ta.value = value || "";
    wrap.appendChild(ta);
    return wrap;
  }

  if (f.type === "select") {
    const sel = el("select", { ...common }, []);
    sel.appendChild(el("option", { value: "" }, ["— pilih —"]));
    (f.options || []).forEach((opt) => {
      const o = el("option", { value: opt }, [opt]);
      if (String(value) === String(opt)) o.selected = true;
      sel.appendChild(o);
    });
    wrap.appendChild(sel);
    return wrap;
  }

  if (f.type === "radio") {
    const box = el("div", { class: "grid gap-2 mt-1" }, []);
    (f.options || []).forEach((opt) => {
      const id = `${key}__${opt}`;
      const input = el("input", { type: "radio", name: key, value: opt, id });
      if (String(value) === String(opt)) input.checked = true;
      if (f.readonly) input.disabled = true;

      box.appendChild(el("label", { class: "flex items-center gap-2 text-sm p-2 rounded-lg border border-slate-100 bg-slate-50", for: id }, [input, el("span", {}, [opt])]));
    });
    box.setAttribute("data-field-key", key);
    wrap.appendChild(box);
    return wrap;
  }

  if (f.type === "checkbox") {
    const current = String(value || "").trim();
    const selected = new Set(current ? current.split(",").map((x) => x.trim()).filter(Boolean) : []);
    const box = el("div", { class: "grid gap-2 mt-1" }, []);
    (f.options || []).forEach((opt) => {
      const id = `${key}__${opt}`;
      const input = el("input", { type: "checkbox", value: opt, id });
      if (selected.has(opt)) input.checked = true;
      if (f.readonly) input.disabled = true;

      box.appendChild(el("label", { class: "flex items-center gap-2 text-sm p-2 rounded-lg border border-slate-100 bg-slate-50", for: id }, [input, el("span", {}, [opt])]));
    });
    box.setAttribute("data-field-key", key);
    wrap.appendChild(box);
    return wrap;
  }

  if (f.type === "upload") {
    const hidden = el("input", { type: "hidden", "data-field-key": key, value: value || "" });

    const fileInput = el("input", {
      type: "file",
      class: "block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800",
      accept: f.accept || "",
      onchange: async (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        setLoading(true, "Upload file...");
        try {
          const up = await apiUploadFile(state.token, file);
          hidden.value = up.url;
          toast("Upload berhasil", "success");
          preview.textContent = "Lihat file";
          preview.href = up.url;
          preview.classList.remove("hidden");
        } catch (e) {
          toast(String(e.message || e), "error");
          ev.target.value = "";
        } finally {
          setLoading(false);
        }
      },
    });
    if (f.readonly) fileInput.disabled = true;

    const preview = el("a", {
      class: `text-xs text-blue-600 font-semibold underline break-all mt-2 inline-block ${value ? "" : "hidden"}`,
      href: value || "#",
      target: "_blank",
      rel: "noopener",
    }, ["Lihat file"]);

    wrap.appendChild(fileInput);
    wrap.appendChild(hidden);
    wrap.appendChild(preview);
    return wrap;
  }

  const input = el("input", { ...common, type: "text", value: value || "" });
  wrap.appendChild(input);
  return wrap;
}

function collectAnswers(fields) {
  const answers = {};
  for (const f of fields) {
    const key = f.fieldKey;

    if (f.type === "radio") {
      const picked = document.querySelector(`input[type="radio"][name="${CSS.escape(key)}"]:checked`);
      answers[key] = picked ? picked.value : "";
      continue;
    }

    if (f.type === "checkbox") {
      const box = document.querySelector(`[data-field-key="${CSS.escape(key)}"]`);
      const vals = [];
      if (box) box.querySelectorAll('input[type="checkbox"]').forEach((cb) => { if (cb.checked) vals.push(cb.value); });
      answers[key] = vals;
      continue;
    }

    const elx = document.querySelector(`[data-field-key="${CSS.escape(key)}"]`);
    if (elx) answers[key] = elx.value;
  }
  return answers;
}

async function onSubmitTask() {
  const { task, fields } = state.current;
  const answers = collectAnswers(fields);

  for (const f of fields) {
    if (!f.required) continue;
    const v = answers[f.fieldKey];
    const empty = v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
    if (empty) return toast(`Field wajib: ${f.label || f.fieldKey}`, "error");
  }

  setLoading(true, "Menyimpan...");
  try {
    await apiSaveMyData(state.token, task.taskSheet, answers);
    toast("Submit berhasil", "success");
    await goTasks();
  } catch (e) {
    toast(String(e.message || e), "error");
  } finally {
    setLoading(false);
  }
}
