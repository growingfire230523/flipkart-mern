import { useSnackbar } from 'notistack';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Slider from 'react-slick';
import { clearErrors, getProductDetails, getSimilarProducts, newReview } from '../../actions/productAction';
import { NextBtn, PreviousBtn } from '../Home/Banner/Banner';
import ProductSlider from '../Home/ProductSlider/ProductSlider';
import Loader from '../Layouts/Loader';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import StarIcon from '@mui/icons-material/Star';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CachedIcon from '@mui/icons-material/Cached';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import { NEW_REVIEW_RESET } from '../../constants/productConstants';
import { addItemsToCart } from '../../actions/cartAction';
import { getDeliveryDate, getDiscount } from '../../utils/functions';
import { addToWishlist, removeFromWishlist } from '../../actions/wishlistAction';
import { addToCompare, removeFromCompare } from '../../actions/compareAction';
import MetaData from '../Layouts/MetaData';
import { addRecentlyViewedItem, getActiveUserId } from '../../utils/cartStorage';
import { AnimatePresence, motion } from 'framer-motion';

const normalizeHex = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const v = raw.startsWith('#') ? raw : `#${raw}`;
    const hex = v.toUpperCase();
    if (/^#[0-9A-F]{3}$/.test(hex) || /^#[0-9A-F]{6}$/.test(hex)) return hex;
    return '';
};

