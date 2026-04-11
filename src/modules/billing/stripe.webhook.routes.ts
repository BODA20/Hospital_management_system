import { Router } from 'express';
import { handleStripeWebhook } from './stripe.webhook.controller';

export const stripeWebhookRouter = Router();

// This route specifically skips the top-level app.use(express.json()) interceptor
// because it is mapped *above* it in app.ts using express.raw()
stripeWebhookRouter.post('/', handleStripeWebhook);
