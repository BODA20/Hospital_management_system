import type { Request } from 'express';
import * as auditRepo from '../repositories/audit.repo';
import type { AuditActionType, CreateAuditLogDTO } from '../audit.types';


export const logAuditEvent = async (
  req: Request,
  payload: {
    action_type: AuditActionType;
    description: string;
    actor_name?: string;
    user_id?: number | null;
  }
): Promise<void> => {
  // Extract client IP -- respects proxies (X-Forwarded-For) when present
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    null;

  // Cast req.user to any to bypass TypeScript dynamic property restrictions safely
  const currentUser = req.user as any;

  // Prefer explicit actor_name, fall back to authenticated user identity fields,
  // then the sentinel 'anonymous'. This ensures actor_name NEVER resolves to null
  // and never violates the DB NOT NULL constraint.
  const actor = payload.actor_name
    ?? currentUser?.full_name
    ?? currentUser?.email
    ?? 'anonymous';

  const userId = payload.user_id !== undefined
    ? payload.user_id
    : (currentUser?.id ?? null);

  const dto: CreateAuditLogDTO = {
    user_id:     userId,
    actor_name:  actor,
    action_type: payload.action_type,
    description: payload.description,
    ip_address:  ip,
  };

  // Synchronous telemetry -- visible in Docker logs for every emission attempt
  console.log('👉 [TELEMETRY] EMITTING AUDIT DTO TO DB:', JSON.stringify(dto));

  // Awaited insertion: callers that await logAuditEvent() block until the record
  // is committed, and any DB error surfaces in the container log.
  // Never re-throws — a logging failure must never break the primary request.
  try {
    await auditRepo.insertLog(dto);
  } catch (err: any) {
    console.error('!!! AUDIT DB INSERTION FAILED !!!', err?.message ?? err);
    if (err.stack) console.error(err.stack);
  }
};

/**
 * Service wrapper for reading logs -- used by the admin controller.
 */
export const getSecurityLogs = async (filters?: {
  action_type?: string;
  search?: string;
  limit?: number;
}) => {
  return auditRepo.findAllLogs(filters);
};
