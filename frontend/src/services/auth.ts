// src/services/auth.ts
// Simple token store — keeps auth.get() working for api.ts future use
export const auth = {
  save: (token: string): void => localStorage.setItem("jwt", token),
  get: (): string | null => localStorage.getItem("jwt"),
  clear: (): void => localStorage.removeItem("jwt"),
};