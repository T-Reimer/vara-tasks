const CLIENT_ID_KEY = "vara.client-id";

export function getClientId(): string {
  const existingId = localStorage.getItem(CLIENT_ID_KEY);
  if (existingId) return existingId;

  const id = crypto.randomUUID();
  try {
    localStorage.setItem(CLIENT_ID_KEY, id);
  } catch {
    // Fall back to in-memory value when storage is unavailable.
  }
  return id;
}
