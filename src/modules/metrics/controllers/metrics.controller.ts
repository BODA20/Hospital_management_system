import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import db from '../../../config/db';

export const getMetricsSummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    // SAFEGUARD: Check schema integrity before querying to avoid 500 crashes
    const hasDepartments = await db.schema.hasTable('departments');
    const hasDoctors = await db.schema.hasTable('doctors');
    const hasNurses = await db.schema.hasTable('nurses');

    let departmentsQuery;
    if (hasDepartments) {
      // ─── FIX: Staff department_id lives in the `doctors` and `nurses` tables,
      //         NOT in `users.department_id`. The previous query joining on
      //         users.department_id always returned 0 because that column is
      //         never populated by the assign-department handler.
      //         Solution: UNION doctor + nurse rows per department, then join
      //         back to `users` for profile data. ────────────────────────────
      const doctorsPart = hasDoctors
        ? 'SELECT user_id, department_id FROM doctors WHERE department_id IS NOT NULL'
        : "SELECT NULL::int AS user_id, NULL::int AS department_id WHERE FALSE";

      const nursesPart = hasNurses
        ? 'SELECT user_id, department_id FROM nurses WHERE department_id IS NOT NULL'
        : "SELECT NULL::int AS user_id, NULL::int AS department_id WHERE FALSE";

      departmentsQuery = db.raw(`
        SELECT
          d.id,
          d.name_en,
          d.name_ar,
          COUNT(staff_union.user_id) AS staff_count,
          COALESCE(
            json_agg(
              json_build_object(
                'id',        u.id,
                'full_name', u.full_name,
                'role',      u.role,
                'email',     u.email
              )
            ) FILTER (WHERE staff_union.user_id IS NOT NULL),
            '[]'
          ) AS staff
        FROM departments d
        LEFT JOIN (
          ${doctorsPart}
          UNION ALL
          ${nursesPart}
        ) AS staff_union ON staff_union.department_id = d.id
        LEFT JOIN users u ON u.id = staff_union.user_id
        GROUP BY d.id, d.name_en, d.name_ar
        ORDER BY d.name_en ASC
      `);
    } else {
      departmentsQuery = Promise.resolve({ rows: [] }); // Fallback: no departments table yet
    }

    const [
      patientsCountRes,
      staffCountRes,
      pendingRequestsRes,
      securityLogsRes,
      shiftDistributionRes,
      departmentsRaw
    ] = await Promise.all([
      db('users').where({ role: 'patient' }).count('id as count').first(),
      db('users').whereIn('role', ['admin', 'doctor', 'nurse']).count('id as count').first(),
      db('staff_requests').where({ status: 'pending' }).count('id as count').first(),
      db('security_logs').where('created_at', '>=', db.raw("NOW() - INTERVAL '24 HOURS'")).count('id as count').first(),
      db('users')
        .select('assigned_shift')
        .count('id as count')
        .whereIn('role', ['admin', 'doctor', 'nurse'])
        .whereNotNull('assigned_shift')
        .groupBy('assigned_shift'),
      departmentsQuery
    ]);

    const patientsCount = parseInt(String((patientsCountRes as any)?.count || 0), 10);
    const staffCount = parseInt(String((staffCountRes as any)?.count || 0), 10);
    const pendingRequestsCount = parseInt(String((pendingRequestsRes as any)?.count || 0), 10);
    const securityLogsCount = parseInt(String((securityLogsRes as any)?.count || 0), 10);

    const shiftDistribution = shiftDistributionRes.map((row: any) => ({
      shift: row.assigned_shift,
      count: parseInt(String(row.count || 0), 10),
    }));

    // db.raw() returns { rows: [...] }; Knex builder returns array directly.
    const departmentsRes: any[] = hasDepartments
      ? ((departmentsRaw as any).rows ?? departmentsRaw)
      : [];

    const departments_breakdown = departmentsRes.map((dept: any) => ({
      id: dept.id,
      name_en: dept.name_en || dept.name || 'Unknown EN',
      name_ar: dept.name_ar || dept.name || 'Unknown AR',
      staff_count: parseInt(String(dept.staff_count || 0), 10),
      staff: typeof dept.staff === 'string' ? JSON.parse(dept.staff) : (dept.staff || [])
    }));

    res.status(200).json({
      status: 'success',
      data: {
        patientsCount,
        staffCount,
        pendingRequestsCount,
        securityLogsCount,
        shiftDistribution,
        departments_breakdown,
      },
    });
  } catch (dbError: any) {
    console.error('👉 [CRITICAL METRICS CRASH DETAILED]:', dbError.message, dbError.stack);
    res.status(500).json({ status: 'error', message: dbError.message, stack: dbError.stack });
  }
});
