import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const clamp0 = (n) => Math.max(0, n);

const diffToParts = (diffMs) => {
    const totalSeconds = Math.floor(clamp0(diffMs) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (v) => String(v).padStart(2, '0');
    return {
        hours: pad(hours),
        minutes: pad(minutes),
        seconds: pad(seconds),
    };
};

const DealOfDaySection = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [products, setProducts] = useState([]);
    const [endsAt, setEndsAt] = useState(null);
    const [timeParts, setTimeParts] = useState(diffToParts(0));
    const [heroImageUrl, setHeroImageUrl] = useState('');
    const [heroLink, setHeroLink] = useState('');

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                setLoading(true);
                const { data } = await axios.get('/api/v1/deals?limit=4');
                if (!mounted) return;
                setProducts(Array.isArray(data?.products) ? data.products : []);
                setEndsAt(data?.dealOfDayEndsAt ? new Date(data.dealOfDayEndsAt) : null);
                setHeroImageUrl(String(data?.heroImageUrl || '').trim());
                setHeroLink(String(data?.heroLink || '').trim());
                setError(null);
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || e.message || 'Failed to load deal of the day');
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
            setTimeParts(diffToParts(diff));
        }, 1000);
        return () => clearInterval(id);
    }, [endsAt]);

    const mainProduct = useMemo(() => {
        if (!Array.isArray(products) || products.length === 0) return null;
        return products[0];
    }, [products]);

    if (!loading && (!mainProduct || error)) {
        return null;
    }

    if (loading || !mainProduct) {
        return null;
    }

    const fallbackProductLink = mainProduct?._id ? `/product/${mainProduct._id}` : '#';
    const effectiveHeroLink = heroLink || fallbackProductLink;
    const img = heroImageUrl || mainProduct?.images?.[0]?.url;

    return (
        <section className="w-full">
            <div className="bg-primary-blue rounded-2xl overflow-hidden shadow-md text-white flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 p-7 sm:p-10 flex flex-col justify-center gap-5">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.35em] text-white/80">Deal Of The Day</p>
                        <h2 className="mt-2 text-2xl sm:text-3xl font-brandSerif leading-tight hidden sm:block">
                            Limited-time picks chosen just for you.
                        </h2>
                    </div>

                    {endsAt && (
                        <p className="text-sm text-white/90">
                            Ends in <span className="font-semibold tracking-[0.18em]">{timeParts.hours}:{timeParts.minutes}:{timeParts.seconds}</span>
                        </p>
                    )}

                    <div className="mt-2">
                        <p className="text-2xl sm:text-3xl font-brandSerif font-semibold leading-tight text-white line-clamp-2">
                            {mainProduct?.name}
                        </p>
                        {typeof mainProduct?.price === 'number' && (
                            <p className="mt-2 text-xl font-semibold">
                                ₹{Number(mainProduct.price).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="mt-3">
                        <Link
                            to={effectiveHeroLink}
                            className="inline-flex items-center justify-center px-6 py-2.5 bg-white text-primary-blue text-xs font-semibold uppercase tracking-[0.22em] rounded-full shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            Shop the deal
                        </Link>
                    </div>
                </div>

                <Link
                    to={effectiveHeroLink}
                    className="w-full md:w-1/2 bg-white flex items-center justify-center p-5 sm:p-7"
                >
                    {img ? (
                        <img
                            src={img}
                            alt={mainProduct?.name || ''}
                            className="w-full h-full max-h-[360px] md:max-h-[400px] object-contain"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-[240px]" />
                    )}
                </Link>
            </div>
        </section>
    );
};

export default DealOfDaySection;
