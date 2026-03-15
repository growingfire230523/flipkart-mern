import WebFont from 'webfontloader';
import Footer from './components/Layouts/Footer/Footer';
import Header from './components/Layouts/Header/Header';
import Login from './components/User/Login';
import Register from './components/User/Register';
import { Routes, Route, useLocation } from 'react-router-dom';
import { loadUser } from './actions/userAction';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import UpdateProfile from './components/User/UpdateProfile';
import UpdatePassword from './components/User/UpdatePassword';
import ForgotPassword from './components/User/ForgotPassword';
import ResetPassword from './components/User/ResetPassword';
import Account from './components/User/Account';
import ManageAddresses from './components/User/ManageAddresses';
import ProtectedRoute from './Routes/ProtectedRoute';
import Home from './components/Home/Home';
import ProductDetails from './components/ProductDetails/ProductDetails';
import Products from './components/Products/Products';
import Cart from './components/Cart/Cart';
import Shipping from './components/Cart/Shipping';
import OrderConfirm from './components/Cart/OrderConfirm';
import Payment from './components/Cart/Payment';
import OrderStatus from './components/Cart/OrderStatus';
import OrderSuccess from './components/Cart/OrderSuccess';
import MyOrders from './components/Order/MyOrders';
import OrderDetails from './components/Order/OrderDetails';
import Dashboard from './components/Admin/Dashboard';
import MainData from './components/Admin/MainData';
import DealsConfig from './components/Admin/DealsConfig';
import BannersConfig from './components/Admin/BannersConfig';
import AdsConfig from './components/Admin/AdsConfig';
import MailList from './components/Admin/MailList';
import OrderTable from './components/Admin/OrderTable';
import UpdateOrder from './components/Admin/UpdateOrder';
import ProductTable from './components/Admin/ProductTable';
import NewProduct from './components/Admin/NewProduct';
import UpdateProduct from './components/Admin/UpdateProduct';
import UserTable from './components/Admin/UserTable';
import UpdateUser from './components/Admin/UpdateUser';
import ReviewsTable from './components/Admin/ReviewsTable';
import Wishlist from './components/Wishlist/Wishlist';
import NotFound from './components/NotFound';
import FloatingChat from './components/ChatBot/FloatingChat';
import FloatingMakeMyKit from './components/MakeMyKit/FloatingMakeMyKit';
import LexiRecommendations from './components/LexiRecommendations/LexiRecommendations';
import LexyCommunity from './components/LexyCommunity/LexyCommunity';
import Compare from './components/Compare/Compare';
import { BannerThemeProvider } from './context/BannerThemeContext';
import FragranceFinder from './components/FragranceFinder/FragranceFinder';