const ProductDetails = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const params = useParams();
    const navigate = useNavigate();

    // reviews toggle
    const [open, setOpen] = useState(false);
    const [viewAll, setViewAll] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const { product, loading, error } = useSelector((state) => state.productDetails);
    const { success, error: reviewError } = useSelector((state) => state.newReview);
    const { products: similarProducts } = useSelector((state) => state.products);
    const { cartItems } = useSelector((state) => state.cart);
    const { wishlistItems } = useSelector((state) => state.wishlist);
    const { compareItems } = useSelector((state) => state.compare);

    const [selectedVariantValue, setSelectedVariantValue] = useState('');
    const [marketingOpen, setMarketingOpen] = useState(true);

    const settings = {
        autoplay: true,
        autoplaySpeed: 2000,
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        prevArrow: <PreviousBtn />,
        nextArrow: <NextBtn />,
    };

    const productId = params.id;
    const itemInWishlist = wishlistItems.some((i) => i.product === productId);
    const itemInCompare = compareItems?.some((i) => i.product === productId);

    const addToWishlistHandler = () => {
        if (itemInWishlist) {
            dispatch(removeFromWishlist(productId));
            enqueueSnackbar("Remove From Wishlist", { variant: "success" });
        } else {
            dispatch(addToWishlist(productId));
            enqueueSnackbar("Added To Wishlist", { variant: "success" });
        }
    }

    const reviewSubmitHandler = () => {
        if (rating === 0 || !comment.trim()) {
            enqueueSnackbar("Empty Review", { variant: "error" });
            return;
        }
        const formData = new FormData();
        formData.set("rating", rating);
        formData.set("comment", comment);
        formData.set("productId", productId);
        dispatch(newReview(formData));
        setOpen(false);
    }

    const normalizedSizeOptions = Array.isArray(product?.sizeVariants)
        ? product.sizeVariants
            .map((v) => ({
                value: String(v?.size || '').trim(),
                price: Number(v?.price),
                cuttedPrice: Number(v?.cuttedPrice),
                stock: Number(v?.stock),
            }))
            .filter((v) => v.value && Number.isFinite(v.price))
        : [];

    const normalizedColorOptions = Array.isArray(product?.colorVariants)
        ? product.colorVariants
            .map((v) => ({
                value: normalizeHex(v?.hex),
                name: String(v?.name || '').trim(),
                hex: normalizeHex(v?.hex),
                price: Number(v?.price),
                cuttedPrice: Number(v?.cuttedPrice),
                stock: Number(v?.stock),
            }))
            .filter((v) => v.name && v.hex && Number.isFinite(v.price))
        : [];

    const normalizedVolumeOptions = Array.isArray(product?.volumeVariants)
        ? product.volumeVariants
            .map((v) => ({
                value: String(v?.volume || '').trim(),
                price: Number(v?.price),
                cuttedPrice: Number(v?.cuttedPrice),
                stock: Number(v?.stock),
            }))
            .filter((v) => v.value && Number.isFinite(v.price))
        : [];

    const variantType = normalizedColorOptions.length > 0
        ? 'color'
        : normalizedSizeOptions.length > 0
            ? 'size'
            : normalizedVolumeOptions.length > 0
                ? 'volume'
                : null;
    const variantLabel = variantType === 'color' ? 'Shade' : variantType === 'size' ? 'Size' : variantType === 'volume' ? 'Volume' : '';
    const variantOptions = variantType === 'color'
        ? normalizedColorOptions
        : variantType === 'size'
            ? normalizedSizeOptions
            : variantType === 'volume'
                ? normalizedVolumeOptions
                : [];

    useEffect(() => {
        if (variantOptions.length <= 0) {
            setSelectedVariantValue('');
            return;
        }

        if (!selectedVariantValue) {
            setSelectedVariantValue(variantOptions[0].value);
            return;
        }

        const stillExists = variantOptions.some((v) => v.value === selectedVariantValue);
        if (!stillExists) setSelectedVariantValue(variantOptions[0].value);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?._id, product?.colorVariants, product?.sizeVariants, product?.volumeVariants]);

    const selectedVariant = variantOptions.find((v) => v.value === selectedVariantValue) || (variantOptions[0] || null);
    const displayPrice = selectedVariant ? selectedVariant.price : product.price;
    const displayCuttedPrice = selectedVariant ? (selectedVariant.cuttedPrice || selectedVariant.price) : product.cuttedPrice;
    const displayStock = selectedVariant ? (Number.isFinite(selectedVariant.stock) ? selectedVariant.stock : product.stock) : product.stock;

    const addToCartHandler = () => {
        const opts = !selectedVariant
            ? undefined
            : variantType === 'color'
                ? { color: { name: selectedVariant.name, hex: selectedVariant.hex } }
                : variantType === 'size'
                    ? { size: selectedVariant.value }
                    : variantType === 'volume'
                        ? { volume: selectedVariant.value }
                        : undefined;

        dispatch(addItemsToCart(productId, 1, opts));
        enqueueSnackbar("Product Added To Cart", { variant: "success" });
    }

    const addToCompareHandler = async () => {
        if (itemInCompare) {
            dispatch(removeFromCompare(productId));
            enqueueSnackbar("Removed From Compare", { variant: "success" });
            return;
        }

        const willReplace = (compareItems?.length || 0) >= 2;
        const nextCount = Math.min(2, (compareItems?.length || 0) + 1);
        await dispatch(addToCompare(productId));
        enqueueSnackbar(willReplace ? "Comparison list updated" : "Added To Compare", { variant: "success" });

        if (nextCount === 2) {
            navigate('/compare');
        }
    }

    const handleDialogClose = () => {
        setOpen(!open);
    }

    const itemInCart = cartItems.some((i) => {
        if (i.product !== productId) return false;
        if (!selectedVariant) return true;
        if (variantType === 'color') return String(i.colorHex || '').toUpperCase() === String(selectedVariant.hex || '').toUpperCase();
        if (variantType === 'size') return String(i.size || '') === String(selectedVariant.value || '');
        if (variantType === 'volume') return String(i.volume || '') === String(selectedVariant.value || '');
        return true;
    });

    const goToCart = () => {
        navigate('/cart');
    }

    const buyNow = () => {
        addToCartHandler();
        navigate('/shipping');
    }

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (reviewError) {
            enqueueSnackbar(reviewError, { variant: "error" });
            dispatch(clearErrors());
        }
        if (success) {
            enqueueSnackbar("Review Submitted Successfully", { variant: "success" });
            dispatch({ type: NEW_REVIEW_RESET });
        }
        dispatch(getProductDetails(productId));
        // eslint-disable-next-line
    }, [dispatch, productId, error, reviewError, success, enqueueSnackbar]);

    useEffect(() => {
        if (!product || !product._id) return;

        const userId = getActiveUserId();

        const summary = {
            _id: product._id,
            name: product.name,
            images: product.images,
            ratings: product.ratings,
            orderCount: product.orderCount,
            price: product.price,
            cuttedPrice: product.cuttedPrice,
            volumeVariants: product.volumeVariants,
            sizeVariants: product.sizeVariants,
            isColorProduct: product.isColorProduct,
            colorVariants: product.colorVariants,
            isGiftable: product.isGiftable,
        };

        addRecentlyViewedItem(userId, summary);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?._id]);

    useEffect(() => {
        dispatch(getSimilarProducts(product?.category));
    }, [dispatch, product, product.category]);

    const breadcrumb = useMemo(() => {
        const categoryLabel = String(product?.category || '').trim();
        const categoryUpper = categoryLabel ? categoryLabel.toUpperCase() : 'PRODUCT';
        const categoryTo = categoryLabel ? `/products?category=${encodeURIComponent(categoryLabel)}` : undefined;
        return {
            categoryLabel: categoryUpper,
            categoryTo,
            productLabel: String(product?.name || '').trim() || 'PRODUCT',
        };
    }, [product?.category, product?.name]);

    const marketingProduct = useMemo(() => {
        if (!Array.isArray(similarProducts) || similarProducts.length === 0) return null;

        const candidates = similarProducts
            .filter((p) => p && p._id && String(p._id) !== String(productId))
            .filter((p) => Array.isArray(p.images) && p.images[0]?.url)
            .filter((p) => Number.isFinite(Number(p.price)));

        if (candidates.length === 0) return null;

        // Prefer best sellers / best rated first
        candidates.sort((a, b) => {
            const aOrders = Number(a.orderCount || 0);
            const bOrders = Number(b.orderCount || 0);
            if (bOrders !== aOrders) return bOrders - aOrders;

            const aRating = Number(a.ratings || 0);
            const bRating = Number(b.ratings || 0);
            if (bRating !== aRating) return bRating - aRating;

            const aPrice = Number(a.price || 0);
            const bPrice = Number(b.price || 0);
            return aPrice - bPrice;
        });

        return candidates[0];
    }, [similarProducts, productId]);

    return (
        <>
            {loading ? <Loader /> : (
                <>
                    <MetaData title={product.name} />
                    <main className="mt-4 sm:mt-6">

                        {/* Bottom-left marketing recommendation */}
                        {marketingProduct ? (
                            <motion.div
                                initial={{ y: 28, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 28, opacity: 0 }}
                                transition={{ duration: 0.9, ease: 'easeOut' }}
                                className="hidden sm:block fixed bottom-6 left-[220px] z-40 w-[400px]"
                            >
                                <div className="bg-white/85 backdrop-blur border border-gray-200 rounded-none shadow-lg overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setMarketingOpen((v) => !v)}
                                        className="w-full flex items-center justify-between px-5 py-4 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-primary-darkBlue">
                                                <LocalOfferIcon sx={{ fontSize: '20px' }} />
                                            </span>
                                            <span className="font-brandSerif text-[13px] uppercase tracking-wider text-primary-darkBlue">
                                                Magical savings with exclusive kits
                                            </span>
                                        </div>
                                        <span className="text-primary-grey text-lg leading-none select-none">
                                            {marketingOpen ? '▾' : '▸'}
                                        </span>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {marketingOpen ? (
                                            <motion.div
                                                key="marketing-body"
                                                initial={{ y: -10, opacity: 0, height: 0 }}
                                                animate={{ y: 0, opacity: 1, height: 'auto' }}
                                                exit={{ y: -10, opacity: 0, height: 0 }}
                                                transition={{ duration: 0.85, ease: 'easeOut' }}
                                            >
                                                <div className="px-5 pb-5">
                                                    <div className="bg-white/80 border border-gray-200 rounded-none p-4 shadow-sm">
                                                        <div className="flex gap-4">
                                                            <div className="w-28 h-28 rounded-none border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                                                                <img
                                                                    draggable="false"
                                                                    className="w-full h-full object-contain"
                                                                    src={marketingProduct.images?.[0]?.url}
                                                                    alt={marketingProduct.name}
                                                                />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                {Number(marketingProduct.cuttedPrice) > Number(marketingProduct.price) ? (
                                                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-none bg-primary-blue/10 text-primary-blue text-xs font-semibold uppercase tracking-wide">
                                                                        Save {getDiscount(Number(marketingProduct.price), Number(marketingProduct.cuttedPrice))}%
                                                                    </span>
                                                                ) : null}

                                                                <Link
                                                                    to={`/product/${marketingProduct._id}`}
                                                                    className="mt-2 block font-brandSerif text-lg font-normal text-primary-darkBlue leading-tight truncate hover:text-primary-blue"
                                                                    title={marketingProduct.name}
                                                                >
                                                                    {marketingProduct.name}
                                                                </Link>

                                                                <p className="mt-1 text-xs uppercase tracking-wide text-primary-grey">
                                                                    {String(marketingProduct.category || 'Makeup').replace(/_/g, ' ')}
                                                                </p>

                                                                <div className="mt-2 flex items-baseline gap-2">
                                                                    {Number(marketingProduct.cuttedPrice) > Number(marketingProduct.price) ? (
                                                                        <span className="text-sm text-primary-grey line-through">
                                                                            ₹{Number(marketingProduct.cuttedPrice).toLocaleString()}
                                                                        </span>
                                                                    ) : null}
                                                                    <span className="text-base font-semibold text-primary-orange">
                                                                        ₹{Number(marketingProduct.price).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <Link
                                                            to={`/product/${marketingProduct._id}`}
                                                            className="mt-4 inline-flex w-full items-center justify-center rounded-none border border-primary-darkBlue/70 bg-white/70 text-primary-darkBlue text-sm font-semibold uppercase tracking-wide py-3 hover:bg-black/5"
                                                        >
                                                            Show Me
                                                        </Link>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ) : null}

                        {/* breadcrumb */}
                        <div className="sm:mx-3 mb-4">
                            <nav className="text-[11px] uppercase tracking-wide text-primary-grey flex items-center gap-2">
                                <Link to="/" className="hover:text-primary-darkBlue">Home</Link>
                                <span className="text-primary-grey">/</span>
                                {breadcrumb.categoryTo ? (
                                    <Link to={breadcrumb.categoryTo} className="hover:text-primary-darkBlue">
                                        {breadcrumb.categoryLabel}
                                    </Link>
                                ) : (
                                    <span className="text-primary-darkBlue">{breadcrumb.categoryLabel}</span>
                                )}
                                <span className="text-primary-grey">/</span>
                                <span className="text-primary-darkBlue truncate max-w-[60vw]">{breadcrumb.productLabel}</span>
                            </nav>
                        </div>

                        {/* <!-- product image & description container --> */}
                        <div className="w-full sm:w-11/12 sm:mx-auto flex flex-col sm:flex-row gap-4 sm:gap-6 relative">

                            {/* <!-- image wrapper --> */}
                            <div className="w-full sm:w-2/5 sm:sticky sm:top-20 sm:self-start">
                                {/* <!-- imgbox --> */}
                                <div className="flex flex-col gap-3 sm:gap-4">
                                    <div className="w-full bg-white/80 backdrop-blur border border-gray-200 rounded-2xl p-3 sm:p-4 relative shadow-sm">
                                        <Slider {...settings}>
                                            {product.images && product.images.map((item, i) => (
                                                <img draggable="false" className="w-full h-80 sm:h-96 object-contain" src={item.url} alt={product.name} key={i} />
                                            ))}
                                        </Slider>

                                        <div className="absolute top-4 left-4 shadow bg-white/85 backdrop-blur w-9 h-9 border border-gray-200 flex items-center justify-center rounded-full">
                                            <span onClick={addToCompareHandler} className={`${itemInCompare ? "text-primary-blue" : "hover:text-primary-blue text-gray-300"} cursor-pointer`}>
                                                <CompareArrowsIcon sx={{ fontSize: "18px" }} />
                                            </span>
                                        </div>
                                        <div className="absolute top-4 right-4 shadow bg-white/85 backdrop-blur w-9 h-9 border border-gray-200 flex items-center justify-center rounded-full">
                                            <span onClick={addToWishlistHandler} className={`${itemInWishlist ? "text-red-500" : "hover:text-red-500 text-gray-300"} cursor-pointer`}><FavoriteIcon sx={{ fontSize: "18px" }} /></span>
                                        </div>
                                    </div>

                                    <div className="w-full flex gap-3">
                                        {/* <!-- add to cart btn --> */}
                                        {displayStock > 0 && (
                                            <button onClick={itemInCart ? goToCart : addToCartHandler} className="p-4 w-1/2 flex items-center justify-center gap-2 font-semibold text-primary-darkBlue bg-white/80 backdrop-blur border border-gray-200 rounded-xl shadow-sm hover:shadow transition-shadow">
                                                <ShoppingCartIcon />
                                                {itemInCart ? "GO TO CART" : "ADD TO CART"}
                                            </button>
                                        )}
                                        <button onClick={buyNow} disabled={displayStock < 1 ? true : false} className={displayStock < 1 ? "p-4 w-full flex items-center justify-center gap-2 text-white bg-red-600 cursor-not-allowed rounded-xl shadow-sm" : "p-4 w-1/2 flex items-center justify-center gap-2 text-white bg-primary-blue rounded-xl shadow-sm hover:shadow transition-shadow"}>
                                            <FlashOnIcon />
                                            {displayStock < 1 ? "OUT OF STOCK" : "BUY NOW"}
                                        </button>
                                        {/* <!-- add to cart btn --> */}
                                    </div>

                                </div>
                                {/* <!-- imgbox --> */}
                            </div>
                            {/* <!-- image wrapper --> */}

                            {/* <!-- product desc wrapper --> */}
                            <div className="flex-1">

                                {/* <!-- whole product description --> */}
                                <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-3 mb-4">

                                    <h2 className="text-2xl sm:text-3xl text-primary-darkBlue leading-tight">{product.name}</h2>
                                    {/* <!-- rating badge --> */}
                                    <span className="text-sm text-gray-500 font-medium flex gap-2 items-center">
                                        <span className="text-xs px-1.5 py-0.5 bg-primary-green rounded-sm text-white flex items-center gap-0.5">{product.ratings && product.ratings.toFixed(1)} <StarIcon sx={{ fontSize: "12px" }} /></span>
                                        <span>{product.numOfReviews} Reviews</span>
                                    </span>
                                    {/* <!-- rating badge --> */}

                                    {variantOptions.length > 0 && (
                                        <div className="mt-2 max-w-md">
                                            <p className="text-gray-500 text-sm font-medium">{variantLabel}</p>

                                            {variantType === 'color' ? (
                                                <div className="mt-2">
                                                    <div className="flex items-center gap-2 overflow-x-auto">
                                                        {variantOptions.map((v) => {
                                                            const isSelected = String(selectedVariantValue || '').toUpperCase() === String(v.value || '').toUpperCase();
                                                            return (
                                                                <button
                                                                    key={`${v.hex}-${v.name}`}
                                                                    type="button"
                                                                    onClick={() => setSelectedVariantValue(v.value)}
                                                                    title={v.name}
                                                                    className={
                                                                        isSelected
                                                                            ? 'w-9 h-9 rounded-full border-2 border-primary-blue flex-shrink-0'
                                                                            : 'w-9 h-9 rounded-full border border-gray-300 flex-shrink-0'
                                                                    }
                                                                    style={{ backgroundColor: v.hex }}
                                                                    aria-label={`Select ${v.name}`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                    {selectedVariant?.name ? (
                                                        <p className="mt-2 text-sm text-gray-600">Selected: <span className="font-medium text-gray-800">{selectedVariant.name}</span></p>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <select
                                                    value={selectedVariantValue}
                                                    onChange={(e) => setSelectedVariantValue(e.target.value)}
                                                    className="mt-2 w-full border border-gray-200 rounded-sm px-3 py-2 text-sm outline-none bg-white"
                                                >
                                                    {variantOptions.map((v) => (
                                                        <option key={v.value} value={v.value}>{v.value}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}

                                    {/* <!-- price desc --> */}
                                    <span className="text-primary-lightGreen text-sm font-medium">Special price</span>
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-3xl font-semibold">
                                        <span className="text-primary-darkBlue">₹{displayPrice?.toLocaleString()}</span>
                                        <span className="text-base text-primary-grey line-through">₹{displayCuttedPrice?.toLocaleString()}</span>
                                        <span className="text-base text-primary-lightGreen">{getDiscount(displayPrice, displayCuttedPrice)}%&nbsp;off</span>
                                    </div>
                                    {displayStock <= 10 && displayStock > 0 && (
                                        <span className="text-red-500 text-sm font-medium">Hurry, Only {displayStock} left!</span>
                                    )}
                                    {/* <!-- price desc --> */}

                                    {/* <!-- banks offers --> */}
                                    <p className="text-md font-semibold text-primary-darkBlue mt-1">Available offers</p>
                                    {Array(3).fill("").map((el, i) => (
                                        <p className="text-sm flex items-center gap-1" key={i}>
                                            <span className="text-primary-lightGreen"><LocalOfferIcon sx={{ fontSize: "20px" }} /></span>
                                            <span className="font-medium ml-2">Bank Offer</span> 15% instant discount on orders of 500 and above <Link className="text-primary-blue font-medium" to="/">T&C</Link>
                                        </p>
                                    ))}
                                    {/* <!-- banks offers --> */}

                                    {/* <!-- warranty & brand --> */}
                                    <div className="flex flex-wrap gap-6 mt-2 items-center text-sm">
                                        {product.brand?.logo?.url ? (
                                            <img draggable="false" className="w-24 h-10 p-1 border border-gray-200 rounded-lg bg-white object-contain" src={product.brand?.logo.url} alt={product.brand && product.brand.name} />
                                        ) : null}
                                        <span className="text-primary-grey">{product.warranty} Year Warranty <Link className="font-medium text-primary-blue" to="/">Know More</Link></span>
                                    </div>
                                    {/* <!-- warranty & brand --> */}

                                    {/* <!-- delivery details --> */}
                                    <div className="flex gap-16 mt-4 items-center text-sm font-medium">
                                        <p className="text-gray-500">Delivery</p>
                                        <span className="text-primary-darkBlue">Delivery by {getDeliveryDate()}</span>
                                    </div>
                                    {/* <!-- delivery details --> */}

                                    {/* <!-- highlights & services details --> */}
                                    <div className="flex flex-col sm:flex-row justify-between">
                                        {/* <!-- highlights details --> */}
                                        <div className="flex gap-16 mt-4 items-stretch text-sm">
                                            <p className="text-gray-500 font-medium">Highlights</p>

                                            <ul className="list-disc flex flex-col gap-2 w-64">
                                                {product.highlights?.map((highlight, i) => (
                                                    <li key={i}>
                                                        <p>{highlight}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        {/* <!-- highlights details --> */}

                                        {/* <!-- services details --> */}
                                        <div className="flex gap-16 mt-4 mr-6 items-stretch text-sm">
                                            <p className="text-gray-500 font-medium">Services</p>
                                            <ul className="flex flex-col gap-2">
                                                <li>
                                                    <p className="flex items-center gap-3"><span className="text-primary-blue"><VerifiedUserIcon sx={{ fontSize: "18px" }} /></span> {product.warranty} Year</p>
                                                </li>
                                                <li>
                                                    <p className="flex items-center gap-3"><span className="text-primary-blue"><CachedIcon sx={{ fontSize: "18px" }} /></span> 7 Days Replacement Policy</p>
                                                </li>
                                                <li>
                                                    <p className="flex items-center gap-3"><span className="text-primary-blue"><CurrencyRupeeIcon sx={{ fontSize: "18px" }} /></span> Cash on Delivery available</p>
                                                </li>
                                            </ul>
                                        </div>
                                        {/* <!-- services details --> */}
                                    </div>
                                    {/* <!-- highlights & services details --> */}

                                    {/* <!-- seller details --> */}
                                    <div className="flex gap-16 mt-4 items-center text-sm font-medium">
                                        <p className="text-gray-500">Seller</p>
                                        <Link className="font-medium text-primary-blue ml-3" to="/">{product.brand && product.brand.name}</Link>
                                    </div>
                                    {/* <!-- seller details --> */}

                                    {/* <!-- description details --> */}
                                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-14 mt-4 items-stretch text-sm">
                                        <p className="text-gray-500 font-medium">Description</p>
                                        <span>{product.description}</span>
                                    </div>
                                    {/* <!-- description details --> */}

                                    {/* <!-- border box --> */}
                                    <div className="w-full mt-6 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur flex flex-col overflow-hidden">
                                        <h1 className="px-5 py-4 border-b border-gray-200 text-xl sm:text-2xl font-semibold text-primary-darkBlue">Product Details</h1>
                                        <div className="p-5">
                                            <p className="text-sm text-primary-darkBlue/90">{product.description}</p>
                                        </div>
                                    </div>
                                    {/* <!-- border box --> */}

                                    {/* <!-- specifications border box --> */}
                                    <div className="w-full mt-4 pb-4 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur flex flex-col overflow-hidden">
                                        <h1 className="px-5 py-4 border-b border-gray-200 text-xl sm:text-2xl font-semibold text-primary-darkBlue">Specifications</h1>
                                        <h1 className="px-5 py-3 text-lg text-primary-darkBlue">General</h1>

                                        {/* <!-- specs list --> */}
                                        {product.specifications?.map((spec, i) => (
                                            <div className="px-5 py-2 flex items-start gap-3 text-sm" key={i}>
                                                <p className="text-primary-grey w-36 sm:w-44 shrink-0">{spec.title}</p>
                                                <p className="flex-1 text-primary-darkBlue/90">{spec.description}</p>
                                            </div>
                                        ))}
                                        {/* <!-- specs list --> */}

                                    </div>
                                    {/* <!-- specifications border box --> */}

                                    {/* <!-- reviews border box --> */}
                                    <div className="w-full mt-4 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur flex flex-col overflow-hidden">
                                        <div className="flex justify-between items-center border-b border-gray-200 px-5 py-4">
                                            <h1 className="text-xl sm:text-2xl font-semibold text-primary-darkBlue">Ratings & Reviews</h1>
                                            <button onClick={handleDialogClose} className="shadow-sm bg-primary-blue text-white px-4 py-2 rounded-xl hover:shadow transition-shadow">Rate Product</button>
                                        </div>

                                        <Dialog
                                            aria-labelledby='review-dialog'
                                            open={open}
                                            onClose={handleDialogClose}
                                        >
                                            <DialogTitle className="border-b">Submit Review</DialogTitle>
                                            <DialogContent className="flex flex-col m-1 gap-4">
                                                <Rating
                                                    onChange={(e) => setRating(e.target.value)}
                                                    value={rating}
                                                    size='large'
                                                    precision={0.5}
                                                />
                                                <TextField
                                                    label="Review"
                                                    multiline
                                                    rows={3}
                                                    sx={{ width: 400 }}
                                                    size="small"
                                                    variant="outlined"
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                />
                                            </DialogContent>
                                            <DialogActions>
                                                <button onClick={handleDialogClose} className="py-2 px-6 rounded shadow bg-white border border-red-500 hover:bg-red-100 text-red-600 uppercase">Cancel</button>
                                                <button onClick={reviewSubmitHandler} className="py-2 px-6 rounded bg-green-600 hover:bg-green-700 text-white shadow uppercase">Submit</button>
                                            </DialogActions>
                                        </Dialog>

                                        <div className="flex items-center border-b border-gray-200">
                                            <h1 className="px-5 py-3 text-3xl font-semibold text-primary-darkBlue">{product.ratings && product.ratings.toFixed(1)}<StarIcon /></h1>
                                            <p className="text-lg text-primary-grey">({product.numOfReviews}) Reviews</p>
                                        </div>

                                        {viewAll ?
                                            product.reviews?.map((rev, i) => (
                                                <div className="flex flex-col gap-2 py-4 px-5 border-b border-gray-200" key={i}>
                                                    <Rating name="read-only" value={rev.rating} readOnly size="small" precision={0.5} />
                                                    <p className="text-primary-darkBlue/90">{rev.comment}</p>
                                                    <span className="text-sm text-primary-grey">by {rev.name}</span>
                                                </div>
                                            )).reverse()
                                            :
                                            product.reviews?.slice(-3).map((rev, i) => (
                                                <div className="flex flex-col gap-2 py-4 px-5 border-b border-gray-200" key={i}>
                                                    <Rating name="read-only" value={rev.rating} readOnly size="small" precision={0.5} />
                                                    <p className="text-primary-darkBlue/90">{rev.comment}</p>
                                                    <span className="text-sm text-primary-grey">by {rev.name}</span>
                                                </div>
                                            )).reverse()
                                        }
                                        {product.reviews?.length > 3 &&
                                            <button onClick={() => setViewAll(!viewAll)} className="w-full sm:w-1/3 m-2 rounded-xl shadow-sm hover:shadow py-2 bg-primary-blue text-white">{viewAll ? "View Less" : "View All"}</button>
                                        }
                                    </div>
                                    {/* <!-- reviews border box --> */}

                                </div>

                            </div>
                            {/* <!-- product desc wrapper --> */}

                        </div>
                        {/* <!-- product image & description container --> */}

                        {/* Sliders */}
                        <div className="flex flex-col gap-3 mt-6 sm:mt-8">
                            <ProductSlider title={"Similar Products"} tagline={"Based on the category"} />
                        </div>

                    </main>
                </>
            )}
        </>
    );
};

export default ProductDetails;
