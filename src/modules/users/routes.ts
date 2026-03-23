import { Router } from 'express';
import { validate } from '../../common/middleware/validate';
import * as usersController from './controllers/user.controller';
import {
  createUserSchema,
  updateProfileSchema,
  userIdParamSchema,
} from './users.validation';

import { protect, restrictTo } from '../../common/middleware/auth';

const router = Router();

router.use(protect);

router.get('/', restrictTo('admin'), usersController.getUsers);

router.get(
  '/:id',
  restrictTo('admin'),
  validate(userIdParamSchema, 'params'),
  usersController.getUser,
);
router.patch(
  '/me',
  validate(updateProfileSchema),
  usersController.updateProfile,
);

router.delete(
  '/:id',
  restrictTo('admin'),
  validate(userIdParamSchema, 'params'),
  usersController.deactivateUser,
);

export default router;
