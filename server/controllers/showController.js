import axios from 'axios';
import Movie from '../models/Movie.js';
import Show from '../models/Show.js';
import tmdbClient from '../lib/tmdbClient.js';

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

    let movie = await Movie.findById(movieId);

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
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || '',
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      // Add movie to the database
      movie = await Movie.create(movieDetails);
    }
    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice: showPrice,
          occupiedSeats: {},
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }
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
    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split('T')[0];
      if (!dateTime[date]) {
        dateTime[date] = [];
      }
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
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
          const { data } = await tmdbClient.get(`/movie/${movie._id}/videos`);

          const youtubeTrailer = data.results.find(
            (vid) => vid.site === 'YouTube' && vid.type === 'Trailer'
          );

          if (youtubeTrailer) {
            return {
              movieId: movie._id,
              title: movie.title,
              videoUrl: `https://www.youtube.com/watch?v=${youtubeTrailer.key}`,
              image: `https://img.youtube.com/vi/${youtubeTrailer.key}/maxresdefault.jpg`,
            };
          } else {
            return null; // Skip if no trailer
          }
        } catch (error) {
          console.error(
            `Error fetching trailer for movie ${movie._id}:`,
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
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate('movie')
      .sort({ showDateTime: 1 });

    // filter unique shows
    const uniqueShows = new Set(shows.map((show) => show.movie));
    return Array.from(uniqueShows);
  } catch (error) {
    console.error(error);
  }
};
