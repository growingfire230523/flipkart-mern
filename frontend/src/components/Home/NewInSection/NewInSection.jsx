import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Rating from '@mui/material/Rating';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { addItemsToCart } from '../../../actions/cartAction';

const NewInSection = () => {
    const [products, setProducts] = useState([]);
    const [ads, setAds] = useState(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const { cartItems } = useSelector((state) => state.cart);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const { data } = await axios.get('/api/v1/products/new-in?limit=3');
                if (!mounted) return;
                setProducts(Array.isArray(data?.products) ? data.products : []);
            } catch {
                // non-blocking
            }
        };

        const loadAds = async () => {
            try {
                const { data } = await axios.get('/api/v1/home/new-in-ads');
                if (!mounted) return;
                setAds(data?.ads || null);
            } catch {
                // non-blocking
            }
        };

        load();
        loadAds();
        return () => { mounted = false; };
    }, []);

    if (!products.length) return null;

    const primaryProduct = products[0];
    const secondaryProducts = products.slice(1);

    const renderCard = (p, size, key) => {
        const img = p?.images?.[0]?.url;
        const itemInCart = cartItems?.some((i) => i.product === p?._id);

        const addToBag = () => {
            if (itemInCart) {
                navigate('/cart');
                return;
            }
            dispatch(addItemsToCart(p?._id, 1));
            enqueueSnackbar('Added To Bag', { variant: 'success' });
        };

        const safeRating = Number(p?.ratings) || 0;
        const safeOrders = Number(p?.orderCount) || 0;
        const safePrice = Number(p?.price) || 0;

        const isSmall = size === 'small';

        return (
            <div
                key={key}
                className="group bg-white border border-gray-200 rounded-sm overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_18px_45px_rgba(15,23,42,0.16)] hover:-translate-y-1"
            >
                <Link to={`/product/${p?._id}`} className="block">
                    <div className="relative bg-gray-50">
                        <div
                            className={
                                (isSmall
                                    ? 'h-52 sm:h-60 '
                                    : 'h-64 ') +
                                'w-full flex items-center justify-center p-3 sm:p-4 overflow-hidden'
                            }
                        >
                            {img ? (
                                <img
                                    src={img}
                                    alt={p?.name || ''}
                                    className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full" />
                            )}
                        </div>
                        <div className="absolute bottom-0 left-0 w-full bg-primary-orange/10 px-3 py-2">
                            <span className="text-xs uppercase tracking-widest text-primary-darkBlue">NEW!</span>
                        </div>
                    </div>
                </Link>

                <div className={isSmall ? 'p-3' : 'p-4'}>
                    <Link to={`/product/${p?._id}`} className="block">
                        <h3
                            className={
                                (isSmall ? 'text-[12px] ' : 'text-sm ') +
                                'uppercase tracking-widest text-primary-darkBlue leading-snug h-11 overflow-hidden'
                            }
                        >
                            {p?.name}
                        </h3>
                    </Link>

                    <div className="mt-2 flex items-center gap-2">
                        <Rating value={safeRating} precision={0.5} readOnly size="small" />
                        <span className="text-xs text-gray-500">({safeOrders.toLocaleString()})</span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-primary-darkBlue">₹{safePrice.toLocaleString()}</p>

                    <button
                        type="button"
                        onClick={addToBag}
                        className={
                            (isSmall ? 'mt-3 py-2.5 ' : 'mt-4 py-3 ') +
                            'w-full border border-primary-darkBlue/40 text-primary-darkBlue text-xs uppercase tracking-widest hover:bg-primary-blue hover:text-white hover:border-white'
                        }
                    >
                        {itemInCart ? 'GO TO BAG' : 'ADD TO BAG'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <section className="w-full">
            <div className="bg-white border border-gray-200 shadow-sm rounded-sm">
                <div className="px-4 py-5">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-brandSerif text-primary-darkBlue">New In</h2>
                    </div>

                    <div className="mt-5 flex flex-col lg:flex-row gap-4 items-stretch">
                        {ads?.left?.image?.url ? (
                            ads.left.link ? (
                                <a href={ads.left.link} className="hidden lg:block lg:w-[280px] xl:w-[320px]">
                                    <img
                                        src={ads.left.image.url}
                                        alt=""
                                        className="w-full h-full max-h-[520px] object-cover rounded-sm border border-gray-200"
                                        loading="lazy"
                                    />
                                </a>
                            ) : (
                                <div className="hidden lg:block lg:w-[280px] xl:w-[320px]">
                                    <img
                                        src={ads.left.image.url}
                                        alt=""
                                        className="w-full h-full max-h-[520px] object-cover rounded-sm border border-gray-200"
                                    />
                                </div>
                            )
                        ) : null}

                        <div className="flex-1">
                            {/* Mobile trio layout: one large + two smaller cards */}
                            <div className="block md:hidden space-y-4">
                                {primaryProduct && renderCard(primaryProduct, 'large', primaryProduct?._id || 'primary')}

                                {secondaryProducts.length > 0 && (
                                    <div className="grid grid-cols-2 gap-4">
                                        {secondaryProducts.map((p) =>
                                            renderCard(p, 'small', p?._id || `secondary-${p?.name}`)
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Desktop/tablet layout: simple three-column grid */}
                            <div className="hidden md:grid md:grid-cols-3 gap-4">
                                {products.map((p) => renderCard(p, 'large', p?._id || `grid-${p?.name}`))}
                            </div>
                        </div>

                        {ads?.right?.image?.url ? (
                            ads.right.link ? (
                                <a href={ads.right.link} className="hidden lg:block lg:w-[280px] xl:w-[320px]">
                                    <img
                                        src={ads.right.image.url}
                                        alt=""
                                        className="w-full h-full max-h-[520px] object-cover rounded-sm border border-gray-200"
                                        loading="lazy"
                                    />
                                </a>
                            ) : (
                                <div className="hidden lg:block lg:w-[280px] xl:w-[320px]">
                                    <img
                                        src={ads.right.image.url}
                                        alt=""
                                        className="w-full h-full max-h-[520px] object-cover rounded-sm border border-gray-200"
                                        loading="lazy"
                                    />
                                </div>
                            )
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default NewInSection;
