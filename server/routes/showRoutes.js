import express from 'express';
import {
  addShow,
  getNowPlayingMovies,
  getShow,
  getShows,
  getTrailer,
  getTrailers,
} from '../controllers/showController.js';
import { protectAdmin } from '../middleware/auth.js';

const showRouter = express.Router();

showRouter.get('/now-playing', protectAdmin, getNowPlayingMovies);
showRouter.post('/add', protectAdmin, addShow);
showRouter.get('/all', getShows);
showRouter.get('/trailers', getTrailers);
showRouter.get('/trailer/:movieId', getTrailer);
showRouter.get('/:movieId', getShow);

export default showRouter;
