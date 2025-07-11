import { useEffect, useState } from 'react';
import { PlayCircleIcon } from 'lucide-react';
import ReactPlayer from 'react-player';
import BlurCircle from './BlurCircle';
import { useAppContext } from '../context/AppContext';

const TrailersSection = () => {
  const { axios } = useAppContext();

  const [trailers, setTrailers] = useState([]);
  const [currentTrailer, setCurrentTrailer] = useState();

  const fetchTrailers = async () => {
    try {
      const { data } = await axios.get(`/api/show/trailers`);
      if (data.success) {
        setTrailers(data.trailers);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchTrailers();
  }, []);

  useEffect(() => {
    setCurrentTrailer(trailers[0]);
  }, [trailers]);

  return (
    <div className='px-6 md:px-16 1g:px-24 x1:px-44 py-20 overflow-hidden'>
      <p className='text-gray-300 font-medium text-lg max-w-[960px] mx-auto'>
        Trailers
      </p>
      {trailers.length === 0 ? (
        <p className='text-center text-gray-400 mt-6'>No trailers available</p>
      ) : (
        <>
          <div className='relative mt-6'>
            <BlurCircle top='-100px' right='-100px' />
            <ReactPlayer
              url={currentTrailer?.videoUrl}
              light={currentTrailer?.image}
              controls={true}
              className='mx-auto max-w-full'
              width='960px'
              height='540px'
            />
          </div>
          <div className='group grid grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto'>
            {trailers.map((trailer) => (
              <div
                key={trailer.movieId}
                className='relative group-hover:not-hover:opacity-50 hover:-translate-y-1 duration-300 transition max-md:h-60 md:max-h-60 cursor-pointer'
                onClick={() => setCurrentTrailer(trailer)}
              >
                <img
                  src={trailer.image}
                  alt='trailer'
                  className='rounded-lg w-full h-full object-cover brightness-75'
                />
                <PlayCircleIcon
                  strokeWidth={1.6}
                  className='absolute top-1/2 left-1/2 w-5 md:w-8 h-5 md:h-12 transform - translate-x-1/2 -translate-y-1/2'
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TrailersSection;
