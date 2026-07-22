export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
}
