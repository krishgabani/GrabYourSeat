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

        // 1. Fetch Booking to check status
        const booking = await prisma.booking.findUnique({
          where: { id: parseInt(bookingId) },
        });

        if (!booking) {
          console.error(`Booking ${bookingId} not found!`);
          break;
        }

        // 2. Check for Expiration (Race Condition: Job ran before payment arrived)
        if (booking.status === 'EXPIRED') {
          console.warn(`Booking ${bookingId} is EXPIRED. Initiating refund...`);
          try {
            if (session.payment_intent) {
              await stripeInstance.refunds.create({
                payment_intent: session.payment_intent,
              });
              console.log(`Refund initiated for booking ${bookingId}`);
            } else {
              console.error(`No payment_intent found for session ${session.id}, cannot refund automatically.`);
            }
          } catch (refundError) {
            console.error('Refund failed:', refundError);
          }
          break; // Exit, do not mark as paid
        }

        // 3. Mark as PAID (Atomic Transaction)
        // We only proceed if status is NOT EXPIRED (e.g. PENDING)
        try {
          await prisma.$transaction(async (tx) => {
            // Update Booking
            await tx.booking.update({
              where: { id: parseInt(bookingId) },
              data: {
                isPaid: true,
                status: 'PAID',
                paymentLink: '',
              },
            });

            // Update Seats to BOOKED
            await tx.seat.updateMany({
              where: { bookingId: parseInt(bookingId) },
              data: { status: 'BOOKED' }
            });
          });

          console.log('Booking marked as paid:', bookingId);

          // Send Confirmation Email
          await inngest.send({
            name: 'app/show.booked',
            data: { bookingId },
          });

        } catch (txError) {
          console.error('Transaction failed for booking confirmation:', txError);
        }

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
