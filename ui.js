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

  const t = el("div", { class: `${color} text-white px-4 py-3 rounded-xl shadow-lg max-w-lg` }, [
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
  overlay.querySelector("[data-loading-text]").textContent = text;
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
