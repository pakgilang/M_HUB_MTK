// /assets/admin/admin_api.js
// Wrapper untuk apiCall() khusus admin. Semua request otomatis pakai token.

(() => {
  "use strict";

  const LS = { TOKEN: "M_HUB_TOKEN", USER: "M_HUB_USER" };

  function getToken() {
    return localStorage.getItem(LS.TOKEN) || "";
  }

  async function call(action, data) {
    const token = getToken();
    return apiCall(action, data || {}, token);
  }

  // ---- Admin API ----
  async function adminFieldMasterList() {
    return call("admin.fieldMaster.list", {});
  }

  async function adminTaskList() {
    return call("admin.task.list", {});
  }

  async function adminTaskUpsert(payload) {
    return call("admin.task.upsert", payload);
  }

  async function adminTaskFieldsSet(taskSheet, items) {
    return call("admin.task.fields.set", { taskSheet, items });
  }

  async function adminTaskEnsureColumns(taskSheet) {
    return call("admin.task.ensureColumns", { taskSheet });
  }

  // Optional future APIs (UI akan tetap jalan walau belum ada, error akan ditampilkan)
  async function adminTaskGet(taskSheet) {
    return call("admin.task.get", { taskSheet });
  }

  async function adminTaskFieldsGet(taskSheet) {
    return call("admin.task.fields.get", { taskSheet });
  }

  async function adminSubmissionsList(taskSheet, opts) {
    return call("admin.task.submissions.list", { taskSheet, ...(opts || {}) });
  }

  // Expose
  window.AdminAPI = {
    call,
    adminFieldMasterList,
    adminTaskList,
    adminTaskUpsert,
    adminTaskFieldsSet,
    adminTaskEnsureColumns,
    adminTaskGet,
    adminTaskFieldsGet,
    adminSubmissionsList,
  };
})();
