import { useEffect } from 'react';
import CategoryNavBar from '../Layouts/CategoryNavBar';
import Banner from './Banner/Banner';
import FlashDeal from './FlashDeal/FlashDeal';
import DealSlider from './DealSlider/DealSlider';
import ProductSlider from './ProductSlider/ProductSlider';
import HomeHighlightBanner from './HomeHighlightBanner/HomeHighlightBanner';
import NewInSection from './NewInSection/NewInSection';
import DealOfDaySection from './DealOfDaySection/DealOfDaySection';
import TopRatedProducts from './TopRatedProducts/TopRatedProducts';
import BestSellerProducts from './BestSellerProducts/BestSellerProducts';
import MakeupCollection from './MakeupCollection/MakeupCollection';
import MakeupPromoBanner from './MakeupPromoBanner/MakeupPromoBanner';
import PerfumePromoBanner from './PerfumePromoBanner/PerfumePromoBanner';
import PerfumeCollection from './PerfumeCollection/PerfumeCollection';
import SkinCarePromoBanner from './SkinCarePromoBanner/SkinCarePromoBanner';
import SkinCareCollection from './SkinCareCollection/SkinCareCollection';
import AiPoweredServices from './AiPoweredServices/AiPoweredServices';
import AchievementsCarousel from './AchievementsCarousel/AchievementsCarousel';
import VirtualTryOnTeaser from './VirtualTryOnTeaser/VirtualTryOnTeaser';
import RecentActivitySlider from './RecentActivity/RecentActivitySlider';
import { useDispatch, useSelector } from 'react-redux';
import { clearErrors, getSliderProducts } from '../../actions/productAction';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';

const Home = () => {

  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const { error, loading } = useSelector((state) => state.products);

  useEffect(() => {
    if (error) {
      enqueueSnackbar(error, { variant: "error" });
      dispatch(clearErrors());
    }
    dispatch(getSliderProducts());
  }, [dispatch, error, enqueueSnackbar]);

  return (
    <>
      <MetaData title="We're Milaari!" />
      <main className="flex flex-col gap-3 px-2 mt-3">
        <CategoryNavBar />
        <Banner />
        <FlashDeal />
        <DealSlider title={"Discounts for You"} />
        {!loading && <ProductSlider title={"Suggested for You"} tagline={null} />}
        <HomeHighlightBanner />
        <DealSlider title={"Top Brands, Best Price"} />
        {!loading && <ProductSlider title={"You May Also Like..."} tagline={"Based on Your Interest"} />}
        {!loading && <DealOfDaySection />}
        {!loading && <NewInSection />}
        {!loading && <TopRatedProducts />}
        {!loading && <BestSellerProducts />}
        <DealSlider title={"Top Offers On"} />
        {!loading && <ProductSlider title={"Don't Miss These!"} tagline={"Inspired by your order"} />}
        {!loading && <MakeupPromoBanner />}
        {!loading && <MakeupCollection />}
        {!loading && <PerfumePromoBanner />}
        {!loading && <PerfumeCollection />}
        {!loading && <SkinCarePromoBanner />}
        {!loading && <SkinCareCollection />}
        <RecentActivitySlider mode="viewed" />
        <RecentActivitySlider mode="ordered" />
        <AiPoweredServices />
        <AchievementsCarousel />
        <VirtualTryOnTeaser />
      </main>
    </>
  );
};

export default Home;
