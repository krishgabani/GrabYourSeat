import axios from 'axios';
import Booking from '../models/Booking.js';
import Show from '../models/Show.js';

// Function to check availability of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const occupiedSeats = Show.occupiedSeats;

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

    res.json({ success: true, message: 'Booked successfully' });
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
