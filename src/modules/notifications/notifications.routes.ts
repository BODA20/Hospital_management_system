import express from 'express';
import * as controller from './controllers/notification.controller';
import { protect } from '../../common/middleware/auth';

export const notificationsRouter = express.Router();

// All notification routes require authentication
notificationsRouter.use(protect);

notificationsRouter.get('/', controller.getNotifications);
notificationsRouter.get('/unread-count', controller.getUnreadCount);
notificationsRouter.patch('/read-all', controller.markAllAsRead);
notificationsRouter.patch('/:id/read', controller.markAsRead);

// Server-Sent Events stream for real-time notifications
notificationsRouter.get('/stream', controller.streamNotifications);
