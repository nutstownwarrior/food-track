const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unbekannter Fehler');
  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username, password, email) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, email }) }),

  // User/Profile
  getUser: () => request('/user'),
  updateUser: (data) => request('/user', { method: 'PUT', body: JSON.stringify(data) }),

  // Food
  getFood: (date) => request(`/food?date=${date}`),
  addFood: (entry) => request('/food', { method: 'POST', body: JSON.stringify(entry) }),
  deleteFood: (id) => request(`/food/${id}`, { method: 'DELETE' }),

  // Weight
  getWeight: () => request('/weight'),
  addWeight: (weight_kg, logged_at) =>
    request('/weight', { method: 'POST', body: JSON.stringify({ weight_kg, logged_at }) }),
  deleteWeight: (id) => request(`/weight/${id}`, { method: 'DELETE' }),

  // AI
  analyzePhoto: (image, mimeType) =>
    request('/ai/analyze', { method: 'POST', body: JSON.stringify({ image, mimeType }) }),

  // Activity
  getActivity: (date) => request(`/activity?date=${date}`),
  addActivity: (entry) => request('/activity', { method: 'POST', body: JSON.stringify(entry) }),
  importActivity: (entries) => request('/activity/import', { method: 'POST', body: JSON.stringify({ entries }) }),
  deleteActivity: (id) => request(`/activity/${id}`, { method: 'DELETE' }),
};

export { getToken };
