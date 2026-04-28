import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Stripe Secret Key is missing in .env file');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any, // Best practice is to lock API version
});

export const stripeService = {
  async createCheckoutSession(invoice_id: number, amount: number) {
    if (!stripeSecretKey) {
      throw new Error('Stripe is not configured on this server.');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice #${invoice_id}`,
            },
            // Stripe accepts amounts in cents
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice_id.toString(),
      },
      success_url: process.env.STRIPE_SUCCESS_URL || `http://localhost:3000/api/v1/billing/invoices/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.STRIPE_CANCEL_URL || `http://localhost:3000/api/v1/billing/invoices/cancel`,
    });

    return session;
  },

  verifyWebhookEvent(rawBody: string | Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret is not configured.');
    }
    
    // This securely verifies the signature and returns the parsed event
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  },
};
