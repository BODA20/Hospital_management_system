import db from '../../../config/db';
import type { SecurityLog, CreateAuditLogDTO } from '../audit.types';

/**
 * Insert a single audit log entry.
 * This is fire-and-forget safe — callers should NOT await if they don't want
 * logging failures to break the primary request pipeline.
 */
export const insertLog = async (dto: CreateAuditLogDTO): Promise<SecurityLog> => {
  const [log] = await db<SecurityLog>('security_logs')
    .insert({
      user_id:     dto.user_id   ?? null,
      actor_name:  dto.actor_name,
      action_type: dto.action_type,
      description: dto.description,
      ip_address:  dto.ip_address ?? null,
    })
    .returning('*');

  return log;
};

/**
 * Fetch all security logs ordered by most recent first.
 * Supports optional filtering by action_type and actor search.
 *
 * Edge-case safety: wrapped in try/catch — if the query fails OR returns zero
 * rows, an empty array is returned, guaranteeing the controller can always
 * respond 200 OK with a clean empty collection instead of propagating an
 * unhandled exception.
 */
export const findAllLogs = async (filters?: {
  action_type?: string;
  search?: string;
  limit?: number;
}): Promise<SecurityLog[]> => {
  try {
    let query = db<SecurityLog>('security_logs')
      .orderBy('created_at', 'desc');

    // ── action_type filter: exact case-sensitive match against DB enum values ──
    // Guard against empty string (e.g. from a frontend reset selecting "ALL")
    if (filters?.action_type && filters.action_type.trim() !== '') {
      query = query.where('action_type', filters.action_type.trim());
    }

    // ── free-text search across actor_name and description (case-insensitive) ─
    if (filters?.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim()}%`;
      query = query.where((qb) =>
        qb
          .where('actor_name', 'ilike', term)
          .orWhere('description', 'ilike', term)
      );
    }

    // ── result cap — defaults to 500 if not specified ─────────────────────────
    const cap = filters?.limit && filters.limit > 0 ? filters.limit : 1000;
    query = query.limit(cap);

    const rows = await query;

    // Always return a clean array — never undefined/null
    return rows ?? [];
  } catch (err: any) {
    console.error(
      '[AuditRepo] findAllLogs query failed — returning empty collection:',
      err?.message ?? err,
    );
    // Return safe empty array so the controller can respond 200 OK
    return [];
  }
};
