import { Link } from 'react-router-dom';
import { assets } from '../../assets/assets';

const Navbar = () => {
  return (
    <div className='flex items-center justify-start px-6 md:px-10 h-16 border-b border-gray-300/30'>
      <Link to='/' />
      <img src={assets.logo} alt='logo' className='w-36 h-auto cursor-pointer' />
      <Link />
    </div>
  );
};

export default Navbar;
