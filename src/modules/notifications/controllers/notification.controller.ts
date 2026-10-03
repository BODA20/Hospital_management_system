import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import * as service from '../services/notification.service';
import { appError } from '../../../common/errors/AppError';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await service.getNotifications(req.user.id);
  res.json({
    status: 'success',
    data: notifications,
  });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getUnreadCount(req.user.id);
  res.json({
    status: 'success',
    data: result,
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new appError('Invalid notification ID', 400);

  const notification = await service.markAsRead(id, req.user.id);
  if (!notification) {
    throw new appError('Notification not found or unauthorized', 404);
  }

  res.json({
    status: 'success',
    data: notification,
  });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await service.markAllAsRead(req.user.id);
  res.json({
    status: 'success',
    message: 'All notifications marked as read',
  });
});

// Server-Sent Events (SSE) Endpoint
export const streamNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;

  // Set necessary headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send an initial connected message
  res.write('data: {"type": "connected"}\\n\\n');

  const onNotification = (notification: any) => {
    res.write(`data: ${JSON.stringify(notification)}\\n\\n`);
  };

  // Listen to global event emitter for this specific user
  service.notificationEmitter.on(`user:${userId}`, onNotification);

  // Clean up listener when client disconnects
  req.on('close', () => {
    service.notificationEmitter.off(`user:${userId}`, onNotification);
  });
});
