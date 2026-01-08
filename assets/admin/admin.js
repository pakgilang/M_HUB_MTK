// /assets/admin/admin.js - FULL CODE

(() => {
  "use strict";

  const LS = { TOKEN: "M_HUB_TOKEN", USER: "M_HUB_USER" };

  const token = AdminState.loadToken();
  const user = AdminState.loadUser();

  // Guards
  if (!token || !user) {
    location.href = "/";
    return;
  }
  AdminState.store.token = token;
  AdminState.store.user = user;

  if (!AdminState.canAccessAdmin()) {
    toast("Akses ditolak: hanya admin/superadmin", "error");
    setTimeout(() => location.href = "/", 700);
    return;
  }

  // Wire logout buttons
  ["btnLogout", "btnLogout2", "btnLogout3"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", () => {
      localStorage.removeItem(LS.TOKEN);
      localStorage.removeItem(LS.USER);
      location.href = "/";
    });
  });

  // Top user
  const topUser = document.getElementById("topUser");
  if (topUser) topUser.textContent = `${user.userId || "-"} • ${user.role || "user"} • ${user.pt || "-"}`;

  // Sidebar user card
  document.getElementById("userName") && (document.getElementById("userName").textContent = user.name || user.userId || "-");
  document.getElementById("userMeta") && (document.getElementById("userMeta").textContent = `${user.role || "user"} • ${user.pt || "-"}`);

  // Sidebar controls
  const taskSearch = document.getElementById("taskSearch");
  const onlyActive = document.getElementById("onlyActive");
  taskSearch?.addEventListener("input", (e) => {
    AdminState.set({ taskSearch: String(e.target.value || "") });
  });
  onlyActive?.addEventListener("change", (e) => {
    AdminState.set({ onlyActive: !!e.target.checked });
  });

  // React to hash changes
  window.addEventListener("hashchange", onRoute);

  // Render loop
  AdminState.subscribe(render);

  // Boot
  boot().catch(err => toast(String(err?.message || err), "error"));

  async function boot() {
    setLoading(true, "Loading admin dashboard...");
    try {
      const [fmRes, taskRes] = await Promise.all([
        AdminAPI.adminFieldMasterList(),
        AdminAPI.adminTaskList(),
      ]);

      AdminState.set({
        fieldMaster: fmRes.items || [],
        tasks: taskRes.items || [],
      });

      // route select if any
      onRoute();

      // default route
      if (!location.hash) AdminState.go({ name: "tasks" });
    } finally {
      setLoading(false);
    }
  }

  function onRoute() {
    const r = AdminState.parseRoute();
    if (r.name === "tasks") {
      AdminState.set({ selectedTaskSheet: "", activeTab: "overview" });
      return;
    }
    if (r.name === "task") {
      AdminState.selectTask(r.taskSheet);
      AdminState.setTab(r.tab || "overview");

      // try load task fields mapping (optional API, if not available we stay empty)
      if ((r.tab || "overview") === "fields") {
        tryLoadTaskFields(r.taskSheet);
      }
    }
  }

  async function tryLoadTaskFields(taskSheet) {
    setLoading(true, "Loading task fields...");
    try {
      const res = await AdminAPI.adminTaskFieldsGet(taskSheet);
      // expected: { ok:true, items:[...] }
      const items = (res.items || []).map((x, i) => ({
        fieldKey: String(x.fieldKey || "").trim(),
        order: Number(x.order || (i + 1)),
        requiredOverride: (x.requiredOverride === "" || typeof x.requiredOverride === "undefined") ? "" : String(x.requiredOverride),
        labelOverride: String(x.labelOverride || ""),
        active: String(x.active || "TRUE"),
        readonly: String(x.readonly || "FALSE"),
      })).filter(x => x.fieldKey);

      AdminState.patchBuilder({ items, selectedFieldKey: items[0]?.fieldKey || "" });
    } catch (e) {
      toast("Info: admin.task.fields.get belum tersedia/kosong.", "info");
      AdminState.patchBuilder({ items: [], selectedFieldKey: "" });
    } finally {
      setLoading(false);
    }
  }

  function render(s) {
    renderSidebar(s);
    renderMain(s);
  }

  function renderSidebar(s) {
    const listEl = document.getElementById("taskList");
    if (!listEl) return;

    const q = String(s.taskSearch || "").trim().toLowerCase();
    const only = !!s.onlyActive;

    const filtered = (s.tasks || []).filter(t => {
      if (only && !t.active) return false;
      if (!q) return true;
      const hay = `${t.taskSheet} ${t.title} ${t.audienceType} ${t.audienceValue}`.toLowerCase();
      return hay.includes(q);
    });

    listEl.innerHTML = "";
    filtered.forEach(t => {
      listEl.appendChild(AdminComponents.taskListItem(t, s.selectedTaskSheet === t.taskSheet, (task) => {
        AdminState.go({ name: "task", taskSheet: task.taskSheet, tab: "overview" });
      }));
    });

    if (!filtered.length) {
      listEl.appendChild(el("div", { class: "px-3 py-10 text-center text-sm text-slate-500" }, ["No tasks found."]));
    }
  }

  function renderMain(s) {
    const root = document.getElementById("adminRoot");
    if (!root) return;
    root.innerHTML = "";

    // route: tasks list
    if (!s.selectedTaskSheet) {
      const header = AdminComponents.headerBar({
        title: "Tasks",
        subtitle: "Browse, open, and manage HR tasks in one place.",
        right: el("div", { class: "flex gap-2" }, [
          el("button", {
            class: "px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm",
            onclick: () => createNewTaskFlow(),
            type: "button",
          }, ["New Task"]),
        ]),
      });

      const table = AdminComponents.tableTasks(s.tasks || [], (t) => {
        AdminState.go({ name: "task", taskSheet: t.taskSheet, tab: "overview" });
      });

      root.appendChild(header);
      root.appendChild(el("div", { class: "h-4" }, []));
      root.appendChild(table);
      return;
    }

    // route: task detail
    const t = (s.tasks || []).find(x => x.taskSheet === s.selectedTaskSheet);
    const title = t ? (t.title || t.taskSheet) : s.selectedTaskSheet;

    const tabs = [
      { key: "overview", label: "Overview" },
      { key: "fields", label: "Fields (Builder)" },
      { key: "submissions", label: "Submissions (Approval)" },
      { key: "settings", label: "Settings" },
    ];

    const header = AdminComponents.headerBar({
      title,
      subtitle: t ? `${t.taskSheet} • ${t.audienceType || "ALL"}: ${(t.audienceValue || "").trim() || "—"}` : s.selectedTaskSheet,
      right: el("div", { class: "flex items-center gap-2 flex-wrap justify-end" }, [
        el("span", { class: "pill" }, [t?.dueAt ? `Due ${t.dueAt}` : "No due"]),
        t ? (t.active ? el("span", { class: "pill border-slate-900 text-slate-900" }, ["Active"]) : el("span", { class: "pill" }, ["Inactive"])) : null,
        el("button", {
          class: "px-3 py-2 rounded-xl border border-slate-200 hover:bg-white text-xs font-semibold",
          onclick: () => AdminState.go({ name: "tasks" }),
          type: "button",
        }, ["Back"]),
      ].filter(Boolean)),
    });

    const tabsEl = AdminComponents.tabsBar(tabs, s.activeTab, (tabKey) => {
      AdminState.go({ name: "task", taskSheet: s.selectedTaskSheet, tab: tabKey });
      if (tabKey === "fields") tryLoadTaskFields(s.selectedTaskSheet);
    });

    root.appendChild(header);
    root.appendChild(el("div", { class: "h-4" }, []));
    root.appendChild(tabsEl);
    root.appendChild(el("div", { class: "h-4" }, []));

    if (s.activeTab === "overview") root.appendChild(renderOverview(t));
    else if (s.activeTab === "fields") root.appendChild(renderBuilder(t, s));
    else if (s.activeTab === "submissions") root.appendChild(renderSubmissions(t));
    else if (s.activeTab === "settings") root.appendChild(renderSettings(t));
  }

  function renderOverview(t) {
    return el("div", { class: "bg-white rounded-2xl border border-slate-200 p-5" }, [
      el("div", { class: "text-lg font-semibold" }, ["Overview"]),
      el("div", { class: "text-sm text-slate-600 mt-1" }, ["Ringkasan task dan quick actions."]),
      el("div", { class: "grid md:grid-cols-2 gap-3 mt-4" }, [
        infoCard("Task Sheet", t?.taskSheet || "—"),
        infoCard("Audience", `${t?.audienceType || "ALL"}: ${(t?.audienceValue || "").trim() || "—"}`),
        infoCard("Due", t?.dueAt || "—"),
        infoCard("Created", `${t?.createdAt || "—"} • ${t?.createdBy || "—"}`),
      ]),
      el("div", { class: "flex gap-2 mt-5 flex-wrap" }, [
        el("button", {
          class: "px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm",
          onclick: () => AdminState.go({ name: "task", taskSheet: t.taskSheet, tab: "fields" }),
          type: "button",
        }, ["Open Builder"]),
        el("button", {
          class: "px-4 py-2 rounded-xl border border-slate-200 hover:bg-white font-semibold text-sm",
          onclick: () => ensureColumns(t?.taskSheet),
          type: "button",
        }, ["Ensure Columns"]),
      ]),
    ]);
  }

  function infoCard(label, value) {
    return el("div", { class: "rounded-2xl border border-slate-200 bg-slate-50 p-4" }, [
      el("div", { class: "text-xs text-slate-500" }, [label]),
      el("div", { class: "font-semibold mt-1 break-words" }, [String(value)]),
    ]);
  }

  // --- NEW: Render Submissions with Approval ---
  function renderSubmissions(t) {
    const container = el("div", { id: "subContainer" }, []);
    
    let localSubs = [];
    let selectedUserId = null;
    let fieldsDef = [];

    const loadData = async () => {
      container.innerHTML = "";
      container.appendChild(el("div", { class: "p-10 text-center text-slate-500" }, ["Memuat data submissions..."]));
      
      try {
        const [subRes, fieldRes] = await Promise.all([
          AdminAPI.adminSubmissionsList(t.taskSheet),
          AdminAPI.adminTaskFieldsGet(t.taskSheet)
        ]);
        
        localSubs = subRes.items || [];
        fieldsDef = fieldRes.items || [];
        renderLayout();
      } catch (e) {
        container.innerHTML = "";
        container.appendChild(el("div", { class: "p-5 text-red-600 bg-red-50 rounded-xl" }, ["Error: " + e.message]));
      }
    };

    const renderLayout = () => {
      container.innerHTML = "";

      // Left List
      const listContainer = el("div", { class: "overflow-y-auto h-full" }, []);
      if (localSubs.length === 0) {
        listContainer.appendChild(el("div", { class: "p-5 text-sm text-slate-400" }, ["Belum ada yang submit."]));
      } else {
        localSubs.forEach(sub => {
          listContainer.appendChild(AdminComponents.userListItem(sub, sub.id_user === selectedUserId, () => {
            selectedUserId = sub.id_user;
            renderLayout();
          }));
        });
      }

      // Right Preview
      const previewContainer = el("div", { class: "h-full flex flex-col" }, []);
      const selectedSub = localSubs.find(s => s.id_user === selectedUserId);

      if (!selectedSub) {
        previewContainer.appendChild(el("div", { class: "m-auto text-slate-400 text-sm text-center" }, [
          el("div", { class: "text-4xl mb-2" }, ["👈"]),
          "Pilih karyawan di panel kiri untuk mulai memeriksa."
        ]));
      } else {
        // Header Review
        previewContainer.appendChild(el("div", { class: "p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10" }, [
          el("div", {}, [
            el("div", { class: "font-bold text-lg" }, [selectedSub.nama_lengkap]),
            el("div", { class: "text-xs text-slate-500" }, [`ID: ${selectedSub.id_user} • Updated: ${selectedSub.updatedAt}`])
          ]),
          el("div", { class: "flex gap-2" }, [
            el("button", { 
              class: "px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition",
              onclick: () => doReject(selectedSub)
            }, ["Tolak"]),
            el("button", { 
              class: "px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-lg transition",
              onclick: () => doApprove(selectedSub)
            }, ["Setujui (Approve)"])
          ])
        ]));

        // Content
        const formContent = el("div", { class: "flex-1 overflow-y-auto p-6" }, [
          el("div", { class: "max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 grid gap-6" }, 
            fieldsDef.map(f => {
              const val = selectedSub[f.fieldKey];
              if (f.labelOverride?.toLowerCase().includes("foto") || String(val).startsWith("http")) {
                return el("div", {}, [
                  el("div", { class: "text-xs font-bold text-slate-400 uppercase mb-2" }, [f.labelOverride || f.fieldKey]),
                  val ? el("a", { href: val, target: "_blank" }, [
                    el("img", { src: val, class: "w-full h-64 object-cover rounded-lg border border-slate-100 hover:opacity-90 transition bg-slate-100" })
                  ]) : el("div", { class: "text-sm text-slate-400 italic" }, ["Tidak ada file"])
                ]);
              }
              return el("div", { class: "border-b border-slate-100 pb-2" }, [
                el("div", { class: "text-xs font-bold text-slate-400 uppercase mb-1" }, [f.labelOverride || f.fieldKey]),
                el("div", { class: "text-base text-slate-800 whitespace-pre-wrap" }, [val || "-"])
              ]);
            })
          )
        ]);
        previewContainer.appendChild(formContent);
      }

      container.appendChild(AdminComponents.submissionSplitView({ list: listContainer, preview: previewContainer }));
    };

    const doApprove = async (sub) => {
      if (!confirm(`Setujui data ${sub.nama_lengkap}?`)) return;
      setLoading(true, "Approving...");
      try {
        await AdminAPI.call("admin.submission.review", { 
          taskSheet: t.taskSheet, 
          targetUserId: sub.id_user, 
          status: "APPROVED" 
        });
        toast("Data disetujui.", "success");
        await loadData();
      } catch (e) { toast(e.message, "error"); } 
      finally { setLoading(false); }
    };

    const doReject = async (sub) => {
      const reason = prompt("Masukkan alasan penolakan untuk user ini:");
      if (reason === null) return;
      if (!reason.trim()) return toast("Alasan wajib diisi!", "error");

      setLoading(true, "Rejecting...");
      try {
        await AdminAPI.call("admin.submission.review", { 
          taskSheet: t.taskSheet, 
          targetUserId: sub.id_user, 
          status: "REJECTED",
          reason: reason
        });
        toast("Data ditolak.", "success");
        await loadData();
      } catch (e) { toast(e.message, "error"); } 
      finally { setLoading(false); }
    };

    loadData();
    return container;
  }
  // --- END NEW Submissions ---

  function renderSettings(t) {
    const isAdmin = String(user.role || "").toLowerCase() === "admin";
    const isSuper = String(user.role || "").toLowerCase() === "superadmin";

    const atLocked = isAdmin && !isSuper;
    const myPT = String(user.pt || "").trim();

    const form = el("div", { class: "bg-white rounded-2xl border border-slate-200 p-5" }, [
      el("div", { class: "text-lg font-semibold" }, ["Settings"]),
      el("div", { class: "text-sm text-slate-600 mt-1" }, ["Ubah metadata task (title, due, audience, active)."]),
      el("div", { class: "grid md:grid-cols-2 gap-3 mt-4" }, [
        fieldInput("Title", "st_title", t?.title || ""),
        fieldInput("Due (YYYY-MM-DD)", "st_due", t?.dueAt || ""),
        fieldSelect("Active", "st_active", ["TRUE", "FALSE"], t?.active ? "TRUE" : "FALSE"),
        fieldSelect("Allow Resubmit", "st_resubmit", ["", "TRUE", "FALSE"], String(t?.allowResubmit || "")),
        fieldSelect("Audience Type", "st_at", ["ALL", "PT", "UNIT", "KEL_TEAM", "USERLIST"], String(t?.audienceType || "ALL")),
        fieldInput("Audience Value (CSV)", "st_av", String(t?.audienceValue || "")),
        fieldInput("Description", "st_desc", String(t?.desc || "")),
      ]),
      el("div", { class: "mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700" }, [
        atLocked
          ? el("div", {}, [`Admin terkunci: audienceType=PT dan audienceValue=${myPT}`])
          : el("div", {}, ["Superadmin bebas memilih audience."]),
      ]),
      el("div", { class: "flex gap-2 mt-5" }, [
        el("button", {
          class: "px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm",
          onclick: async () => {
            const payload = collectSettingsPayload(t?.taskSheet, atLocked, myPT);
            await saveTaskMeta(payload);
          },
          type: "button",
        }, ["Save Settings"]),
      ]),
    ]);

    if (atLocked) {
      const atEl = form.querySelector("#st_at");
      const avEl = form.querySelector("#st_av");
      if (atEl) { atEl.value = "PT"; atEl.disabled = true; atEl.classList.add("bg-slate-100"); }
      if (avEl) { avEl.value = myPT; avEl.readOnly = true; avEl.classList.add("bg-slate-100"); }
    }

    return form;
  }

  function collectSettingsPayload(taskSheet, atLocked, myPT) {
    const v = (id) => String(document.getElementById(id)?.value || "").trim();
    let audienceType = v("st_at") || "ALL";
    let audienceValue = v("st_av");

    if (atLocked) {
      audienceType = "PT";
      audienceValue = myPT;
    }

    return {
      taskSheet,
      title: v("st_title"),
      desc: v("st_desc"),
      active: v("st_active"),
      dueAt: v("st_due"),
      audienceType,
      audienceValue,
      allowResubmit: v("st_resubmit"),
    };
  }

  async function saveTaskMeta(payload) {
    setLoading(true, "Saving task settings...");
    try {
      await AdminAPI.adminTaskUpsert(payload);
      toast("Settings saved", "success");
      await refreshTasks();
    } catch (e) {
      toast(String(e?.message || e), "error");
    } finally {
      setLoading(false);
    }
  }

  function fieldInput(label, id, value) {
    return el("label", { class: "grid gap-1" }, [
      el("div", { class: "text-sm font-medium text-slate-700" }, [label]),
      el("input", {
        id,
        value,
        class: "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300",
      }),
    ]);
  }

  function fieldSelect(label, id, options, value) {
    const s = el("select", {
      id,
      class: "w-full rounded-xl border border-slate-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300",
    }, []);
    options.forEach(opt => {
      const o = el("option", { value: opt }, [opt === "" ? "Default" : opt]);
      if (String(opt) === String(value)) o.selected = true;
      s.appendChild(o);
    });
    return el("label", { class: "grid gap-1" }, [
      el("div", { class: "text-sm font-medium text-slate-700" }, [label]),
      s,
    ]);
  }

  function renderBuilder(task, s) {
    const fm = s.fieldMaster || [];
    const items = s.builder.items || [];
    const paletteQ = String(s.builder.paletteQuery || "").toLowerCase();

    const paletteFiltered = fm.filter(f => {
      if (!paletteQ) return true;
      const hay = `${f.fieldKey} ${f.labelDefault} ${f.type} ${f.options}`.toLowerCase();
      return hay.includes(paletteQ);
    });

    const left = el("div", { class: "grid gap-3" }, [
      el("input", {
        class: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300",
        placeholder: "Search field master…",
        value: s.builder.paletteQuery || "",
        oninput: (e) => AdminState.patchBuilder({ paletteQuery: String(e.target.value || "") }),
      }),
      el("div", { class: "grid gap-2" }, paletteFiltered.map(f => {
        const exists = items.some(x => x.fieldKey === f.fieldKey);
        return el("button", {
          type: "button",
          class: `text-left px-3 py-2 rounded-xl border ${exists ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 hover:bg-slate-50"}`,
          onclick: () => exists ? removeField(f.fieldKey) : addField(f.fieldKey),
        }, [
          el("div", { class: "font-semibold text-sm" }, [f.fieldKey]),
          el("div", { class: `text-xs ${exists ? "text-white/80" : "text-slate-500"}` }, [`${f.type} • ${f.labelDefault}`]),
        ]);
      })),
    ]);

    const center = el("div", { class: "grid gap-2" }, [
      items.length
        ? null
        : el("div", { class: "text-sm text-slate-600" }, ["Belum ada field di task ini. Tambahkan dari Field Master (kiri)."]),
      el("div", { class: "grid gap-2", id: "taskFieldsList" }, items.map(renderTaskFieldRow)),
      el("div", { class: "flex gap-2 mt-2 flex-wrap" }, [
        el("button", {
          class: "px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-sm",
          onclick: () => saveFields(task?.taskSheet),
          type: "button",
        }, ["Save Fields"]),
        el("button", {
          class: "px-4 py-2 rounded-xl border border-slate-200 hover:bg-white font-semibold text-sm",
          onclick: () => ensureColumns(task?.taskSheet),
          type: "button",
        }, ["Ensure Columns"]),
      ]),
    ].filter(Boolean));

    const right = renderInspector(task, s);

    const wrap = el("div", {}, [
      AdminComponents.builderLayout({ left, center, right }),
    ]);

    setTimeout(() => initDnD(), 0);
    return wrap;
  }

  function renderTaskFieldRow(item) {
    const sel = AdminState.store.builder.selectedFieldKey === item.fieldKey;

    const row = el("div", {
      class: `field-row ${sel ? "selected" : ""}`,
      draggable: "true",
      "data-fk": item.fieldKey,
      onclick: () => AdminState.patchBuilder({ selectedFieldKey: item.fieldKey }),
    }, [
      el("div", { class: "flex items-start justify-between gap-3" }, [
        el("div", { class: "min-w-0" }, [
          el("div", { class: "font-semibold text-sm" }, [item.fieldKey]),
          el("div", { class: "text-xs text-slate-500 mt-0.5" }, [
            `order ${item.order} • req=${item.requiredOverride || "default"} • ro=${String(item.readonly || "FALSE")}`
          ]),
        ]),
        el("button", {
          type: "button",
          class: "px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold",
          onclick: (e) => { e.stopPropagation(); removeField(item.fieldKey); },
        }, ["Remove"]),
      ]),
      item.labelOverride
        ? el("div", { class: "text-xs text-slate-700 mt-2" }, [`Label: ${item.labelOverride}`])
        : null,
    ].filter(Boolean));

    return row;
  }

  function renderInspector(task, s) {
    const fm = s.fieldMaster || [];
    const items = s.builder.items || [];
    const fk = s.builder.selectedFieldKey || "";

    const found = items.find(x => x.fieldKey === fk);
    const master = fm.find(x => x.fieldKey === fk);

    if (!found) {
      return el("div", { class: "text-sm text-slate-600" }, [
        "Klik salah satu field di Task Fields untuk mengedit properti."
      ]);
    }

    const labelDefault = master?.labelDefault || fk;
    const type = master?.type || "text";

    return el("div", { class: "grid gap-3" }, [
      el("div", { class: "rounded-2xl border border-slate-200 bg-slate-50 p-4" }, [
        el("div", { class: "text-xs text-slate-500" }, ["Selected field"]),
        el("div", { class: "font-semibold mt-1" }, [fk]),
        el("div", { class: "text-xs text-slate-600 mt-1" }, [`${type} • default label: ${labelDefault}`]),
      ]),

      formRow("Order", el("input", {
        class: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
        type: "number",
        min: "1",
        value: String(found.order || 9999),
        oninput: (e) => updateField(fk, { order: Number(e.target.value || 9999) }),
      })),

      formRow("Required override", el("select", {
        class: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
        onchange: (e) => updateField(fk, { requiredOverride: String(e.target.value || "") }),
      }, [
        opt("", "default", found.requiredOverride === "" || typeof found.requiredOverride === "undefined"),
        opt("TRUE", "required", String(found.requiredOverride) === "TRUE"),
        opt("FALSE", "optional", String(found.requiredOverride) === "FALSE"),
      ])),

      formRow("Readonly", el("select", {
        class: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
        onchange: (e) => updateField(fk, { readonly: String(e.target.value || "FALSE") }),
      }, [
        opt("FALSE", "FALSE", String(found.readonly || "FALSE") !== "TRUE"),
        opt("TRUE", "TRUE", String(found.readonly || "FALSE") === "TRUE"),
      ])),

      formRow("Label override", el("input", {
        class: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm",
        placeholder: labelDefault,
        value: String(found.labelOverride || ""),
        oninput: (e) => updateField(fk, { labelOverride: String(e.target.value || "") }),
      })),

      el("div", { class: "mt-2" }, [
        el("div", { class: "text-xs text-slate-500 mb-2" }, ["Preview"]),
        previewControl(master, found),
      ]),
    ]);
  }

  function formRow(label, control) {
    return el("label", { class: "grid gap-1" }, [
      el("div", { class: "text-sm font-medium text-slate-700" }, [label]),
      control,
    ]);
  }
  function opt(value, label, selected) {
    const o = el("option", { value }, [label]);
    if (selected) o.selected = true;
    return o;
  }

  function previewControl(master, item) {
    const type = String(master?.type || "text");
    if (type === "paragraph") {
      return el("textarea", { class: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm", rows: 4, placeholder: "Preview..." }, []);
    }
    if (type === "checkbox") {
      const opts = String(master?.options || "").split(",").map(s => s.trim()).filter(Boolean);
      return el("div", { class: "grid gap-2" }, opts.length ? opts.map(o =>
        el("label", { class: "flex items-center gap-2 text-sm" }, [
          el("input", { type: "checkbox", class: "rounded border-slate-300" }, []),
          el("span", {}, [o]),
        ])
      ) : [el("div", { class: "text-sm text-slate-600" }, ["(No options)"])]);
    }
    if (type === "upload") {
      return el("div", { class: "rounded-xl border border-slate-200 p-3 text-sm text-slate-600" }, [
        `Upload (${master?.accept || "any"}) • maxFiles=${master?.maxFiles || 1}`
      ]);
    }
    return el("input", { class: "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm", placeholder: "Preview..." }, []);
  }

  // ---- Builder actions ----
  function addField(fieldKey) {
    const items = [...AdminState.store.builder.items];
    if (items.some(x => x.fieldKey === fieldKey)) return;
    const order = (items.length ? Math.max(...items.map(x => Number(x.order || 0))) : 0) + 1;

    items.push({
      fieldKey,
      order,
      requiredOverride: "",
      labelOverride: "",
      active: "TRUE",
      readonly: "FALSE",
    });

    AdminState.patchBuilder({ items, selectedFieldKey: fieldKey });
  }

  function removeField(fieldKey) {
    const items = AdminState.store.builder.items.filter(x => x.fieldKey !== fieldKey);
    const selected = AdminState.store.builder.selectedFieldKey === fieldKey ? "" : AdminState.store.builder.selectedFieldKey;
    AdminState.patchBuilder({ items: normalizeOrders(items), selectedFieldKey: selected || items[0]?.fieldKey || "" });
  }

  function updateField(fieldKey, patch) {
    const items = AdminState.store.builder.items.map(x => {
      if (x.fieldKey !== fieldKey) return x;
      return { ...x, ...patch };
    });
    AdminState.patchBuilder({ items });
  }

  function normalizeOrders(items) {
    const sorted = [...items].sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
    return sorted.map((x, i) => ({ ...x, order: i + 1 }));
  }

  function initDnD() {
    const list = document.getElementById("taskFieldsList");
    if (!list) return;

    let dragKey = "";

    list.querySelectorAll(".field-row").forEach(row => {
      row.addEventListener("dragstart", (e) => {
        dragKey = row.getAttribute("data-fk") || "";
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        dragKey = "";
      });

      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const overKey = row.getAttribute("data-fk") || "";
        if (!dragKey || !overKey || dragKey === overKey) return;

        const items = [...AdminState.store.builder.items];
        const from = items.findIndex(x => x.fieldKey === dragKey);
        const to = items.findIndex(x => x.fieldKey === overKey);
        if (from < 0 || to < 0) return;

        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);

        AdminState.patchBuilder({ items: normalizeOrders(items) });
      });
    });
  }

  async function saveFields(taskSheet) {
    if (!taskSheet) return toast("Task belum dipilih", "error");
    const items = normalizeOrders([...AdminState.store.builder.items]).map(x => ({
      taskSheet,
      fieldKey: x.fieldKey,
      order: x.order,
      requiredOverride: x.requiredOverride ?? "",
      labelOverride: x.labelOverride ?? "",
      active: "TRUE",
      readonly: String(x.readonly || "FALSE"),
    }));

    if (!items.length) return toast("Tidak ada field untuk disimpan", "error");

    setLoading(true, "Saving fields...");
    try {
      await AdminAPI.adminTaskFieldsSet(taskSheet, items);
      toast("Fields saved", "success");
      await ensureColumns(taskSheet, true);
    } catch (e) {
      toast(String(e?.message || e), "error");
    } finally {
      setLoading(false);
    }
  }

  async function ensureColumns(taskSheet, silent) {
    if (!taskSheet) return toast("Task belum dipilih", "error");
    setLoading(true, "Ensuring columns...");
    try {
      await AdminAPI.adminTaskEnsureColumns(taskSheet);
      if (!silent) toast("Columns ensured", "success");
    } catch (e) {
      toast(String(e?.message || e), "error");
    } finally {
      setLoading(false);
    }
  }

  async function refreshTasks() {
    const res = await AdminAPI.adminTaskList();
    AdminState.set({ tasks: res.items || [] });
  }

  function createNewTaskFlow() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const suggested = `T_NEW_${y}_${m}_${dd}`;

    toast(`Buat task baru: klik salah satu task untuk edit atau buat taskSheet "${suggested}" di Settings → Save.`, "success");
  }
})();
