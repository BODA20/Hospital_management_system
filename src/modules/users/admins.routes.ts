import { Router } from 'express';
import { protect, restrictTo } from '../../common/middleware/auth';
import db from '../../config/db';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { logAuditEvent } from '../audit/services/audit.service';

const router = Router();

// Protect and restrict to admin only
router.use(protect, restrictTo('admin'));

/**
 * GET /api/v1/admins/staff
 * Optimized query to return all staff users (admin, doctor, nurse)
 */
router.get(
  '/staff',
  asyncHandler(async (req, res) => {
    try {
      const staff = await db('users')
        .select('id', 'full_name', 'email', 'role', 'phone', 'assigned_shift')
        .whereIn('role', ['admin', 'doctor', 'nurse']);

      res.status(200).json({
        status: 'success',
        results: staff.length,
        data: staff,
      });
    } catch (err: any) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve staff parameters.',
        error: err.message,
      });
    }
  }),
);

/**
 * PUT /api/v1/admins/assign-department
 * Assigns a doctor or nurse to a department and logs the activity.
 */
router.put(
  '/assign-department',
  asyncHandler(async (req, res) => {
    try {
      const { doctor_id, department_id } = req.body;

      if (!doctor_id) {
        res.status(400).json({ status: 'fail', message: 'Staff user ID (doctor_id) is required.' });
        return;
      }

      if (!department_id) {
        res.status(400).json({ status: 'fail', message: 'Valid Department ID is required.' });
        return;
      }

      const user = await db('users').where({ id: doctor_id }).first();
      if (!user) {
        res.status(404).json({ status: 'fail', message: 'User not found.' });
        return;
      }

      // Check if department exists to prevent foreign key violations
      const deptExists = await db('departments').where({ id: department_id }).first();
      if (!deptExists) {
        res.status(404).json({ status: 'fail', message: 'Department not found.' });
        return;
      }

      const adminUser = req.user as any;
      const adminId = adminUser?.id || 1;
      const actorName = adminUser?.full_name ?? adminUser?.email ?? 'Admin';
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

      await db.transaction(async (trx) => {
        // Removed update on users table since department_id belongs to doctors/nurses only

        if (user.role === 'doctor') {
          const doc = await trx('doctors').where({ user_id: doctor_id }).first();
          if (doc) {
            await trx('doctors').where({ user_id: doctor_id }).update({ department_id });
          } else {
            // Upsert / Insert
            await trx('doctors').insert({
              user_id: doctor_id,
              specialization: 'General',
              years_of_experience: 0,
              bio: '',
              consultation_fee: 0,
              department_id
            });
          }
        } else if (user.role === 'nurse') {
          const nurse = await trx('nurses').where({ user_id: doctor_id }).first();
          const userShift = (user as any).assigned_shift ? String((user as any).assigned_shift).toLowerCase() : 'morning';
          const cleanShift: 'morning' | 'evening' | 'night' = userShift.includes('night') ? 'night' : userShift.includes('evening') ? 'evening' : 'morning';
          if (nurse) {
            await trx('nurses').where({ user_id: doctor_id }).update({ department_id, shift: cleanShift });
          } else {
            // Upsert / Insert
            await trx('nurses').insert({
              user_id: doctor_id,
              department_id,
              shift: cleanShift,
              years_of_experience: 0,
              notes: ''
            });
          }
        }

        const staffName = (user as any).full_name || (user as any).name || user.email || `ID ${doctor_id}`;
        const deptName = deptExists.name_en || `ID ${department_id}`;
        const cleanDescription = `Admin assigned Staff member ${staffName} (ID: ${doctor_id}, Role: ${user.role}) to Department ${deptName} (ID: ${department_id}).`;

        // Native transaction-bound audit log insert
        await trx('security_logs').insert({
          user_id: adminId,
          actor_name: actorName,
          action_type: 'STAFF_ASSIGNED_TO_DEPARTMENT',
          description: cleanDescription,
          ip_address: clientIp
        });
      });

      res.status(200).json({
        status: 'success',
        message: 'Staff member department updated successfully.'
      });
    } catch (err: any) {
      console.error('CRITICAL ERROR in assign-department:', err);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error while assigning department.',
        error: err.message
      });
    }
  })
);

import bcrypt from 'bcrypt';

/**
 * POST /api/v1/admins/staff/create
 * POST /api/v1/admin/staff/create
 * Direct staff user account creation by Admin
 */
