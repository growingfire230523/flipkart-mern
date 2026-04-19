import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Searchbar from './Searchbar';
import logo from '../../../assets/images/Milaari.png';
import whatsappIcon from '../../../assets/images/WA.png';
import PrimaryDropDownMenu from './PrimaryDropDownMenu';
import DeliveryLocationPopup from './DeliveryLocationPopup';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactComponent as StarLogo } from '../../../assets/images/star-06.svg';
import { useSnackbar } from 'notistack';
import { logoutUser } from '../../../actions/userAction';

const Header = () => {

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { isAuthenticated, user } = useSelector((state) => state.user);

  const { cartItems } = useSelector(state => state.cart);

  const [togglePrimaryDropDown, setTogglePrimaryDropDown] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryTriggerRef = useRef(null);
  const primaryMenuRef = useRef(null);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
    enqueueSnackbar('Logout Successfully', { variant: 'success' });
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const onPointerDown = (e) => {
      const target = e.target;

      if (togglePrimaryDropDown) {
        const clickedPrimary =
          (primaryTriggerRef.current && primaryTriggerRef.current.contains(target)) ||
          (primaryMenuRef.current && primaryMenuRef.current.contains(target));

        if (!clickedPrimary) setTogglePrimaryDropDown(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, true);
    };
  }, [togglePrimaryDropDown]);

  const iconLinkClassName = (isActive) =>
    `flex items-center ${isActive ? 'text-white' : 'text-white hover:text-white/80'}`;

  const defaultAddress = user?.defaultShippingAddress || null;
  const hasAddress = !!(defaultAddress && Object.values(defaultAddress).some((v) => v && String(v).trim().length > 0));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated || !user?._id) return;
    if (defaultAddress && Object.keys(defaultAddress).length > 0) return;

    const key = `lexy:deliveryLocationPromptShown:${user._id}`;
    if (window.localStorage.getItem(key) === 'true') return;

    const timer = window.setTimeout(() => {
      setLocationModalOpen(true);
      try {
        window.localStorage.setItem(key, 'true');
      } catch {
        // ignore storage errors
      }
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, user?._id, defaultAddress]);


  return (
  <header id="site-header" className="bg-[#875c43] fixed top-0 py-2.5 w-full z-10 border-b border-gray-600">

      {/* <!-- navbar container --> */}
      <div className="w-full sm:w-9/12 px-2 sm:px-4 m-auto flex justify-between items-center relative gap-2 sm:gap-0">

        {/* <!-- logo & search container --> */}
        <div className="flex items-center flex-1 min-w-0 gap-2 sm:gap-5">
          <Link className="h-6 sm:h-8 shrink-0 flex items-center" to="/">
            <img
              draggable="false"
              className="h-full w-auto max-w-[100px] sm:max-w-[190px] object-contain"
              src={logo}
              alt="MILAARI Logo"
            />
          </Link>

          <Searchbar />
        </div>
        {/* <!-- logo & search container --> */}

        {/* <!-- right navs --> */}
        <div className="flex items-center shrink-0 ml-2 sm:ml-5 gap-1.5 sm:gap-5 relative">

          {/* Mobile: hamburger menu trigger */}
          <button
            type="button"
            className="flex sm:hidden items-center text-white px-1"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <MenuIcon />
          </button>

          {/* Desktop: login / account dropdown trigger */}
          {isAuthenticated === false ? (
            <Link
              to="/login"
              className="hidden sm:inline-flex px-3 sm:px-9 py-0.5 text-primary-darkBlue bg-white border border-white/30 font-medium font-brandSerif rounded-sm cursor-pointer hover:bg-white/90"
            >
              Login
            </Link>
          ) : (
            <span
              ref={primaryTriggerRef}
              className="userDropDown hidden sm:flex items-center text-white font-medium font-brandSerif gap-1 cursor-pointer"
              onClick={() => {
                setTogglePrimaryDropDown((v) => !v);
              }}
            >
              {user?.name ? user.name.split(" ", 1) : 'Account'}
              <span>{togglePrimaryDropDown ? <ExpandLessIcon sx={{ fontSize: "16px" }} /> : <ExpandMoreIcon sx={{ fontSize: "16px" }} />}</span>
            </span>
          )}

          <div ref={primaryMenuRef}>
            <PrimaryDropDownMenu open={togglePrimaryDropDown} setTogglePrimaryDropDown={setTogglePrimaryDropDown} user={user} />
          </div>

          <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/fragrance-finder"
                aria-label="Find My Fragrance"
                title="Find My Fragrance"
                className="text-white hover:text-white/80 font-medium font-brandSerif text-sm"
              >
                Find My Fragrance
              </Link>

            <Link
              to="/compare"
              aria-label="Compare"
              title="Compare"
              className={iconLinkClassName(location.pathname === '/compare')}
            >
              <CompareArrowsIcon />
            </Link>

            <Link
              to="/lexi-recommendations"
              aria-label="MILAARI Recommendations"
              title="MILAARI Recommendations"
              className={iconLinkClassName(location.pathname === '/lexi-recommendations')}
            >
              <StarLogo className="w-5 h-5" aria-hidden="true" focusable="false" />
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-3 sm:gap-4">
            <Link to="/cart" aria-label="Cart" title="Cart" className="flex items-center text-white relative">
              <span><ShoppingCartIcon /></span>
              {cartItems.length > 0 &&
                <div className="w-5 h-5 p-2 bg-red-500 text-xs rounded-full absolute -top-2 left-3 flex justify-center items-center border">
                  {cartItems.length}
                </div>
              }
            </Link>

            <a
              href={process.env.REACT_APP_LEXI_WHATSAPP_URL || 'https://wa.me'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with MILAARI on WhatsApp"
              title="Chat with MILAARI on WhatsApp"
              className="flex items-center"
            >
              <img src={whatsappIcon} alt="WhatsApp" className="w-5 h-5" />
            </a>
          </div>

          {isAuthenticated && (
            <div
              className="hidden sm:flex flex-col items-end ml-2 text-white cursor-pointer select-none max-w-[230px]"
              onClick={() => setLocationModalOpen(true)}
            >
              {hasAddress && (
                <span className="text-[9px] uppercase tracking-[0.14em] opacity-80 leading-tight">
                  Delivering to
                </span>
              )}
              <span
                className={`text-[13px] leading-tight truncate font-brandSerif ${
                  hasAddress ? '' : 'opacity-90 hover:opacity-100 underline-offset-2 hover:underline'
                }`}
              >
                {hasAddress
                  ? (defaultAddress.address || defaultAddress.city || defaultAddress.pincode || '')
                  : 'Set Address'}
              </span>
            </div>
          )}
        </div>
        {/* <!-- right navs --> */}

      </div>
      {/* <!-- navbar container --> */}

      {/* Mobile sidebar menu */}
      <div
        className={
          `fixed inset-0 z-20 sm:hidden transform-gpu transition-opacity duration-300 ease-out ` +
          (mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
        }
        aria-hidden={!mobileMenuOpen}
      >
          <div
            className={
              'absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out ' +
              (mobileMenuOpen ? 'opacity-100' : 'opacity-0')
            }
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className={
              'relative h-full w-72 max-w-[80%] bg-[#714530] text-white shadow-2xl transform-gpu transition-transform duration-300 ease-out ' +
              (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full')
            }
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-brandSerif text-lg">MILAARI Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-1"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="px-4 py-3 space-y-2 text-sm overflow-y-auto h-[calc(100%-3rem)]">
              {isAuthenticated ? (
                <>
                  <div className="text-xs uppercase tracking-wide opacity-80 mb-2">
                    Hi, {user?.name ? user.name.split(' ', 1) : 'there'}
                  </div>
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 border-b border-white/10"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 border-b border-white/10"
                  >
                    Orders
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 border-b border-white/10"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 border-b border-white/10"
                  >
                    Wishlist
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full text-left py-2 border-b border-white/10"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 border-b border-white/10"
                >
                  Login / Sign up
                </Link>
              )}

              <div className="pt-3 text-xs uppercase tracking-wide opacity-80">Explore</div>
              <Link
                to="/fragrance-finder"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 border-b border-white/10"
              >
                Find My Fragrance
              </Link>
              <Link
                to="/compare"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 border-b border-white/10"
              >
                Compare Products
              </Link>
              <Link
                to="/lexi-recommendations"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 border-b border-white/10"
              >
                MILAARI Recommendations
              </Link>

              <div className="pt-3 text-xs uppercase tracking-wide opacity-80">Shopping</div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLocationModalOpen(true);
                }}
                className="block w-full text-left py-2 border-b border-white/10"
              >
                Delivery location
              </button>
              <Link
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 border-b border-white/10"
              >
                Cart
              </Link>
            </div>
          </div>
        </div>

      {isAuthenticated && (
        <DeliveryLocationPopup
          open={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          initialAddress={defaultAddress}
        />
      )}
    </header>
  )
};

export default Header;
