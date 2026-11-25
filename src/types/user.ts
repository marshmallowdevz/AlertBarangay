export type UserRole = "admin" | "official" | "resident";

export type AccountMetrics = {
  total: number;
  admins: number;
  officials: number;
  residents: number;
  active: number;
  disabled: number;
};

export type ManagedUser = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  position: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

export type UserDraft = {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  position: string;
  department: string;
};
