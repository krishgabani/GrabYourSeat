import stripe from 'stripe';
import prisma from '../configs/db.js';
import { inngest } from '../inngest/index.js';
import { clerkClient } from '@clerk/express';
import redis from '../configs/redis.js';

// Function to check availability of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showIdInt = parseInt(showId);

    // 1. Check Redis (Optimistic availability)
    try {
      const redisKeys = selectedSeats.map(seat => `seat:lock:${showIdInt}:${seat}`);
      if (redisKeys.length > 0) {
        // Check if ANY seat is already locked
        const locks = await redis.mget(redisKeys);
        if (locks.some(val => val !== null)) {
          return false;
        }
      }
    } catch (redisError) {
      console.error('Redis check failed, falling back to DB:', redisError.message);
      // Continue to DB check
    }

    // 2. Check Database (Source of Truth)
    // "Available" means no record exists for this seat number in this show
    const existingSeats = await prisma.seat.findMany({
      where: {
        showId: showIdInt,
        seatNumber: { in: selectedSeats }
      }
    });

    if (existingSeats.length > 0) {
      return false;
    }

    return true;
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
    const showIdInt = parseInt(showId);

    // 1. Acquire Redis Locks (Optimistic Locking)
    const locks = [];
    const lockDuration = 600; // 10 minutes

    // We try to acquire locks. If Redis is down, we proceed to DB transaction directly.
    try {
      let acquiredAll = true;

      for (const seat of selectedSeats) {
        const key = `seat:lock:${showIdInt}:${seat}`;
        // SETNX: Set if Not Exists
        const result = await redis.set(key, userId, 'EX', lockDuration, 'NX');
        if (result === 'OK') {
          locks.push(key);
        } else {
          acquiredAll = false;
          break;
        }
      }

      if (!acquiredAll) {
        // Rollback: Release locks acquired so far
        if (locks.length > 0) {
          await redis.del(locks);
        }
        return res.json({
          success: false,
          message: 'Selected seats are already locked by another user.',
        });
      }
    } catch (redisError) {
      console.error('Redis locking failed, proceeding with DB only:', redisError.message);
      // Do not return, proceed to DB. (Locks will be empty)
    }

    // 2. Get the show details (Verify show exists)
    const showData = await prisma.show.findUnique({
      where: { id: showIdInt },
      include: { movie: true },
    });

    if (!showData) {
      if (locks.length > 0) try { await redis.del(locks); } catch (e) { }
      return res.json({ success: false, message: 'Show not found.' });
    }

    // 3. Ensure user exists
    let existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
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
        console.error('Error fetching/creating user:', error);
        await redis.del(locks);
        return res.json({
          success: false,
          message: 'Unable to verify user. Please try again.',
        });
      }
    }

    // 4. Create Booking and Reserved Seats in Transaction
    let booking;
    try {
      booking = await prisma.$transaction(async (tx) => {
        // Create Booking
        const newBooking = await tx.booking.create({
          data: {
            userId,
            showId: showIdInt,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats, // Snapshot
          },
        });

        // Create Seat records (RESERVED)
        // This will fail if a seat is already taken (Unique Constraint)
        const seatData = selectedSeats.map(seatNumber => ({
          showId: showIdInt,
          seatNumber,
          bookingId: newBooking.id,
          status: 'RESERVED'
        }));

        await tx.seat.createMany({
          data: seatData
        });

        return newBooking;
      });
    } catch (dbError) {
      // If DB transaction fails (e.g. Unique constraint violation), release Redis locks
      console.error('Booking Transaction Failed:', dbError);
      await redis.del(locks);
      return res.json({ success: false, message: 'One or more seats are already booked.' });
    }

    // 5. Stripe Session
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
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

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: line_items,
      mode: 'payment',
      metadata: {
        bookingId: booking.id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      billing_address_collection: 'required',
    });

    // Update payment link
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentLink: session.url },
    });

    // 6. Schedule Payment Check (Inngest)
    await inngest.send({
      name: 'app/checkpayment',
      data: {
        bookingId: booking.id.toString(),
      },
    });

    res.json({ success: true, url: session.url });

  } catch (error) {
    console.error(error);
    // Cleanup if something unexpected happens at top level (unlikely given try/catch blocks)
    // Note: We don't have access to 'locks' here if it failed before definition, but main logic is wrapped.
    res.json({ success: false, message: error.message });
  }
};

// API to get all the Occupied Seats By ShowId
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showIdInt = parseInt(showId);

    const seats = await prisma.seat.findMany({
      where: { showId: showIdInt },
      select: { seatNumber: true }
    });

    const occupiedSeats = seats.map(s => s.seatNumber);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
