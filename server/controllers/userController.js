import { clerkClient } from '@clerk/express';
import prisma from '../configs/db.js';

// API to get user bookings
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const bookings = await prisma.booking.findMany({
      where: { 
        userId, 
        status: { not: 'EXPIRED' } 
      },
      include: {
        show: {
          include: {
            movie: true,
          },
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

// API to update favorite movie
export const updateFavorite = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const { movieId } = req.body;
    const user = await clerkClient.users.getUser(userId);

    if (!user.privateMetadata.favorites) {
      user.privateMetadata.favorites = [];
    }

    if (!user.privateMetadata.favorites.includes(movieId)) {
      user.privateMetadata.favorites.push(movieId);
    } else {
      user.privateMetadata.favorites = user.privateMetadata.favorites.filter(
        (item) => item !== movieId
      );
    }

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: user.privateMetadata,
    });

    res.json({ success: true, message: 'Favorite movies updated.' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get favorite movies

export const getFavorites = async (req, res) => {
  try {
    const userId = req.auth().userId;
    const user = await clerkClient.users.getUser(userId);

    const favorites = user.privateMetadata.favorites;

    const movies = await prisma.movie.findMany({
      where: {
        id: { in: favorites },
      },
    });

    res.json({ success: true, movies });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
