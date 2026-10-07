/** Public account shape — never includes passwordHash. */
export type AuthUserPublic = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthUserRecord = AuthUserPublic & {
  passwordHash: string;
};

export type AuthFile = {
  /** Single local account; null until setup wizard completes. */
  user: AuthUserRecord | null;
};

export type SessionPayload = {
  userId: string;
  username: string;
  /** unix seconds */
  exp: number;
};
