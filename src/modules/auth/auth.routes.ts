import { Router } from 'express';
import { validate } from '../../common/middleware/validate';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changeEmailSchema,
  changePasswordSchema,
} from './auth.validation';
import * as authController from './controllers/auth.controller';
import { protect } from '../../common/middleware/auth';

const router = Router();

router.post('/signup', validate(signupSchema), authController.signup);

router.post('/login', validate(loginSchema), authController.login);

router.post('/refresh', authController.refresh);

router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

router.patch(
  '/reset-password/:token',
  validate(resetPasswordSchema),
  authController.resetPassword,
);

router.get('/verify-email/:token', authController.verifyNewEmail);

router.use(protect);

router.patch(
  '/change-email',
  validate(changeEmailSchema),
  authController.requestChangeEmail,
);

router.post('/logout', authController.logout);

router.patch(
  '/change-password',
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
