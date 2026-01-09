import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarIcon, ClockIcon } from 'lucide-react';
import { assets } from '../assets/assets';
import { timeFormat } from '../lib/dateTimeFormat';
import { useAppContext } from '../context/AppContext';
import Loading from '../components/Loading';

const HeroSection = () => {
  const navigate = useNavigate();
  const { shows, image_base_url } = useAppContext();

  const [heroMovie, setHeroMovie] = useState(null);

  useEffect(() => {
    if (shows.length > 0) {
      const selected = shows[Math.floor(Math.random() * shows.length)];
      setHeroMovie(selected);
    }
  }, [shows]);

  if (!heroMovie) return <Loading />;

  const genres = heroMovie.genres?.slice(0, 3).map((g) => g.name).join(' | ') || '';
  const trimWords = (text, wordLimit) => {
    const words = text.split(' ');
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(' ') + '...'
      : text;
  };

  return (
    <div
      className='flex flex-col items-start justify-center gap-4 px-6 md:px-16 lg:px-36 bg-cover bg-center h-screen'
      style={{
        backgroundImage: `url(${image_base_url + heroMovie.backdropPath})`,
      }}
    >
      {/* Overlay */}
      <div className='absolute inset-0 bg-black/40 z-0'></div>

      {/* Content  */}
      <div className='relative z-10 flex flex-col items-start justify-center gap-4'>
        <h1 className='text-5xl md:text-[70px] md:leading-18 font-semibold max-w-110'>
          {heroMovie.title}
        </h1>

        <div className='flex items-center gap-4 text-gray-300'>
          <span>{genres}</span>

          <div className='flex items-center gap-1'>
            <CalendarIcon className='w-4.5 h-4.5' />{' '}
            {new Date(heroMovie.release_date).getFullYear()}
          </div>

          <div className='flex items-center gap-1'>
            <ClockIcon className='w-4.5 h-4.5' />{' '}
            {timeFormat(heroMovie.runtime)}
          </div>
        </div>
        <p className='max-w-md text-gray-300'>
          {trimWords(heroMovie.overview, 35)}
        </p>

        <button
          className='flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer'
          onClick={() => navigate('/movies')}
        >
          Explore Movies
          <ArrowRight className='w-5 h-5' />
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
