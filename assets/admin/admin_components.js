// /assets/admin/admin_components.js
// Pure UI components (vanilla). Depends on global helper el() from ui.js

(() => {
  "use strict";

  function pill(text) {
    return el("span", { class: "pill" }, [text]);
  }

  function badgeActive(active) {
    return active
      ? el("span", { class: "pill border-slate-900 text-slate-900" }, ["Active"])
      : el("span", { class: "pill" }, ["Inactive"]);
  }

  function taskListItem(t, isActive, onClick) {
    const wrap = el("div", {
      class: `task-item ${isActive ? "active" : ""}`,
      onclick: () => onClick(t),
    }, [
      el("div", { class: "flex items-start justify-between gap-3" }, [
        el("div", { class: "min-w-0" }, [
          el("div", { class: "font-semibold text-sm truncate" }, [t.title || t.taskSheet]),
          el("div", { class: "text-xs text-slate-500 truncate mt-0.5" }, [t.taskSheet]),
        ]),
        el("div", { class: "text-xs text-slate-500 whitespace-nowrap" }, [t.dueAt ? `Due ${t.dueAt}` : ""]),
      ]),
      el("div", { class: "flex gap-2 mt-2 flex-wrap" }, [
        pill(`${(t.audienceType || "ALL")}: ${(t.audienceValue || "").trim() || "—"}`),
        badgeActive(!!t.active),
      ]),
    ]);
    return wrap;
  }

  function headerBar({ title, subtitle, right }) {
    return el("div", { class: "bg-white rounded-2xl border border-slate-200 p-5" }, [
      el("div", { class: "flex items-start justify-between gap-4" }, [
        el("div", {}, [
          el("div", { class: "text-xl font-semibold" }, [title]),
          subtitle ? el("div", { class: "text-sm text-slate-600 mt-1" }, [subtitle]) : null,
        ].filter(Boolean)),
        right || el("div", {}),
      ]),
    ]);
  }

  function tabsBar(tabs, activeKey, onTab) {
    return el("div", { class: "flex gap-2 flex-wrap" },
      tabs.map(t => el("button", {
        type: "button",
        class: `tab-btn ${t.key === activeKey ? "active" : ""}`,
        onclick: () => onTab(t.key),
      }, [t.label]))
    );
  }

  function tableTasks(tasks, onOpen) {
    const table = el("table", { class: "w-full text-sm" }, []);
    const thead = el("thead", { class: "text-xs text-slate-500" }, [
      el("tr", {}, [
        th("Task"),
        th("Due"),
        th("Audience"),
        th("Active"),
        th("Created"),
        th(""),
      ]),
    ]);

    const tbody = el("tbody", { class: "divide-y divide-slate-200" }, []);
    tasks.forEach(t => {
      tbody.appendChild(el("tr", { class: "hover:bg-slate-50" }, [
        td(
          el("div", {}, [
            el("div", { class: "font-semibold" }, [t.title || t.taskSheet]),
            el("div", { class: "text-xs text-slate-500" }, [t.taskSheet]),
          ])
        ),
        td(t.dueAt || "—"),
        td(`${t.audienceType || "ALL"}: ${(t.audienceValue || "").trim() || "—"}`),
        td(!!t.active ? "TRUE" : "FALSE"),
        td(`${t.createdAt || "—"} • ${t.createdBy || "—"}`),
        td(el("button", {
          class: "px-3 py-2 rounded-xl border border-slate-200 hover:bg-white text-xs font-semibold",
          onclick: () => onOpen(t),
          type: "button",
        }, ["Open"])),
      ]));
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    return el("div", { class: "bg-white rounded-2xl border border-slate-200 overflow-hidden" }, [
      el("div", { class: "p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between" }, [
        el("div", { class: "font-semibold" }, ["Tasks"]),
        el("div", { class: "text-xs text-slate-500" }, [`${tasks.length} items`]),
      ]),
      el("div", { class: "overflow-auto" }, [table]),
    ]);
  }

  function th(txt) {
    return el("th", { class: "text-left font-semibold px-4 py-3 whitespace-nowrap" }, [txt]);
  }
  function td(content) {
    const node = (typeof content === "string") ? el("div", {}, [content]) : content;
    return el("td", { class: "px-4 py-3 align-top" }, [node]);
  }

  // --- Form Builder UI ---
  function builderLayout({ left, center, right }) {
    return el("div", { class: "builder-grid" }, [
      panel("Field Master", left),
      panel("Task Fields", center),
      panel("Inspector", right),
    ]);
  }

  function panel(title, bodyNode) {
    return el("div", { class: "builder-panel" }, [
      el("div", { class: "builder-panel-head" }, [
        el("div", { class: "font-semibold" }, [title]),
      ]),
      el("div", { class: "builder-panel-body" }, [bodyNode]),
    ]);
  }

  window.AdminComponents = {
    taskListItem,
    headerBar,
    tabsBar,
    tableTasks,
    builderLayout,
    pill,
  };
})();
