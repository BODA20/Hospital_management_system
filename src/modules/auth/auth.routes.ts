import { Router } from 'express';
import rateLimit from 'express-rate-limit'; 
import { validate } from '../../common/middleware/validate';
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changeEmailSchema,
  changePasswordSchema,
  refreshSchema,
} from './auth.validation';
import * as authController from './controllers/auth.controller';
import { protect } from '../../common/middleware/auth';

const router = Router();


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: { 
    status: 'fail', 
    message: 'Too many attempts, please try again after 15 minutes.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/refresh', validate(refreshSchema), authController.refresh);

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