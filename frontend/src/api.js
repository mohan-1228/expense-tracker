const API_URL = import.meta.env.VITE_API_URL;

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}


export async function register(name, email, password) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Signup failed');
  return data;
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error|| data.message || 'Request failed');
  return data;
}

export const getExpenses = () => apiFetch('/expenses');
export const getCategories = () => apiFetch('/categories');

export const createExpense = (expense) =>
  apiFetch('/expenses', { method: 'POST', body: JSON.stringify(expense) });


export const getGroups = () => apiFetch('/groups');

export const createGroup = (name, description) =>
  apiFetch('/groups', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });

export const getGroup = (groupId) => apiFetch(`/groups/${groupId}`);

export const addGroupMember = (groupId, email) =>
  apiFetch(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const createGroupExpense = (groupId, expense) =>
  apiFetch(`/groups/${groupId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(expense),
  });

export const getGroupBalances = (groupId) =>
  apiFetch(`/groups/${groupId}/balance`);

export const settleWithMember = (groupId, withUserId) =>
  apiFetch(`/groups/${groupId}/settle`, {
    method: 'POST',
    body: JSON.stringify({ withUserId }),
  });

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}
