async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = res.status;
    throw error;
  }
  return data;
}

export function getMe() {
  return fetch("/api/me", { credentials: "include" }).then(handleResponse);
}

export function getCapsules() {
  return fetch("/api/capsules", { credentials: "include" }).then(handleResponse);
}

export function createCapsule(payload) {
  return fetch("/api/capsules", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handleResponse);
}

export function updateCapsule(id, payload) {
  return fetch(`/api/capsules/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handleResponse);
}

export function deleteCapsule(id) {
  return fetch(`/api/capsules/${id}`, { method: "DELETE", credentials: "include" }).then(handleResponse);
}