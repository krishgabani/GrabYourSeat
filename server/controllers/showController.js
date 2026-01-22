import axios from 'axios';
import prisma from '../configs/db.js';
import tmdbClient from '../lib/tmdbClient.js';
import { inngest } from '../inngest/index.js';

// API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await tmdbClient.get('/movie/now_playing');
    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to add a new show to the database
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    // Convert movieId to string to match Prisma schema
    const movieIdStr = String(movieId);

    let movie = await prisma.movie.findUnique({
      where: { id: movieIdStr },
    });

    if (!movie) {
      // Fetch movie details and credits from TMDB API
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        tmdbClient.get(`/movie/${movieId}`),
        tmdbClient.get(`/movie/${movieId}/credits`),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      // Extract meaningfull data
      const movieDetails = {
        id: movieIdStr,
        title: movieApiData.title,
        overview: movieApiData.overview,
        posterPath: movieApiData.poster_path,
        backdropPath: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        releaseDate: movieApiData.release_date,
        originalLanguage: movieApiData.original_language,
        tagline: movieApiData.tagline || '',
        voteAverage: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      // Add movie to the database
      movie = await prisma.movie.create({
        data: movieDetails,
      });
    }
    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movieId: movieIdStr,
          showDateTime: new Date(dateTimeString),
          showPrice: showPrice,
          // occupiedSeats: {}, // Removed
        });
      });
    });

    if (showsToCreate.length > 0) {
      await prisma.show.createMany({
        data: showsToCreate,
      });
    }

    // Trigger inngest event to send notifications
    await inngest.send({
      name: 'app/show.added',
      data: {
        movieTitle: movie.title,
      },
    });

    res.json({ success: true, message: 'Show added successfully' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all shows from the database
export const getShows = async (req, res) => {
  try {
    const shows = await getUniquePlayingShows();
    res.json({ success: true, shows });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get a single shows from the database
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    // get all upcoming shows for the movie
    const shows = await prisma.show.findMany({
      where: {
        movieId: movieId,
        showDateTime: { gte: new Date() },
      },
    });

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split('T')[0];
      if (!dateTime[date]) {
        dateTime[date] = [];
      }
      dateTime[date].push({ time: show.showDateTime, showId: show.id });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get trailers of all shows
export const getTrailers = async (req, res) => {
  try {
    const shows = await getUniquePlayingShows();

    // Fetch trailers from TMDB for each unique movie
    const trailers = await Promise.all(
      shows.map(async (movie) => {
        try {
          const { data } = await tmdbClient.get(`/movie/${movie.id}/videos`);

          const youtubeTrailer = data.results.find(
            (vid) => vid.site === 'YouTube' && vid.type === 'Trailer'
          );

          if (youtubeTrailer) {
            return {
              movieId: movie.id,
              title: movie.title,
              videoUrl: `https://www.youtube.com/watch?v=${youtubeTrailer.key}`,
              image: `https://img.youtube.com/vi/${youtubeTrailer.key}/maxresdefault.jpg`,
            };
          } else {
            return null; // Skip if no trailer
          }
        } catch (error) {
          console.error(
            `Error fetching trailer for movie ${movie.id}:`,
            error.message
          );
          return null;
        }
      })
    );

    // Filter out nulls
    const filteredTrailers = trailers.filter(Boolean);
    res.json({ success: true, trailers: filteredTrailers });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get trailer of movie
export const getTrailer = async (req, res) => {
  try {
    const { movieId } = req.params;

    const { data } = await tmdbClient.get(`/movie/${movieId}/videos`);

    const youtubeTrailer = data.results.find(
      (vid) => vid.site === 'YouTube' && vid.type === 'Trailer'
    );

    if (youtubeTrailer) {
      const trailer = {
        movieId: movieId,
        videoUrl: `https://www.youtube.com/watch?v=${youtubeTrailer.key}`,
        image: `https://img.youtube.com/vi/${youtubeTrailer.key}/maxresdefault.jpg`,
      };
      res.json({ success: true, trailer });
    } else {
      res.json({ success: false, message: 'Trailer not available.' });
    }
  } catch (error) {
    console.error('Error fetching trailer: ', error.message);
    res.json({ success: false, message: error.message });
  }
};

// Function to get Unique shows
const getUniquePlayingShows = async () => {
  try {
    const shows = await prisma.show.findMany({
      where: {
        showDateTime: { gte: new Date() },
      },
      include: { movie: true },
      orderBy: { showDateTime: 'asc' },
    });

    // filter unique shows
    const uniqueMovies = new Map();
    shows.forEach((show) => {
      if (!uniqueMovies.has(show.movie.id)) {
        uniqueMovies.set(show.movie.id, show.movie);
      }
    });
    return Array.from(uniqueMovies.values());
  } catch (error) {
    console.error(error);
  }
};
