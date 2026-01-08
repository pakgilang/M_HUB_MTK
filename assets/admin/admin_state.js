// /assets/admin/admin_state.js
// State + router + render pipeline

(() => {
  "use strict";

  const LS = { TOKEN: "M_HUB_TOKEN", USER: "M_HUB_USER" };

  function loadUser() {
    try { return JSON.parse(localStorage.getItem(LS.USER) || "null"); }
    catch { return null; }
  }
  function loadToken() {
    return localStorage.getItem(LS.TOKEN) || "";
  }

  const store = {
    token: "",
    user: null,

    // data
    tasks: [],
    fieldMaster: [],

    // ui
    taskSearch: "",
    onlyActive: true,
    selectedTaskSheet: "",
    activeTab: "overview", // overview | fields | submissions | settings
    builder: {
      paletteQuery: "",
      selectedFieldKey: "",
      // taskFields items structure:
      // { fieldKey, order, requiredOverride:""/"TRUE"/"FALSE", labelOverride:"", active:"TRUE", readonly:"TRUE"/"FALSE" }
      items: [],
    },
  };

  const listeners = new Set();
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function notify() { listeners.forEach(fn => fn(store)); }

  function set(patch) {
    Object.assign(store, patch);
    notify();
  }

  function patchBuilder(patch) {
    Object.assign(store.builder, patch);
    notify();
  }

  function getRole() {
    return String(store.user?.role || "user").trim().toLowerCase();
  }

  function canAccessAdmin() {
    const r = getRole();
    return r === "admin" || r === "superadmin";
  }

  function selectTask(taskSheet) {
    store.selectedTaskSheet = taskSheet;
    store.activeTab = "overview";
    // reset builder state on selection (we try load mapping later)
    store.builder.selectedFieldKey = "";
    store.builder.items = [];
    notify();
  }

  function setTab(tabKey) {
    store.activeTab = tabKey;
    notify();
  }

  // Router (hash)
  function parseRoute() {
    const h = (location.hash || "#/tasks").replace(/^#/, "");
    const parts = h.split("/").filter(Boolean);
    // routes:
    // /tasks
    // /task/<taskSheet>/<tab?>
    if (parts[0] === "task" && parts[1]) {
      return { name: "task", taskSheet: decodeURIComponent(parts[1]), tab: parts[2] || "overview" };
    }
    return { name: "tasks" };
  }

  function go(route) {
    if (route.name === "tasks") {
      location.hash = "#/tasks";
      return;
    }
    if (route.name === "task") {
      const tab = route.tab || "overview";
      location.hash = `#/task/${encodeURIComponent(route.taskSheet)}/${tab}`;
      return;
    }
  }

  window.AdminState = {
    store,
    set,
    patchBuilder,
    subscribe,
    notify,
    loadUser,
    loadToken,
    canAccessAdmin,
    getRole,
    selectTask,
    setTab,
    parseRoute,
    go,
  };
})();
