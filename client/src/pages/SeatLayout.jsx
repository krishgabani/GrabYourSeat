import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRightIcon, ClockIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { assets } from '../assets/assets';
import { isoTimeFormat } from '../lib/dateTimeFormat';
import Loading from '../components/Loading';
import BlurCircle from '../components/BlurCircle';
import { useAppContext } from '../context/AppContext';

const SeatLayout = () => {
  const navigate = useNavigate();

  const { axios, getToken, user } = useAppContext();

  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [occupiedSeats, setoOccupiedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow(data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      return toast('Please select time first');
    }
    if (!selectedSeats.includes(seatId) && selectedSeats.length > 4) {
      return toast('You can only select 5 seats');
    }
    if (occupiedSeats.includes(seatId)) {
      return toast('This seat is already booked');
    }
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  // Dynamic seat count from selected time (fallback to 9 for backward compat)
  const seatsPerRow = selectedTime?.seatsPerRow || 9;

  const renderSeats = (row) => (
    <div key={row} className='flex gap-2 mt-2'>
      <div className='flex flex-wrap items-center justify-center gap-2'>
        {Array.from({ length: seatsPerRow }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded border border-primary/60 cursor-pointer ${selectedSeats.includes(seatId) && 'bg-primary text-white'
                } ${occupiedSeats.includes(seatId) && 'opacity-50'}`}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );

  const getOccupiedSeats = async () => {
    try {
      const { data } = await axios.get(
        `/api/booking/seats/${selectedTime.showId}`
      );
      if (data.success) {
        setoOccupiedSeats(data.occupiedSeats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const bookTickets = async () => {
    try {
      if (!user) {
        return toast.error('Please login to proceed');
      }
      if (!selectedTime || !selectedSeats.length) {
        return toast.error('Please select time and seats');
      }

      const { data } = await axios.post(
        '/api/booking/create',
        {
          showId: selectedTime.showId,
          selectedSeats,
        },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getShow();
  }, []);

  useEffect(() => {
    if (selectedTime) {
      setSelectedSeats([]);
      getOccupiedSeats();
    }
  }, [selectedTime]);

  return show ? (
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50'>
      <div className='w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30'>
        <p className='text-lg font-semibold px-6'>Available Timings</p>
        <div className='mt-5 space-y-1'>
          {show.dateTime[date].map((item) => (
            <div
              key={item.time}
              onClick={() => setSelectedTime(item)}
              className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${selectedTime?.time === item.time
                ? 'bg-primary text-white'
                : 'hover:bg-primary/20'
                }`}
            >
              <ClockIcon className='w-4 h-4' />
              <p className='text-sm'>{isoTimeFormat(item.time)}</p>
            </div>
          ))}
        </div>
      </div>
      <div className='relative flex-1 flex flex-col items-center max-md:mt-16'>
        <BlurCircle top='-100px' left='-100px' />
        <BlurCircle bottom='0' right='0' />
        <h1 className='text-xl font-semibold mb-6'>Select your seats</h1>

        {/* Screen Indicator */}
        <div className='flex flex-col items-center mb-8'>
          <div className='w-64 md:w-80 h-2 bg-gradient-to-r from-transparent via-primary/70 to-transparent rounded-full' />
          <p className='text-gray-500 text-xs mt-2 tracking-widest'>SCREEN</p>
        </div>

        {/* Seat Grid */}
        <div className='flex flex-col gap-2 items-center'>
          {(() => {
            const numRows = selectedTime?.rows || 10;
            const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, numRows).split('');

            return rowLabels.map((row) => (
              <div key={row} className='flex gap-2 items-center'>
                <span className='w-6 text-xs text-gray-500 text-right font-medium'>
                  {row}
                </span>
                <div className='flex gap-1.5'>
                  {Array.from({ length: seatsPerRow }, (_, i) => {
                    const seatId = `${row}${i + 1}`;
                    const isSelected = selectedSeats.includes(seatId);
                    const isOccupied = occupiedSeats.includes(seatId);

                    return (
                      <button
                        key={seatId}
                        onClick={() => handleSeatClick(seatId)}
                        disabled={isOccupied}
                        className={`w-8 h-8 rounded-t-lg border text-xs font-medium transition-all cursor-pointer
                          ${isSelected
                            ? 'bg-primary border-primary text-white scale-105'
                            : isOccupied
                              ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed opacity-50'
                              : 'bg-primary/10 border-primary/40 text-gray-400 hover:bg-primary/30 hover:border-primary/60'
                          }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <span className='w-6 text-xs text-gray-500 text-left font-medium'>
                  {row}
                </span>
              </div>
            ));
          })()}
        </div>

        {/* Legend */}
        <div className='flex gap-6 mt-8 text-xs'>
          <div className='flex items-center gap-2'>
            <div className='w-5 h-5 rounded-t-lg bg-primary/10 border border-primary/40' />
            <span className='text-gray-400'>Available</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-5 h-5 rounded-t-lg bg-primary border border-primary' />
            <span className='text-gray-400'>Selected</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-5 h-5 rounded-t-lg bg-gray-700 border border-gray-600 opacity-50' />
            <span className='text-gray-400'>Booked</span>
          </div>
        </div>

        {/* Selected Seats Summary */}
        {selectedSeats.length > 0 && (
          <div className='mt-6 px-4 py-3 bg-primary/10 border border-primary/30 rounded-lg'>
            <p className='text-sm text-gray-300'>
              <span className='text-primary font-semibold'>{selectedSeats.length}</span> seat(s) selected:
              <span className='text-white font-medium ml-1'>{selectedSeats.join(', ')}</span>
            </p>
          </div>
        )}

        <button
          onClick={bookTickets}
          className='flex items-center gap-2 mt-10 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95'
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className='w-4 h-4' />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
