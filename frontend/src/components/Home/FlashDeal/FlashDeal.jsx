import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './FlashDeal.css';
import Rating from '@mui/material/Rating';
import { getDiscount } from '../../../utils/functions';

const clamp0 = (n) => Math.max(0, n);

const diffToParts = (diffMs) => {
    const totalSeconds = Math.floor(clamp0(diffMs) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (v) => String(v).padStart(2, '0');
    return {
        days: String(days),
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
    };
};

const FlashDealSwapNumber = ({ value }) => {
    return (
        <span className="flashDealSwapWrap" aria-live="polite">
            <span key={value} className="flashDealSwapNumber flashDealSwapNumberTick">
                {value}
            </span>
        </span>
    );
};

const FlashDealProductTile = ({ _id, name, images, price, cuttedPrice, ratings, orderCount, catalogHighlights }) => {
    const safeRating = Number(ratings) || 0;
    const safeOrders = Number(orderCount) || 0;
    const safePrice = Number(price) || 0;
    const safeCuttedPrice = Number(cuttedPrice) || 0;
    const showDiscount = safeCuttedPrice > 0 && safePrice > 0 && safeCuttedPrice > safePrice;
    const discountPct = showDiscount ? getDiscount(safePrice, safeCuttedPrice) : null;

    const normalTags = Array.isArray(catalogHighlights?.normal) ? catalogHighlights.normal : [];
    const activeTags = Array.isArray(catalogHighlights?.active) ? catalogHighlights.active : [];
    const tagItems = [
        ...activeTags.map((label) => ({ label, type: 'active' })),
        ...normalTags.map((label) => ({ label, type: 'normal' })),
    ]
        .map((t) => ({ ...t, label: String(t.label || '').trim() }))
        .filter((t) => t.label)
        .slice(0, 6);

    return (
        <Link
            to={`/product/${_id}`}
            className="group relative w-[180px] sm:w-[220px] lg:w-[240px] bg-white border border-gray-200 rounded-sm overflow-hidden shrink-0 transition-all duration-300 ease-out hover:shadow-[0_16px_40px_rgba(15,23,42,0.14)] hover:-translate-y-1"
        >
            {tagItems.length > 0 && (
                <div className="pointer-events-none absolute top-2 left-2 z-[1] flex flex-col gap-1">
                    {tagItems.map((t, idx) => (
                        <div
                            key={`${t.type}-${idx}-${t.label}`}
                            className={t.type === 'active' ? 'bg-red-600/55 text-white rounded-md' : 'bg-gray-500/55 text-white rounded-md'}
                            style={{ maxWidth: 'calc(100% - 1rem)' }}
                        >
                            <div className="px-2 py-1 text-[11px] font-semibold tracking-wide uppercase truncate">{t.label}</div>
                        </div>
                    ))}
                </div>
            )}
            {showDiscount && (
                <div className="absolute top-2 right-2 z-[1] bg-red-500 text-white text-[11px] font-semibold px-2 py-1 rounded-sm">
                    {discountPct}% OFF
                </div>
            )}
            <div className="bg-gray-50">
                <div className="h-32 sm:h-36 lg:h-40 w-full flex items-center justify-center p-2 sm:p-3 overflow-hidden">
                    <img
                        draggable="false"
                        className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                        src={images?.[0]?.url}
                        alt={name}
                    />
                </div>
            </div>
            <div className="p-2.5 sm:p-3">
                <h2 className="text-[12px] sm:text-[13px] font-medium text-primary-darkBlue leading-snug">
                    {name?.length > 40 ? `${name.substring(0, 40)}...` : name}
                </h2>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm sm:text-base text-primary-darkBlue font-medium">₹{safePrice.toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-[11px] sm:text-xs text-primary-grey">
                        <Rating value={safeRating} precision={0.5} readOnly size="small" />
                        <span>({safeOrders.toLocaleString()})</span>
                    </span>
                </div>
            </div>
        </Link>
    );
};

const FlashDeal = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [products, setProducts] = useState([]);
    const [endsAt, setEndsAt] = useState(null);
    const [timeParts, setTimeParts] = useState(diffToParts(0));
    const [remainingMs, setRemainingMs] = useState(0);
    const [initialDurationMs, setInitialDurationMs] = useState(0);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get('/api/v1/deals?limit=12');
                if (!mounted) return;
                setProducts(Array.isArray(data?.products) ? data.products : []);

                const end = data?.endsAt ? new Date(data.endsAt) : null;
                const validEnd = end instanceof Date && !Number.isNaN(end.getTime()) ? end : null;
                setEndsAt(validEnd);

                if (validEnd) {
                    const diff = clamp0(validEnd.getTime() - Date.now());
                    setTimeParts(diffToParts(diff));
                    setRemainingMs(diff);
                    setInitialDurationMs((prev) => (prev > 0 ? prev : diff));
                } else {
                    setTimeParts(diffToParts(0));
                    setRemainingMs(0);
                    setInitialDurationMs(0);
                }
                setError(null);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || e.message || 'Failed to load deals');
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            const end = endsAt instanceof Date && !Number.isNaN(endsAt.getTime()) ? endsAt : null;
            const diff = end ? end.getTime() - Date.now() : 0;
            const clamped = clamp0(diff);
            setTimeParts(diffToParts(clamped));
            setRemainingMs(clamped);
        }, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    const progressPct = useMemo(() => {
        const end = endsAt instanceof Date && !Number.isNaN(endsAt.getTime()) ? endsAt : null;
        if (!end) return 0;
        if (!initialDurationMs || initialDurationMs <= 0) return 0;

        const remaining = clamp0(remainingMs);
        const pct = (remaining / initialDurationMs) * 100;
        return Math.max(0, Math.min(100, pct));
    }, [endsAt, remainingMs, initialDurationMs]);

    const isExpired = useMemo(() => {
        const end = endsAt instanceof Date && !Number.isNaN(endsAt.getTime()) ? endsAt : null;
        if (!end) return false;
        return end.getTime() <= Date.now();
    }, [endsAt, remainingMs]);

    if (!loading && !error && isExpired) {
        return null;
    }

    return (
        <section className="bg-white w-full shadow overflow-hidden">
            <hr />

            {loading ? null : error ? (
                <div className="px-6 py-6 text-sm text-primary-grey">{error}</div>
            ) : products.length === 0 ? (
                <div className="px-6 py-6 text-sm text-primary-grey">No deals available right now.</div>
            ) : (
                <div className="px-6 py-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Countdown card (calendar) */}
                        <div className="lg:w-[380px] w-full lg:mx-0 mx-auto bg-primary-blue text-white rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-4 lg:p-6">
                                <h2 className="text-lg lg:text-xl font-semibold tracking-wide text-center">FLASH DEAL</h2>
                                <p className="mt-1 lg:mt-2 text-white/90 text-center text-xs lg:text-sm leading-relaxed max-w-[320px] mx-auto">
                                    Hurry Up! The Offers are limited , Grab while the flash deal is on!
                                </p>

                                <div className="mt-3 lg:mt-6 flex items-center justify-center gap-2 lg:gap-3">
                                    <div className="bg-white/10 shadow-inner rounded-xl px-2 lg:px-3 py-2.5 lg:py-4 text-center w-[70px] lg:w-[78px]">
                                        <div className="text-2xl lg:text-3xl font-semibold leading-none">
                                            <FlashDealSwapNumber value={timeParts.days} />
                                        </div>
                                        <div className="text-[10px] lg:text-xs text-white/90 mt-1 lg:mt-2">Days</div>
                                    </div>
                                    <div className="bg-white/10 shadow-inner rounded-xl px-2 lg:px-3 py-2.5 lg:py-4 text-center w-[70px] lg:w-[78px]">
                                        <div className="text-2xl lg:text-3xl font-semibold leading-none">
                                            <FlashDealSwapNumber value={timeParts.hours} />
                                        </div>
                                        <div className="text-[10px] lg:text-xs text-white/90 mt-1 lg:mt-2">Hours</div>
                                    </div>
                                    <div className="bg-white/10 shadow-inner rounded-xl px-2 lg:px-3 py-2.5 lg:py-4 text-center w-[70px] lg:w-[78px]">
                                        <div className="text-2xl lg:text-3xl font-semibold leading-none">
                                            <FlashDealSwapNumber value={timeParts.minutes} />
                                        </div>
                                        <div className="text-[10px] lg:text-xs text-white/90 mt-1 lg:mt-2">Mins</div>
                                    </div>
                                    <div className="bg-white/10 shadow-inner rounded-xl px-2 lg:px-3 py-2.5 lg:py-4 text-center w-[70px] lg:w-[78px]">
                                        <div className="text-2xl lg:text-3xl font-semibold leading-none">
                                            <FlashDealSwapNumber value={timeParts.seconds} />
                                        </div>
                                        <div className="text-[10px] lg:text-xs text-white/90 mt-1 lg:mt-2">Secs</div>
                                    </div>
                                </div>

                                <div className="mt-3 lg:mt-6 h-1.5 lg:h-2.5 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full flashDealProgressFill"
                                        style={{ width: `${progressPct}%` }}
                                        aria-label="Flash deal progress"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Scrollable products row */}
                        <div className="flex-1 min-w-0">
                            <div className="flex gap-4 overflow-x-auto flashDealHideScrollbar pb-2">
                                {products.map((product) => (
                                    <FlashDealProductTile {...product} key={product._id} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default FlashDeal;