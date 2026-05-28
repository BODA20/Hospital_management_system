import type { Request, Response } from 'express';
import { stripeService } from './services/stripe.service';
import * as billingService from './services/billing.service';
import Stripe from 'stripe';
import logger from '../../common/utils/logger';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event: any;

  try {
    // req.body must be raw Buffer here! Express.raw() is required on the route.
    event = stripeService.verifyWebhookEvent(req.body, signature as string);
  } catch (err: any) {
    logger.error('Webhook signature verification failed', { error: err instanceof Error ? err.message : err });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const invoiceIdRaw = session.metadata?.invoice_id;

    if (invoiceIdRaw) {
      const invoiceId = parseInt(invoiceIdRaw, 10);
      try {
        await billingService.processPayment(invoiceId, 'card');
        logger.info(`Invoice #${invoiceId} marked as paid via Stripe Webhook.`);
      } catch (dbErr: any) {
        logger.error(`Failed to process payment for invoice #${invoiceId}`, { error: dbErr instanceof Error ? dbErr.message : dbErr });
        // We still return 200 to Stripe so it doesn't retry infinitely if this is a business logic error (e.g., already paid)
        return res.status(200).send('Payment acknowledged, but workflow threw an error.');
      }
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  return res.status(200).send('Received');
};
