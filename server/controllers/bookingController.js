import stripe from 'stripe';
import prisma from '../configs/db.js';
import { inngest } from '../inngest/index.js';
import { clerkClient } from '@clerk/express';

// Function to check availability of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await prisma.show.findUnique({
      where: { id: showId },
    });
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats;

    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

    return !isAnySeatTaken;
  } catch (error) {
    console.error(error);
    return false;
  }
};

// API to create a booking
export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    // Check if seat is available for the selected show
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);

    if (!isAvailable) {
      return res.json({
        success: false,
        message: 'Selected Seats are not available.',
      });
    }

    // Get the show details
    const showData = await prisma.show.findUnique({
      where: { id: showId },
      include: { movie: true },
    });

    // Ensure user exists in database (in case Clerk webhook hasn't synced yet)
    let existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      // User doesn't exist yet, fetch from Clerk and create
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        existingUser = await prisma.user.create({
          data: {
            id: userId,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
            email: clerkUser.emailAddresses[0]?.emailAddress || 'no-email@example.com',
            image: clerkUser.imageUrl || '',
          },
        });
      } catch (error) {
        console.error('Error fetching user from Clerk:', error);
        return res.json({
          success: false,
          message: 'Unable to verify user. Please try again.',
        });
      }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        showId,
        amount: showData.showPrice * selectedSeats.length,
        bookedSeats: selectedSeats,
      },
    });

    // reserve the seats for this user
    const updatedOccupiedSeats = { ...showData.occupiedSeats };
    selectedSeats.forEach((seat) => {
      updatedOccupiedSeats[seat] = userId;
    });

    await prisma.show.update({
      where: { id: showId },
      data: { occupiedSeats: updatedOccupiedSeats },
    });

    // Stripe
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    // Create Line items fo stripe
    const line_items = [
      {
        price_data: {
          currency: 'inr',
          product_data: {
            name: showData.movie.title,
          },
          unit_amount: Math.floor(booking.amount) * 100,
        },
        quantity: 1,
      },
    ];

    // Session
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: line_items,
      mode: 'payment',
      metadata: {
        bookingId: booking.id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes
      billing_address_collection: 'required',
    });

    // store paymentlink in database to pay later, incase of failure
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentLink: session.url },
    });

    // Run Inngest Scheduler Function to check payment status after 10 minutes
    await inngest.send({
      name: 'app/checkpayment',
      data: {
        bookingId: booking.id.toString(),
      },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all the Occupied Seats By ShowId
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    const showData = await prisma.show.findUnique({
      where: { id: parseInt(showId) },
    });

    const occupiedSeats = Object.keys(showData.occupiedSeats);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
