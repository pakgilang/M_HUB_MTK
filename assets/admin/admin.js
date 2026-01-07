// /assets/admin/admin.js — M_HUB Admin (role-aware) + task dropdown
(() => {
  "use strict";

  const LS = { TOKEN: "M_HUB_TOKEN", USER: "M_HUB_USER" };

  const token = localStorage.getItem(LS.TOKEN) || "";
  const user = (() => {
    try { return JSON.parse(localStorage.getItem(LS.USER) || "null"); }
    catch { return null; }
  })();

  // Logout
  document.getElementById("btnLogout")?.addEventListener("click", () => {
    localStorage.removeItem(LS.TOKEN);
    localStorage.removeItem(LS.USER);
    location.href = "/";
  });

  // Guard: must login
  if (!token || !user) {
    location.href = "/";
    return;
  }

  const role = String(user.role || "user").trim().toLowerCase();
  const isAdmin = role === "admin";
  const isSuper = role === "superadmin";

  if (!isAdmin && !isSuper) {
    toast("Akses ditolak: hanya admin/superadmin", "error");
    setTimeout(() => location.href = "/", 700);
    return;
  }

  let FIELD_MASTER = [];
  let TASK_LIST = [];

  boot().catch(err => toast(String(err?.message || err), "error"));

  async function boot() {
    setLoading(true, "Load admin data...");
    try {
      const [fmRes, taskRes] = await Promise.all([
        apiCall("admin.fieldMaster.list", {}, token),
        apiCall("admin.task.list", {}, token),
      ]);
      FIELD_MASTER = fmRes.items || [];
      TASK_LIST = taskRes.items || [];
      renderAdmin(FIELD_MASTER, TASK_LIST);
    } finally {
      setLoading(false);
    }
  }

  function renderAdmin(fieldMaster, taskList) {
    const view = document.getElementById("view");
    if (!view) return;

    const taskOptions = [
      { value: "", label: "-- pilih task --" },
      ...taskList.map(t => ({
        value: t.taskSheet,
        label: `${t.taskSheet} — ${t.title}${t.dueAt ? " (due " + t.dueAt + ")" : ""}`
      }))
    ];

    const card = el("div", { class: "bg-white rounded-2xl border border-slate-200 p-6" }, [
      el("div", { class: "flex items-start justify-between gap-4" }, [
        el("div", {}, [
          el("div", { class: "text-xl font-semibold" }, ["Create / Update Task"]),
          el("div", { class: "text-sm text-slate-600 mt-1" }, [
            "Membuat task → TASKS_REGISTRY, TASK_FIELDS, lalu auto buat kolom di sheet task."
          ]),
        ]),
        el("div", { class: "text-xs text-slate-500 text-right" }, [
          el("div", { class: "font-medium text-slate-700" }, [`Login: ${user.userId || "-"}`]),
          el("div", {}, [`Role: ${role}`]),
          el("div", {}, [`PT: ${user.pt || "-"}`]),
        ]),
      ]),

      // Existing tasks
      el("div", { class: "mt-5 grid grid-cols-1 md:grid-cols-2 gap-3" }, [
        select("existingTask", "Existing Tasks", taskOptions, ""),
        el("div", { class: "grid gap-1" }, [
          el("div", { class: "text-sm font-medium text-slate-700" }, [" "]),
          el("button", {
            type: "button",
            class: "w-full rounded-xl border border-slate-200 px-3 py-3 hover:bg-slate-50 font-semibold",
            onclick: onLoadSelectedTask,
          }, ["Load selected task"]),
        ]),
      ]),

      // Task form
      el("div", { class: "grid grid-cols-1 md:grid-cols-2 gap-3 mt-4" }, [
        input("taskSheet", "Task Sheet", "T_UPDATE_DATA_2026_01", true),
        input("title", "Title", "Update Data Karyawan", true),
        input("dueAt", "Due (YYYY-MM-DD)", "2026-01-31", false),
        input("audienceValue", "Audience Value (CSV)", "PT MUM", false),
        selectSimple("audienceType", "Audience Type", ["ALL", "PT", "UNIT", "KEL_TEAM", "USERLIST"], "ALL"),
        selectSimple("active", "Active", ["TRUE", "FALSE"], "TRUE"),
        selectSimple("allowResubmit", "Allow Resubmit", ["", "TRUE", "FALSE"], ""),
        input("desc", "Description", "Instruksi singkat…", false),
      ]),

      // Access rules info
      el("div", { class: "mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700" }, [
        el("div", { class: "font-semibold mb-1" }, ["Aturan akses:"]),
        isSuper
          ? el("div", {}, ["• Superadmin: bebas buat task untuk ALL / PT lain / dsb."])
          : el("div", {}, [`• Admin: hanya boleh buat task untuk PT sendiri (${user.pt || "-"})`]),
      ]),

      el("hr", { class: "my-6 border-slate-200" }),

      el("div", { class: "flex items-center justify-between gap-3" }, [
        el("div", { class: "text-lg font-semibold" }, ["Fields"]),
        el("div", { class: "text-xs text-slate-500" }, ["Centang field yang dipakai, order kecil tampil lebih dulu."]),
      ]),

      renderFieldPicker(fieldMaster),

      el("div", { class: "flex gap-3 mt-6" }, [
        el("button", {
          class: "flex-1 bg-slate-900 text-white rounded-xl py-3 font-semibold hover:bg-slate-800",
          onclick: onSaveTask,
          type: "button",
        }, ["Save Task + Fields + Ensure Columns"]),
      ]),
    ]);

    view.innerHTML = "";
    view.appendChild(card);

    applyAudienceLocks();
  }

  function applyAudienceLocks() {
    const atEl = document.getElementById("audienceType");
    const avEl = document.getElementById("audienceValue");
    if (!atEl || !avEl) return;

    if (isAdmin && !isSuper) {
      atEl.value = "PT";
      avEl.value = String(user.pt || "").trim();

      atEl.setAttribute("disabled", "true");
      avEl.setAttribute("readonly", "true");

      atEl.classList.add("bg-slate-100");
      avEl.classList.add("bg-slate-100");
    }
  }

  function input(id, label, placeholder, required) {
    return el("label", { class: "grid gap-1" }, [
      el("div", { class: "text-sm font-medium text-slate-700" }, [label]),
      el("input", {
        id,
        placeholder,
        class: "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300",
        required: required ? "true" : null,
      }),
    ]);
  }

  function selectSimple(id, label, options, def) {
    return select(id, label, options.map(v => ({ value: v, label: v === "" ? "Default" : v })), def);
  }

  function select(id, label, options, def) {
    const s = el("select", {
      id,
      class: "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300",
    }, []);
    options.forEach(opt => {
      const o = el("option", { value: opt.value }, [opt.label]);
      if (opt.value === def) o.selected = true;
      s.appendChild(o);
    });

    return el("label", { class: "grid gap-1" }, [
      el("div", { class: "text-sm font-medium text-slate-700" }, [label]),
      s,
    ]);
  }

  function renderFieldPicker(fieldMaster) {
    const wrap = el("div", { class: "grid gap-2 mt-4" }, []);

    fieldMaster.forEach((f) => {
      const row = el("div", { class: "flex items-center gap-3 p-3 rounded-xl border border-slate-200" }, [
        el("input", { type: "checkbox", class: "w-5 h-5", "data-fk": f.fieldKey }),
        el("div", { class: "grow" }, [
          el("div", { class: "font-medium" }, [`${f.fieldKey} — ${f.labelDefault}`]),
          el("div", { class: "text-xs text-slate-500" }, [
            `${f.type}${f.options ? " • " + f.options : ""}${f.accept ? " • accept: " + f.accept : ""}`
          ]),
        ]),
        el("input", {
          type: "number",
          min: "1",
          placeholder: "order",
          class: "w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm",
          "data-order": f.fieldKey,
        }),
        el("select", { class: "rounded-xl border border-slate-200 px-3 py-2 text-sm", "data-req": f.fieldKey }, [
          el("option", { value: "" }, ["default"]),
          el("option", { value: "TRUE" }, ["required"]),
          el("option", { value: "FALSE" }, ["optional"]),
        ]),
      ]);

      wrap.appendChild(row);
    });

    return wrap;
  }

  function val(id) {
    const elx = document.getElementById(id);
    return elx ? String(elx.value || "").trim() : "";
  }

  function setVal(id, v) {
    const elx = document.getElementById(id);
    if (elx) elx.value = v;
  }

  function onLoadSelectedTask() {
    const sel = val("existingTask");
    if (!sel) return toast("Pilih task dulu", "error");

    const t = TASK_LIST.find(x => x.taskSheet === sel);
    if (!t) return toast("Task tidak ditemukan", "error");

    setVal("taskSheet", t.taskSheet);
    setVal("title", t.title || "");
    setVal("dueAt", t.dueAt || "");
    setVal("active", t.active ? "TRUE" : "FALSE");
    setVal("audienceType", t.audienceType || "ALL");
    setVal("audienceValue", t.audienceValue || "");

    applyAudienceLocks();
    toast("Task loaded (metadata).", "success");
  }

  async function onSaveTask() {
    const taskSheet = val("taskSheet");
    const title = val("title");
    if (!taskSheet || !title) {
      toast("taskSheet dan title wajib", "error");
      return;
    }

    let audienceType = val("audienceType") || "ALL";
    let audienceValue = val("audienceValue");

    // client-side guard (server tetap enforce)
    if (isAdmin && !isSuper) {
      audienceType = "PT";
      audienceValue = String(user.pt || "").trim();
      if (!audienceValue) return toast("PT admin kosong (kolom PT di USERS)", "error");
    }

    const taskPayload = {
      taskSheet,
      title,
      desc: val("desc"),
      active: val("active"),
      dueAt: val("dueAt"),
      audienceType,
      audienceValue,
      allowResubmit: document.getElementById("allowResubmit")?.value || "",
    };

    const items = [];
    document.querySelectorAll('input[type="checkbox"][data-fk]').forEach(cb => {
      if (!cb.checked) return;
      const fk = cb.getAttribute("data-fk");
      const orderEl = document.querySelector(`[data-order="${CSS.escape(fk)}"]`);
      const reqEl = document.querySelector(`[data-req="${CSS.escape(fk)}"]`);

      items.push({
        fieldKey: fk,
        order: Number(orderEl?.value || 9999),
        requiredOverride: reqEl?.value || "",
        labelOverride: "",
        active: "TRUE",
        readonly: "FALSE",
      });
    });

    if (!items.length) return toast("Pilih minimal 1 field", "error");
    items.sort((a, b) => a.order - b.order);

    setLoading(true, "Saving task...");
    try {
      await apiCall("admin.task.upsert", taskPayload, token);
      await apiCall("admin.task.fields.set", { taskSheet, items }, token);
      await apiCall("admin.task.ensureColumns", { taskSheet }, token);
      toast("Berhasil: task dibuat/diupdate + kolom siap", "success");
    } catch (e) {
      toast(String(e?.message || e), "error");
    } finally {
      setLoading(false);
    }
  }
})();
