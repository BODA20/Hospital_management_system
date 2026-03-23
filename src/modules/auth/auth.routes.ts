import { Router } from 'express';
import { validate } from '../../common/middleware/validate';
import { loginSchema, signupSchema } from './auth.validation';
import * as authController from './controllers/auth.controller';
import { protect } from '../../common/middleware/auth';

const router = Router();

router.post('/signup', validate(signupSchema), authController.signup);

router.post('/login', validate(loginSchema), authController.login);

router.post('/refresh', authController.refresh);

router.post('/forgot-password', authController.forgotPassword);

router.patch('/reset-password/:token', authController.resetPassword);

router.get('/verify-email/:token', authController.verifyNewEmail);

router.use(protect);

router.patch('/change-email', authController.requestChangeEmail);

export default router;
