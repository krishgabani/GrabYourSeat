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
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
