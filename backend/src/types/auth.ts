export type AuthRole = 0 | 1 | 2;

export type AuthUser = {
  id: string;
  role: AuthRole;
  id_casal: string | null;
  email?: string;
};
