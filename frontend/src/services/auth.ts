export const auth = {
  saveSubject: (sub: string): void => localStorage.setItem("auth0_sub", sub),
  getSubject: (): string | null => localStorage.getItem("auth0_sub"),
  clear: (): void => {
    localStorage.removeItem("auth0_sub");
    localStorage.removeItem("demo_user_id");
  },
};