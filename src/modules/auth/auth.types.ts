export interface JwtPayload {
  id: number;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRecord {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  revoked_at: Date | null;
  replaced_by: number | null;
  user_agent: string | null;
  ip: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SessionCreateInput {
  user_id: number;
  token_hash: string;
  expires_at: Date;
  user_agent?: string | null;
  ip?: string | null;
}

export interface PasswordResetInput {
  userId: number;
  token: string;
  expires: Date;
}
