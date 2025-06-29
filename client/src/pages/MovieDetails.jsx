import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, PlayCircleIcon, StarIcon, XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactPlayer from 'react-player';
import BlurCircle from '../components/BlurCircle';
import { timeFormat } from '../lib/dateTimeFormat';
import DateSelect from '../components/DateSelect';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';

const MovieDetails = () => {
  const navigate = useNavigate();
  const modalRef = useRef();
  const { id } = useParams();
  const [show, setShow] = useState(null);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [trailerData, setTrailerData] = useState(null);

  const {
    shows,
    axios,
    getToken,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
    image_base_url,
  } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);

      if (data.success) {
        setShow(data);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log('Error while fetching movie details: ' + error);
      toast.error('Failed to load movie details. Please try again.');
    }
  };

  const handleFavorite = async () => {
    try {
      if (!user) return toast.error('Please login to proceed');

      const { data } = await axios.post(
        '/api/user/update-favorite',
        { movieId: id },
        {
          headers: { Authorization: `Bearer ${await getToken()}` },
        }
      );

      if (data.success) {
        await fetchFavoriteMovies();
        toast.success(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchTrailer = async () => {
    try {
      const { data } = await axios.get(`/api/show/trailer/${id}`);
      if (data.success) {
        setTrailerData(data.trailer);
        setShowTrailerModal(true);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch trailer.');
    }
  };

  useEffect(() => {
    getShow();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowTrailerModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return show ? (
    <>
      <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>
        <div className='flex flex-col md:flex-row gap-8 max-w-6x1 mx-auto'>
          <img
            src={image_base_url + show.movie.poster_path}
            alt=''
            className='max-md:mx-auto rounded-x1 h-104 max-w-70 object-cover'
          />
          <div className='relative flex flex-col gap-3'>
            <BlurCircle top='-100px' left='-100px' />
            <p className='text-primary'>ENGLISH</p>
            <h1 className='text-4x1 font-semibold max-w-96 text-balance'>
              {show.movie.title}
            </h1>
            <div className='flex items-center gap-2 text-gray-300'>
              <StarIcon className='w-5 h-5 text-primary fill-primary' />
              {show.movie.vote_average.toFixed(1)} User Rating
            </div>
            <p className='text-gray-400 mt-2 text-sm leading-tight max-w-x1'>
              {show.movie.overview}
            </p>
            <p>
              {timeFormat(show.movie.runtime)} •{' '}
              {show.movie.genres.map((genre) => genre.name).join(', ')} •{' '}
              {show.movie.release_date.split('-')[0]}
            </p>

            <div className='flex items-center flex-wrap gap-4 mt-4'>
              <button
                className='flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95'
                onClick={handleWatchTrailer}
              >
                <PlayCircleIcon className='w-5 h-5' />
                Watch Trailer
              </button>
              <a
                href='#dateSelect'
                className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95'
              >
                Buy Tickets
              </a>
              <button
                onClick={handleFavorite}
                className='bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95'
              >
                <Heart
                  className={`w-5 h-5 ${
                    favoriteMovies.find((movie) => movie._id === id)
                      ? 'fill-primary text-primary'
                      : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        <p className='text-lg font-medium mt-20'>Your Favorite Cast</p>
        <div className='overflow-x-auto no-scrollbar mt-8 pb-4'>
          <div className='flex items-center gap-4 w-max px-4'>
            {show.movie.casts.slice(0, 12).map((cast, index) => (
              <div
                key={index}
                className='flex flex-col items-center text-center'
              >
                <img
                  src={image_base_url + cast.profile_path}
                  alt=''
                  className='rounded-full h-20 md:h-20 aspect-square object-cover'
                />
                <p className='font-medium text-xs mt-3'>{cast.name}</p>
              </div>
            ))}
          </div>
        </div>
        <DateSelect dateTime={show.dateTime} id={id} />
        <p className='text-1g font-medium mt-20 mb-8'>You May Also Like</p>
        <div className='flex flex-wrap max- x-sm:justify-center gap-8'>
          {shows
            .slice(0, 4)
            .map(
              (movie, index) =>
                movie._id !== show.movie._id && (
                  <MovieCard key={index} movie={movie} />
                )
            )}
        </div>
        <div className='flex justify-center mt-20'>
          <button
            onClick={() => {
              navigate('/movies');
              scrollTo(0, 0);
            }}
            className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer'
          >
            Show more
          </button>
        </div>
      </div>

      {/* Trailer Popup  */}
      {showTrailerModal && (
        <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center'>
          <div
            ref={modalRef}
            className='relative w-[90vw] max-w-4xl bg-black rounded-lg p-4'
          >
            <button
              className='absolute top-2 right-2 text-white p-1 rounded hover:bg-white/10'
              onClick={() => setShowTrailerModal(false)}
            >
              <XIcon className='w-6 h-6 cursor-pointer' />
            </button>
            <ReactPlayer
              url={trailerData?.videoUrl}
              controls
              playing
              width='100%'
              height='500px'
              className='rounded-md'
            />
          </div>
        </div>
      )}
    </>
  ) : (
    <Loading />
  );
};

export default MovieDetails;
