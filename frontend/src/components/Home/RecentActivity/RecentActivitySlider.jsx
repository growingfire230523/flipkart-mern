import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import Slider from 'react-slick';
import { useSnackbar } from 'notistack';
import { settings as baseSettings } from '../DealSlider/DealSlider';
import { getActiveUserId, loadRecentlyViewedItems } from '../../../utils/cartStorage';
import { myOrders, clearErrors as clearOrderErrors } from '../../../actions/orderAction';

const MAX_ITEMS = 10;

const buildOrderedProducts = (orders) => {
    if (!Array.isArray(orders) || orders.length === 0) return [];

    const sorted = [...orders].sort((a, b) => {
        const aDate = new Date(a.createdAt || a.paidAt || 0).getTime();
        const bDate = new Date(b.createdAt || b.paidAt || 0).getTime();
        return bDate - aDate;
    });

    const collected = [];

    for (const order of sorted) {
        const items = Array.isArray(order.orderItems) ? order.orderItems : [];
        for (const i of items) {
            if (!i || !i.product) continue;
            collected.push({
                _id: i.product._id || i.product,
                name: i.name || i.productName || (i.product && i.product.name) || 'Product',
                images: i.product?.images || (i.image ? [{ url: i.image }] : []),
            });
        }
    }

    const byId = new Map();
    for (const p of collected) {
        if (!p._id) continue;
        if (!byId.has(p._id)) byId.set(p._id, p);
    }

    return Array.from(byId.values()).slice(0, MAX_ITEMS);
};

const RecentActivitySlider = ({ mode }) => {
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const isViewedMode = mode === 'viewed';

    const { isAuthenticated } = useSelector((state) => state.user || {});
    const { orders, loading: ordersLoading, error: ordersError } = useSelector((state) => state.myOrders || {});

    const [viewedItems, setViewedItems] = useState([]);

    useEffect(() => {
        if (!isViewedMode) return;
        const userId = getActiveUserId();
        const stored = loadRecentlyViewedItems(userId);
        if (Array.isArray(stored) && stored.length > 0) {
            const normalized = stored
                .filter((p) => p && p._id && p.name && Array.isArray(p.images))
                .slice(-MAX_ITEMS)
                .reverse();
            setViewedItems(normalized);
        } else {
            setViewedItems([]);
        }
    }, [isViewedMode]);

    useEffect(() => {
        if (isViewedMode) return;
        if (!isAuthenticated) return;
        if (ordersLoading || (Array.isArray(orders) && orders.length > 0)) return;
        dispatch(myOrders());
    }, [dispatch, isViewedMode, isAuthenticated, ordersLoading, orders]);

    useEffect(() => {
        if (!ordersError) return;
        enqueueSnackbar(ordersError, { variant: 'error' });
        dispatch(clearOrderErrors());
    }, [ordersError, enqueueSnackbar, dispatch]);

    const orderedProducts = useMemo(() => buildOrderedProducts(orders), [orders]);

    const products = isViewedMode ? viewedItems : orderedProducts;

    if (!products || products.length === 0) return null;

    const title = isViewedMode ? 'Still looking for these?' : 'Products you bought recently';

    const sliderSettings = {
        ...baseSettings,
        initialSlide: 0,
        slidesToShow: Math.min(4, products.length),
        slidesToScroll: Math.min(4, products.length),
        infinite: products.length > 4,
    };

    return (
        <section className="rounded-lg border border-[#e0bfa0] shadow bg-[#f0d5bc]">
            <div className="px-6 pt-4 pb-3">
                <h2 className="text-primary-darkBlue text-2xl font-semibold leading-tight">{title}</h2>
            </div>
            <div className="px-3 pb-4">
                <Slider {...sliderSettings}>
                    {products.map((p) => {
                        const src =
                            (Array.isArray(p.images) && p.images[0] && (p.images[0].url || p.images[0].src)) ||
                            p.image ||
                            '';

                        return (
                            <div key={p._id} className="px-1">
                                <Link to={`/product/${p._id}`} className="block h-full">
                                    <div className="bg-white rounded-md border border-gray-200 flex flex-col h-full overflow-hidden">
                                        <div className="h-56 flex items-center justify-center bg-white px-3 py-4">
                                            {src ? (
                                                <img
                                                    src={src}
                                                    alt={p.name}
                                                    draggable="false"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </Slider>
            </div>
        </section>
    );
};

export default RecentActivitySlider;
