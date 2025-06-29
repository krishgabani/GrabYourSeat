import stripe from 'stripe';
import Booking from '../models/Booking.js';
import Show from '../models/Show.js';

// Function to check availability of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
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
    const showData = await Show.findById(showId).populate('movie');

    // Create booking
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    // reserve the seats for this user
    selectedSeats.map((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    // Mongoose might not detect deep changes inside objects unless we replace the whole object.
    // To force Mongoose to mark the occupiedSeats field as modified so it gets saved correctly when we call showData.save()
    showData.markModified('occupiedSeats');

    await showData.save();

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
        bookingId: booking._id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes      
      billing_address_collection: 'required'
    });

    // store paymentlink in database to pay later, incase of failure
    booking.paymentLink = session.url;

    await booking.save();

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

    const showData = await Show.findById(showId);

    const occupiedSeats = Object.keys(showData.occupiedSeats);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