function App() {

  const dispatch = useDispatch();
  const location = useLocation();
  const { pathname } = location;
  const [headerOffsetPx, setHeaderOffsetPx] = useState(0);
  const showHeader = pathname !== '/lexi-recommendations';
  // const [stripeApiKey, setStripeApiKey] = useState("");

  // async function getStripeApiKey() {
  //   const { data } = await axios.get('/api/v1/stripeapikey');
  //   setStripeApiKey(data.stripeApiKey);
  // }

  useEffect(() => {
    WebFont.load({
      google: {
        families: ["Roboto:300,400,500,600,700", "Cormorant Garamond:300,400,500,600,700"]
      },
    });
  }, []);

  useEffect(() => {
    dispatch(loadUser());
    // getStripeApiKey();
  }, [dispatch]);

  // always scroll to top on route/path change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth"
    });
  }, [pathname])

  useLayoutEffect(() => {
    if (!showHeader) {
      setHeaderOffsetPx(0);
      return;
    }

    const headerEl = document.getElementById('site-header');
    if (!headerEl) {
      setHeaderOffsetPx(0);
      return;
    }

    const updateOffset = () => {
      const next = Math.max(0, Math.ceil(headerEl.getBoundingClientRect().height || 0));
      setHeaderOffsetPx(next);
    };

    updateOffset();

    let resizeObserver;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => updateOffset());
      resizeObserver.observe(headerEl);
    }

    window.addEventListener('resize', updateOffset);
    return () => {
      window.removeEventListener('resize', updateOffset);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [showHeader]);

  // (Right click / developer tools are intentionally left enabled.)
  
  return (
    <BannerThemeProvider>
      {showHeader ? <Header /> : null}
      <div style={{ paddingTop: showHeader ? `${headerOffsetPx}px` : 0 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:keyword" element={<Products />} />

            <Route path="/cart" element={<Cart />} />

            {/* order process */}
            <Route path="/shipping" element={
              <ProtectedRoute>
                <Shipping />
              </ProtectedRoute>
            } ></Route>

            <Route path="/order/confirm" element={
              <ProtectedRoute>
                <OrderConfirm />
              </ProtectedRoute>
            } ></Route>

            <Route path="/process/payment" element={
              <ProtectedRoute>
                {/* // stripeApiKey && ( */}
                {/* // <Elements stripe={loadStripe(stripeApiKey)}> */}
                <Payment />
                {/* // </Elements> */}
                {/* ) */}
              </ProtectedRoute>
            } ></Route>

            <Route path="/orders/success" element={<OrderSuccess success={true} />} />
            <Route path="/orders/failed" element={<OrderSuccess success={false} />} />
            {/* order process */}

            <Route path="/order/:id" element={
              <ProtectedRoute>
                <OrderStatus />
              </ProtectedRoute>
            } ></Route>

            <Route path="/orders" element={
              <ProtectedRoute>
                <MyOrders />
              </ProtectedRoute>
            }></Route>

            <Route path="/order_details/:id" element={
              <ProtectedRoute>
                <OrderDetails />
              </ProtectedRoute>
            }></Route>

            <Route path="/account" element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } ></Route>

            <Route path="/account/addresses" element={
              <ProtectedRoute>
                <ManageAddresses />
              </ProtectedRoute>
            } ></Route>

            <Route path="/account/update" element={
              <ProtectedRoute>
                <UpdateProfile />
              </ProtectedRoute>
            } ></Route>

            <Route path="/password/update" element={
              <ProtectedRoute>
                <UpdatePassword />
              </ProtectedRoute>
            } ></Route>

            <Route path="/password/forgot" element={<ForgotPassword />} />

            <Route path="/password/reset/:token" element={<ResetPassword />} />

            <Route path="/wishlist" element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            } ></Route>

            <Route path="/compare" element={<Compare />} />

            <Route path="/lexi-recommendations" element={<LexiRecommendations />} />

            <Route path="/lexi-community" element={<LexyCommunity />} />

            <Route path="/fragrance-finder" element={<FragranceFinder />} />

            <Route path="/admin/dashboard" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={0}>
                  <MainData />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/deals" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={1}>
                  <DealsConfig />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/banners" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={2}>
                  <BannersConfig />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/ads" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={3}>
                  <AdsConfig />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/orders" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={4}>
                  <OrderTable />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/order/:id" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={4}>
                  <UpdateOrder />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/products" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={5}>
                  <ProductTable />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/new_product" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={6}>
                  <NewProduct />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/product/:id" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={5}>
                  <UpdateProduct />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/users" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={7}>
                  <UserTable />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/user/:id" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={7}>
                  <UpdateUser />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/mail-list" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={8}>
                  <MailList />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="/admin/reviews" element={
              <ProtectedRoute isAdmin={true}>
                <Dashboard activeTab={9}>
                  <ReviewsTable />
                </Dashboard>
              </ProtectedRoute>
            } ></Route>

            <Route path="*" element={<NotFound />}></Route>

          </Routes>
        </motion.div>
      </AnimatePresence>
      <FloatingMakeMyKit />
      <FloatingChat />
      <Footer />
      </div>
    </BannerThemeProvider>
  );
}

export default App;
