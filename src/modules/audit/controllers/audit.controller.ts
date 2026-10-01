import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import * as auditService from '../services/audit.service';

/**
 * GET /api/v1/audit/security-logs
 * Admin-only — returns all security logs, newest first.
 * Supports optional query params:
 *   ?action_type=LOGIN_FAILED
 *   ?search=alice
 *   ?limit=200
 */
export const getSecurityLogs = asyncHandler(async (req: Request, res: Response) => {
  const { action_type, search, limit } = req.query;

  try {
    const logs = await auditService.getSecurityLogs({
      action_type: action_type as string | undefined,
      search:      search      as string | undefined,
      limit:       limit       ? Number(limit) : 1000,
    });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs,
    });
  } catch (err: any) {
    console.error('[AuditController] Failed to fetch security logs, falling back to empty array:', err?.message ?? err);
    res.status(200).json({
      status: 'success',
      results: 0,
      data: [],
    });
  }
});
