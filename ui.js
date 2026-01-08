// ui.js - FULL CODE

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const ch of children) {
    node.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
  }
  return node;
}

function toast(msg, type = "info") {
  const wrap = document.getElementById("toast");
  if (!wrap) return alert(msg);

  const color =
    type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-slate-900";

  const t = el("div", { class: `${color} text-white px-4 py-3 rounded-xl shadow-lg max-w-lg animate-bounce-in` }, [
    msg,
  ]);

  wrap.innerHTML = "";
  wrap.appendChild(t);
  setTimeout(() => {
    if (wrap.contains(t)) wrap.removeChild(t);
  }, 2800);
}

function setLoading(isLoading, text = "Loading...") {
  const overlay = document.getElementById("loading");
  if (!overlay) return;
  overlay.classList.toggle("hidden", !isLoading);
  const txt = overlay.querySelector("[data-loading-text]");
  if (txt) txt.textContent = text;
}

function formatDue(dueAt) {
  if (!dueAt) return "";
  return String(dueAt);
}

function isOverdue(dueAt) {
  if (!dueAt) return false;
  const d = new Date(dueAt);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getTime() < now.getTime() - 24 * 3600 * 1000;
}

function badge(text, kind = "neutral") {
  const cls =
    kind === "danger"
      ? "bg-red-100 text-red-700"
      : kind === "success"
      ? "bg-green-100 text-green-700"
      : "bg-slate-100 text-slate-700";
  return el("span", { class: `${cls} text-xs font-semibold px-2 py-1 rounded-full` }, [text]);
}

// --- NEW COMPONENTS (UI UPDATE) ---

function cardTaskNative(t, onClick) {
  let statusText = "Baru";
  let statusColor = "bg-slate-100 text-slate-600 border-slate-200";
  let icon = ""; 

  if (t.submitted) {
    if (t.status === "APPROVED") {
      statusText = "Selesai";
      statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
      icon = "✓";
    } else if (t.status === "REJECTED") {
      statusText = "Ditolak";
      statusColor = "bg-red-50 text-red-700 border-red-200";
      icon = "!";
    } else {
      statusText = "Menunggu Review";
      statusColor = "bg-amber-50 text-amber-700 border-amber-200";
      icon = "⏳";
    }
  } else if (isOverdue(t.dueAt)) {
    statusText = "Terlambat";
    statusColor = "bg-rose-50 text-rose-700 border-rose-200";
  }

  return el("div", { 
    class: "group relative bg-white rounded-2xl p-5 mb-4 border border-slate-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer overflow-hidden",
    onclick: () => onClick(t)
  }, [
    // Status Badge
    el("div", { class: `absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${statusColor}` }, [
      el("span", {}, [icon]),
      el("span", {}, [statusText])
    ]),

    // Judul & Deskripsi
    el("div", { class: "pr-24" }, [ 
      el("h3", { class: "text-lg font-bold text-slate-900 leading-tight" }, [t.title || "Tugas Tanpa Judul"]),
      el("p", { class: "text-sm text-slate-500 mt-1 line-clamp-2" }, [t.desc || "Tidak ada deskripsi"]),
    ]),

    // Footer
    el("div", { class: "mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 font-medium" }, [
      el("span", {}, ["📅 Batas waktu: " + (t.dueAt || "-")])
    ])
  ]);
}

function bottomNav(activeTab, onSwitch) {
  const menus = [
    { id: "tasks", label: "Tugas", icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>` },
    { id: "profile", label: "Akun", icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>` }
  ];

  return el("div", { class: "fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-around items-end z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" }, 
    menus.map(m => {
      const isActive = activeTab === m.id;
      return el("button", { 
        class: `flex flex-col items-center gap-1 p-2 pb-4 transition-colors ${isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"}`,
        onclick: () => onSwitch(m.id)
      }, [
        el("div", { html: m.icon }),
        el("span", { class: "text-[10px] font-bold uppercase tracking-wide" }, [m.label])
      ]);
    })
  );
}
