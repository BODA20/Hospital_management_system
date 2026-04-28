// ─── Global Express Request Type Extension ─────────────────────────────────────
// Declares req.user globally so every controller and middleware is fully typed
// without per-file interface re-declarations.

declare global {
  namespace Express {
    interface Request {
      user: {
        id: number;
        role: string;
      };
      validatedQuery?: unknown;
    }
  }
}

export {};
