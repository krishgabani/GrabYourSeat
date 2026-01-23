import prisma from '../configs/db.js';

// API to check if user is admin
export const isAdmin = async (req, res) => {
  res.json({ success: true, isAdmin: true });
};

// API to get dashboard data
export const getDashboardData = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'PAID' },
    });
    const activeShows = await prisma.show.findMany({
      where: { showDateTime: { gte: new Date() } },
      include: { movie: true },
    });

    const totalUser = await prisma.user.count();

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
      activeShows,
      totalUser,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await prisma.show.findMany({
      where: { showDateTime: { gte: new Date() } },
      include: {
        movie: true,
        bookings: {
          where: { status: 'PAID' },
        },
      },
      orderBy: { showDateTime: 'asc' },
    });

    // Calculate occupied seats based strictly on PAID bookings
    const showsWithPaidStats = shows.map((show) => {
      const paidOccupiedSeats = {};

      show.bookings.forEach((booking) => {
        if (Array.isArray(booking.bookedSeats)) {
          booking.bookedSeats.forEach((seat) => {
            paidOccupiedSeats[seat] = booking.userId;
          });
        }
      });

      // Remove the bookings array from response to keep it clean
      // and override occupiedSeats with only paid seats
      const { bookings, ...showData } = show;
      return {
        ...showData,
        occupiedSeats: paidOccupiedSeats,
      };
    });

    res.json({ success: true, shows: showsWithPaidStats });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all bookings
export const getAllbookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { status: 'PAID' },
      include: {
        user: true,
        show: {
          include: { movie: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