router.post(
  '/staff/create',
  asyncHandler(async (req, res) => {
    try {
      const {
        full_name,
        email,
        phone,
        role,
        department_id,
        specialization,
        assigned_shift,
        password,
      } = req.body;

      if (!full_name || !email || !role) {
        res.status(400).json({ status: 'fail', message: 'Full name, email, and role are required.' });
        return;
      }

      const validRoles = ['doctor', 'nurse', 'receptionist', 'admin'];
      const targetRole = String(role).toLowerCase();
      if (!validRoles.includes(targetRole)) {
        res.status(400).json({ status: 'fail', message: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
        return;
      }

      const rawShift = String(assigned_shift || 'Morning').toLowerCase();
      const userShift: 'Morning' | 'Night' = rawShift.includes('night') ? 'Night' : 'Morning';
      const nurseShift: 'morning' | 'evening' | 'night' = rawShift.includes('night') ? 'night' : rawShift.includes('evening') ? 'evening' : 'morning';

      const tempPassword = password || 'StaffTemp123!';
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const adminUser = req.user as any;
      const adminId = adminUser?.id || 1;
      const actorName = adminUser?.full_name ?? adminUser?.email ?? 'Admin';
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

      const result = await db.transaction(async (trx) => {
        // Check existing user by email or phone
        const existing = await (trx('users') as any)
          .where('email', email.toLowerCase().trim())
          .orWhere(function (this: any) {
            if (phone) this.where('phone', phone.trim());
          })
          .first();

        let userId: number;
        let createdOrUpdatedUser: any;

        if (existing) {
          // Promote existing user to staff
          const updates: any = {
            full_name: full_name.trim(),
            role: targetRole,
            is_active: true,
            is_verified: true,
            assigned_shift: userShift,
          };
          if (password) {
            updates.password_hash = passwordHash;
          }
          if (phone) updates.phone = phone.trim();

          const [updated] = await (trx('users') as any)
            .where({ id: existing.id })
            .update(updates)
            .returning(['id', 'full_name', 'email', 'role', 'phone', 'assigned_shift', 'is_active', 'is_verified']);

          userId = Number(existing.id);
          createdOrUpdatedUser = updated;
        } else {
          // Insert new staff user
          const [newUser] = await (trx('users') as any)
            .insert({
              full_name: full_name.trim(),
              email: email.toLowerCase().trim(),
              phone: phone ? phone.trim() : null,
              password_hash: passwordHash,
              role: targetRole,
              is_active: true,
              is_verified: true,
              assigned_shift: userShift,
            })
            .returning(['id', 'full_name', 'email', 'role', 'phone', 'assigned_shift', 'is_active', 'is_verified']);

          userId = Number(newUser.id);
          createdOrUpdatedUser = newUser;
        }

        // Auto-provision profile
        if (targetRole === 'doctor') {
          const doc = await trx('doctors').where({ user_id: userId }).first();
          if (doc) {
            await trx('doctors').where({ user_id: userId }).update({
              department_id: department_id ? Number(department_id) : doc.department_id,
              specialization: specialization || doc.specialization || 'General',
            });
          } else {
            await trx('doctors').insert({
              user_id: userId,
              department_id: department_id ? Number(department_id) : null,
              specialization: specialization || 'General',
              years_of_experience: 0,
              bio: '',
              consultation_fee: 0,
            });
          }
        } else if (targetRole === 'nurse') {
          const nurse = await trx('nurses').where({ user_id: userId }).first();
          if (nurse) {
            await trx('nurses').where({ user_id: userId }).update({
              department_id: department_id ? Number(department_id) : nurse.department_id,
              shift: nurseShift,
            });
          } else {
            await trx('nurses').insert({
              user_id: userId,
              department_id: department_id ? Number(department_id) : null,
              shift: nurseShift,
              years_of_experience: 0,
              notes: '',
            });
          }
        }

        // Log audit trail
        await trx('security_logs').insert({
          user_id: adminId,
          actor_name: actorName,
          action_type: 'STAFF_CREATED',
          description: `Admin directly created staff account for ${full_name} (Role: ${targetRole}, Shift: ${userShift}, Email: ${email}).`,
          ip_address: clientIp,
        });

        return createdOrUpdatedUser;
      });

      res.status(201).json({
        status: 'success',
        message: 'Staff account created successfully.',
        data: result,
      });
    } catch (err: any) {
      console.error('CRITICAL ERROR in create staff account:', err);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error while creating staff account.',
        error: err.message,
      });
    }
  }),
);

export default router;
