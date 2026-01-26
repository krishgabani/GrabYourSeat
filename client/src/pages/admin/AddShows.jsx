import { useEffect, useState } from 'react';
import { CheckIcon, DeleteIcon, StarIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { kConverter } from '../../lib/kConverter';
import Title from '../../components/admin/Title';
import Loading from '../../components/Loading';
import { useAppContext } from '../../context/AppContext';
import { time24To12 } from '../../lib/dateTimeFormat';

const AddShows = () => {
  const currency = import.meta.env.VITE_CURRENCY;

  const { axios, getToken, user, image_base_url } = useAppContext();

  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [showPrice, setShowPrice] = useState('');
  const [rows, setRows] = useState(10);
  const [seatsPerRow, setSeatsPerRow] = useState(9);
  const [addingShow, setAddingShow] = useState(false);

  const fetchNowPlayingMovies = async () => {
    try {
      const { data } = await axios.get('/api/show/now-playing', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setNowPlayingMovies(data.movies);
      }
    } catch (error) {
      toast.error('Failed to load now playing movies');
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split('T');
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      const times = prev[date] || [];
      if (!times.includes(time)) {
        return { ...prev, [date]: [...times, time] };
      }
      return prev;
    });
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filteredTimes = prev[date].filter((t) => t !== time);
      if (filteredTimes.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [date]: filteredTimes,
      };
    });
  };

  const handleSubmit = async () => {
    try {
      setAddingShow(true);

      if (
        !selectedMovie ||
        Object.keys(dateTimeSelection).length === 0 ||
        !showPrice
      ) {
        return toast('Missing required fields');
      }

      const showsInput = Object.entries(dateTimeSelection).flatMap(
        ([date, times]) =>
          times.map((time) => {
            const [year, month, day] = date.split('-').map(Number);
            const [hour, minute] = time.split(':').map(Number);

            // Construct Date object in local timezone
            const showDateTime = new Date(year, month - 1, day, hour, minute);

            return { showDateTime };
          })
      );
      
      const payload = {
        movieId: selectedMovie,
        showsInput,
        showPrice: Number(showPrice),
        rows: Number(rows),
        seatsPerRow: Number(seatsPerRow),
      };

      const { data } = await axios.post('/api/show/add', payload, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        toast.success(data.message);
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice('');
        setRows(10);
        setSeatsPerRow(9);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log('Error while adding the show: ' + error);
      toast.error('An error occurred. Please try again');
    }
    setAddingShow(false);
  };

  useEffect(() => {
    if (user) {
      fetchNowPlayingMovies();
    }
  }, [user]);

  return nowPlayingMovies.length > 0 ? (
    <>
      <Title text1='Add' text2='Shows' highlight={2} />
      <p className='mt-10 text-lg font-medium'>Now Playing Movies</p>
      <div className='overflow-x-auto pb-4'>
        <div className='group flex flex-wrap gap-4 mt-4 w-max'>
          {nowPlayingMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie.id)}
              className={`relative max-w-40 cursor-pointer group-hover:not-hover:opacity-40 hover:-translate-y-1 transition duration-300 `}
            >
              <div className='relative rounded-lg overflow-hidden'>
                <img
                  src={image_base_url + movie.poster_path}
                  alt=''
                  className='w-full object-cover brightness-90'
                />
                <div className='text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0'>
                  <p className='flex items-center gap-1 text-gray-400'>
                    <StarIcon className='w-4 h-4 text-primary fill-primary' />
                    {movie.vote_average.toFixed(1)}
                  </p>
                  <p className='text-gray-300'>
                    {kConverter(movie.vote_count)} Votes
                  </p>
                </div>
              </div>
              {selectedMovie === movie.id && (
                <div className='absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded'>
                  <CheckIcon className='w-4 h-4 text-white' strokeWidth={2.5} />
                </div>
              )}
              <p className='font-medium truncate'>{movie.title}</p>
              <p className='text-gray-400 text-sm'>{movie.release_date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className='mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8'>

        {/* LEFT PANEL */}
        <div className='lg:col-span-1 space-y-6'>

          {/* Show Price */}
          <div className='bg-white/5 border border-white/10 rounded-xl p-5'>
            <label className='block text-sm font-medium mb-2'>Show Price</label>
            <div className='flex items-center gap-3 border border-primary/30 bg-primary/5 px-4 py-3 rounded-lg'>
              <p className='text-gray-400 text-sm'>{currency}</p>
              <input
                min={0}
                type='number'
                value={showPrice}
                onChange={(e) => setShowPrice(e.target.value)}
                placeholder='Enter show price'
                className='bg-transparent outline-none w-full'
              />
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className='bg-white/5 border border-white/10 rounded-xl p-5'>
            <label className='block text-sm font-medium mb-3'>
              Select Date & Time
            </label>
            <div className='flex gap-3'>
              <input
                type='datetime-local'
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
                className='bg-black/30 rounded-lg px-3 py-2 w-full'
              />
              <button
                onClick={handleDateTimeAdd}
                className='bg-primary/80 text-white px-4 rounded-lg hover:bg-primary'
              >
                Add
              </button>
            </div>

            {/* Display Selected Time */}

            {Object.keys(dateTimeSelection).length > 0 && (
              <div className='mt-6'>
                <ul className='space-y-3'>
                  {Object.entries(dateTimeSelection).map(([date, times]) => (
                    <li key={date}>
                      <div className='font-medium'>{date}</div>
                      <div className='flex flex-wrap gap-2 mt-1 text-sm'>
                        {times.map((time) => (
                          <div
                            key={time}
                            className='border border-primary px-2 py-1 flex items-center rounded'
                          >
                            <span>{time24To12(time)}</span>
                            <DeleteIcon
                              onClick={() => handleRemoveTime(date, time)}
                              width={15}
                              className='ml-2 text-red-500 hover:text-red-700 cursor-pointer'
                            />
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Add Show Button */}
          <button
            onClick={handleSubmit}
            disabled={addingShow}
            className='w-full py-3 bg-primary text-white rounded-xl shadow-lg hover:bg-primary/90 cursor-pointer'
          >
            Add Show
          </button>
        </div>

        {/* RIGHT PANEL - SEAT BUILDER */}
        <div className='lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6'>
          <h3 className='text-sm font-medium mb-4'>Seat Layout</h3>

          {/* Sliders */}
          <div className='grid md:grid-cols-2 gap-6'>
            <div>
              <div className='flex justify-between mb-2'>
                <label className='text-sm text-gray-400'>Rows (Front to Back)</label>
                <span className='text-primary font-semibold'>{rows}</span>
              </div>
              <input
                type='range'
                min={1}
                max={20}
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value))}
                className='w-full accent-primary'
              />
            </div>

            <div>
              <div className='flex justify-between mb-2'>
                <label className='text-sm text-gray-400'>Seats per Row</label>
                <span className='text-primary font-semibold'>{seatsPerRow}</span>
              </div>
              <input
                type='range'
                min={1}
                max={20}
                value={seatsPerRow}
                onChange={(e) => setSeatsPerRow(parseInt(e.target.value))}
                className='w-full accent-primary'
              />
            </div>
          </div>

          {/* Stats */}
          <div className='grid grid-cols-2 gap-4 mt-6'>
            <div className='bg-black/30 rounded-lg p-4 text-center'>
              <p className='text-xs text-gray-500'>Total Seats</p>
              <p className='text-2xl font-bold'>{rows * seatsPerRow}</p>
            </div>
            <div className='bg-black/30 rounded-lg p-4 text-center'>
              <p className='text-xs text-gray-500'>Layout</p>
              <p className='text-2xl font-bold'>{rows} × {seatsPerRow}</p>
            </div>
          </div>

          {/* Live Preview */}
          <div className='mt-6'>
            <p className='text-center text-sm text-gray-400 mb-4'>Live Preview</p>
            <div className='flex flex-col items-center mb-4'>
              <div className='w-56 h-2 bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-full' />
              <p className='text-xs text-gray-500 mt-1'>SCREEN</p>
            </div>

            <div className='flex flex-col items-center gap-2 overflow-x-auto'>
              {Array.from({ length: rows }, (_, rowIdx) => (
                <div key={rowIdx} className='flex gap-1.5'>
                  {Array.from({ length: seatsPerRow }, (_, seatIdx) => (
                    <div
                      key={seatIdx}
                      className='w-6 h-6 rounded-t-md border border-primary/40 bg-primary/20 text-[9px] flex items-center justify-center'
                    >
                      {seatIdx + 1}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default AddShows;
