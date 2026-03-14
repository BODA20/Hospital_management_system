import { Router } from 'express';
import { validate } from '../../common/middleware/validate';
import * as usersController from './user.controller';
import {
  createUserSchema,
  updateUserSchema,
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

// router.post(
//   '/',
//   restrictTo('admin'),
//   validate(createUserSchema),
//   usersController.createUser,
// );

router.patch(
  '/:id',
  restrictTo('admin'),
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema),
  usersController.updateUser,
);

router.delete(
  '/:id',
  restrictTo('admin'),
  validate(userIdParamSchema, 'params'),
  usersController.deactivateUser,
);

export default router;
