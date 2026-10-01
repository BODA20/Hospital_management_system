import { Router } from 'express';
import { protect, restrictTo } from '../../common/middleware/auth';
import db from '../../config/db';
import { asyncHandler } from '../../common/utils/asyncHandler';

const router = Router();

router.patch(
  '/',
  protect,
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const { userId, user_id, shift } = req.body;
    const targetUserId = userId || user_id;

    if (!targetUserId) {
      res.status(400).json({ status: 'fail', message: 'User ID is required.' });
      return;
    }

    if (!shift || !['Morning', 'Night', 'morning', 'night'].includes(shift)) {
      res.status(400).json({ status: 'fail', message: 'Valid shift (Morning or Night) is required.' });
      return;
    }

    const normalizedUserShift = shift.charAt(0).toUpperCase() + shift.slice(1).toLowerCase(); // 'Morning' or 'Night'
    const normalizedNurseShift = shift.toLowerCase(); // 'morning' or 'night'

    const user = await (db('users') as any).where({ id: targetUserId }).first();
    if (!user) {
      res.status(404).json({ status: 'fail', message: 'User not found.' });
      return;
    }

    await db.transaction(async (trx) => {
      // 1. Update user table
      await (trx('users') as any).where({ id: targetUserId }).update({ assigned_shift: normalizedUserShift });

      // 2. Update nurse table if role is nurse
      if (user.role === 'nurse') {
        const nurse = await trx('nurses').where({ user_id: targetUserId }).first();
        if (nurse) {
          await trx('nurses').where({ user_id: targetUserId }).update({ shift: normalizedNurseShift });
        } else {
          await trx('nurses').insert({
            user_id: targetUserId,
            shift: normalizedNurseShift,
            years_of_experience: 0,
            notes: ''
          });
        }
      }

      // 3. Log audit event
      const adminUser = req.user as any;
      const adminId = adminUser?.id || 1;
      const actorName = adminUser?.full_name ?? adminUser?.email ?? 'Admin';
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
      const staffName = user.full_name || user.email || `ID ${targetUserId}`;

      await trx('security_logs').insert({
        user_id: adminId,
        actor_name: actorName,
        action_type: 'ROLE_CHANGED',
        description: `Admin reassigned staff member ${staffName} (ID: ${targetUserId}) to ${normalizedUserShift} Shift.`,
        ip_address: clientIp
      });
    });

    res.status(200).json({
      status: 'success',
      message: `Staff member shift reassigned to ${normalizedUserShift} successfully.`
    });
  })
);

export default router;
