async function apiCall(action, data = {}, token = "") {
  const { API_URL } = window.APP_CONFIG;

  const payload = { action, data };
  if (token) payload.token = token;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);
  if (!json) throw new Error("Invalid JSON response");

  if (json.ok === false) {
    throw new Error(json.error || "Request failed");
  }

  return json;
}

async function apiLogin(userId, password) {
  return apiCall("auth.login", { userId, password });
}

async function apiListTasks(token) {
  return apiCall("task.listForMe", {}, token);
}

async function apiGetSchema(token, taskSheet) {
  return apiCall("task.getSchema", { taskSheet }, token);
}

async function apiSaveMyData(token, taskSheet, answers) {
  return apiCall("task.saveMyData", { taskSheet, answers }, token);
}

async function apiUploadFile(token, file) {
  const base64 = await fileToBase64(file);
  return apiCall(
    "file.upload",
    {
      name: file.name,
      mime: file.type || "application/octet-stream",
      base64,
    },
    token
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = () => {
      const s = String(r.result || "");
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    r.readAsDataURL(file);
  });
}
