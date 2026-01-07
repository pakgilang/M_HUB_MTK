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

  document.getElementById("btnLogout").addEventListener("click", logout);
  document.getElementById("btnBack").addEventListener("click", () => {
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
  btnLogout.classList.toggle("hidden", state.page === "login");
  btnBack.classList.toggle("hidden", state.page !== "task");
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
  const node = el("div", { class: "grid gap-4" }, [
    el("div", { class: "bg-white rounded-2xl shadow-sm border border-slate-200 p-6" }, [
      el("div", { class: "text-2xl font-semibold" }, ["Masuk"]),
      el("div", { class: "text-slate-600 mt-1" }, ["Gunakan USERID dan PASSWORD dari HR."]),
      el("div", { class: "grid gap-3 mt-5" }, [
        labeledInput("USERID", "text", "contoh: 0004.MTK.0209", "login_userid"),
        labeledInput("PASSWORD", "password", "••••••••", "login_password"),
        el(
          "button",
          {
            class:
              "mt-2 w-full bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-800",
            onclick: onLogin,
            type: "button",
          },
          ["Masuk"]
        ),
      ]),
      el("div", { class: "text-xs text-slate-500 mt-4" }, [
        "Catatan: Ini MVP internal. Token disimpan di perangkat ini."
      ]),
    ]),
  ]);

  setView(node);
}

function labeledInput(label, type, placeholder, id) {
  return el("label", { class: "grid gap-1" }, [
    el("div", { class: "text-sm font-medium text-slate-700" }, [label]),
    el("input", {
      id,
      type,
      placeholder,
      class:
        "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300",
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

function renderTasks() {
  const u = state.user || {};
  const header = el("div", { class: "mb-4" }, [
    el("div", { class: "text-xl font-semibold" }, ["Tugas Anda"]),
    el("div", { class: "text-sm text-slate-600 mt-1" }, [
      `${u.name || u.userId} • ${u.unit || "-"} • ${u.pt || "-"}`
    ]),
  ]);

  const list = el("div", { class: "grid gap-3" }, []);

  if (!state.tasks.length) {
    list.appendChild(
      el("div", { class: "bg-white rounded-2xl border border-slate-200 p-6 text-slate-600" }, [
        "Tidak ada task aktif untuk Anda saat ini."
      ])
    );
  } else {
    for (const t of state.tasks) {
      const overdue = isOverdue(t.dueAt) && !t.submitted;
      const status = t.submitted ? badge("Submitted", "success") : overdue ? badge("Overdue", "danger") : badge("Pending");
      const due = t.dueAt ? `Due: ${formatDue(t.dueAt)}` : "";

      list.appendChild(
        el(
          "button",
          {
            class:
              "text-left bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm hover:border-slate-300 transition",
            onclick: () => openTask(t.taskSheet),
            type: "button",
          },
          [
            el("div", { class: "flex items-start justify-between gap-3" }, [
              el("div", { class: "grid gap-1" }, [
                el("div", { class: "font-semibold" }, [t.title || t.taskSheet]),
                el("div", { class: "text-sm text-slate-600 line-clamp-2" }, [t.desc || ""]),
                el("div", { class: "text-xs text-slate-500 mt-1" }, [due]),
              ]),
              el("div", { class: "shrink-0" }, [status]),
            ]),
          ]
        )
      );
    }
  }

  setView(el("div", {}, [header, list]));
}

async function openTask(taskSheet) {
  state.page = "task";
  setLoading(true, "Memuat form...");
  try {
    const res = await apiGetSchema(state.token, taskSheet);
    state.current = res;
    renderTaskForm();
  } catch (e) {
    toast(String(e.message || e), "error");
  } finally {
    setLoading(false);
  }
}

function renderTaskForm() {
  const { task, fields, data } = state.current;
  const title = el("div", { class: "mb-4" }, [
    el("div", { class: "text-xl font-semibold" }, [task.title || task.taskSheet]),
    el("div", { class: "text-sm text-slate-600 mt-1" }, [task.desc || ""]),
    task.dueAt ? el("div", { class: "text-xs text-slate-500 mt-1" }, [`Due: ${task.dueAt}`]) : el("div"),
  ]);

  const form = el("form", { class: "grid gap-4", onsubmit: (ev) => ev.preventDefault() }, []);
  for (const f of fields) form.appendChild(renderField(f, data));

  const actions = el("div", { class: "flex items-center gap-3 pt-2" }, [
    el(
      "button",
      {
        class: "flex-1 bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-800",
        onclick: onSubmitTask,
        type: "button",
      },
      ["Submit"]
    ),
    el(
      "button",
      {
        class: "px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm",
        onclick: () => goTasks(),
        type: "button",
      },
      ["Batal"]
    ),
  ]);

  const card = el("div", { class: "bg-white rounded-2xl border border-slate-200 p-6" }, [
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
    el("div", { class: "text-sm font-medium text-slate-700" }, [f.label || key]),
    f.required ? badge("Wajib", "danger") : el("span"),
  ]);

  const help = f.helpText ? el("div", { class: "text-xs text-slate-500" }, [f.helpText]) : null;
  const wrap = el("div", { class: "grid gap-1" }, [labelLine]);
  if (help) wrap.appendChild(help);

  const common = {
    "data-field-key": key,
    class: "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300",
  };
  if (f.readonly) common.disabled = "true";

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

      box.appendChild(el("label", { class: "flex items-center gap-2 text-sm", for: id }, [input, el("span", {}, [opt])]));
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

      box.appendChild(el("label", { class: "flex items-center gap-2 text-sm", for: id }, [input, el("span", {}, [opt])]));
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
          preview.textContent = up.url;
          preview.href = up.url;
        } catch (e) {
          toast(String(e.message || e), "error");
          ev.target.value = "";
        } finally {
          setLoading(false);
        }
      },
    });

    const preview = el("a", {
      class: "text-xs text-slate-600 underline break-all mt-2 inline-block",
      href: value || "#",
      target: "_blank",
      rel: "noopener",
    }, [value ? value : ""]);

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
