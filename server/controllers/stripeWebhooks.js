import stripe from 'stripe';
import prisma from '../configs/db.js';
import { inngest } from '../inngest/index.js';

export const stripeWebhooks = async (req, res) => {
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { bookingId } = session.metadata;

        console.log('Processing payment for booking:', bookingId);

        await prisma.booking.update({
          where: { id: parseInt(bookingId) },
          data: {
            isPaid: true,
            paymentLink: '',
          },
        });

        // Set seats to BOOKED
        await prisma.seat.updateMany({
          where: { bookingId: parseInt(bookingId) },
          data: { status: 'BOOKED' }
        });

        console.log('Booking marked as paid:', bookingId);

        // Send Confirmation Email
        await inngest.send({
          name: 'app/show.booked',
          data: { bookingId },
        });

        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    console.error('Error details:', error.message);
    res.status(500).send('Internal Server Error');
  }
};
