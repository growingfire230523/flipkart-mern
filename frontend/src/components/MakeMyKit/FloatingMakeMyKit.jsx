import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { addItemsToCart } from '../../actions/cartAction';
import bagIcon from '../../assets/images/bag.png';

const FloatingMakeMyKit = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const { cartItems } = useSelector((state) => state.cart);

    const [working, setWorking] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(0); // 0: intro, 1: needs input, 2: results
    const [needsText, setNeedsText] = useState('');
    const [products, setProducts] = useState([]);
    const [checkedIds, setCheckedIds] = useState(new Set());
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [error, setError] = useState('');
    const handledOpenRef = useRef('');

    const existingQtyById = useMemo(() => {
        const map = new Map();
        for (const item of cartItems || []) {
            if (!item?.product) continue;
            map.set(String(item.product), Number(item.quantity || 0));
        }
        return map;
    }, [cartItems]);

    const openWizard = () => {
        setIsOpen(true);
        setStep(0);
        setError('');
    };

    const closeWizard = () => {
        if (working || loadingProducts) return;
        setIsOpen(false);
    };

    const handleFloatingClick = () => {
        openWizard();
    };

    const fetchKitProducts = async () => {
        const query = String(needsText || '').trim();
        if (!query) {
            setError('Please describe all your needs in one line.');
            return;
        }

        setError('');
        setLoadingProducts(true);

        try {
            const { data } = await axios.get('/api/v1/products/make-kit', {
                params: {
                    size: 7,
                    query,
                },
            });

            const list = Array.isArray(data?.products) ? data.products : [];

            if (!list.length) {
                setProducts([]);
                setCheckedIds(new Set());
                setError('Could not build a kit right now. Please try again.');
                return;
            }

            setProducts(list);
            // All items toggled ON by default
            setCheckedIds(new Set(list.map((p) => String(p?._id)).filter(Boolean)));
            setStep(2);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                'Something went wrong while building your kit. Please try again.';
            setProducts([]);
            setError(msg);
        } finally {
            setLoadingProducts(false);
        }
    };

    const addCurrentKitToCartAndGoToCart = async () => {
        if (working) return;
        const itemsToAdd = products.filter((p) => p?._id && checkedIds.has(String(p._id)));
        if (!itemsToAdd.length) {
            alert('Please toggle on at least one product to add to cart.');
            return;
        }

        setWorking(true);

        try {
            for (const p of itemsToAdd) {
                const id = p?._id;
                if (!id) continue;

                const currentQty = existingQtyById.get(String(id)) || 0;
                const nextQty = currentQty > 0 ? currentQty + 1 : 1;
                // addItemsToCart expects the absolute quantity.
                // We pass nextQty to avoid overwriting an existing cart quantity.
                // eslint-disable-next-line no-await-in-loop
                await dispatch(addItemsToCart(id, nextQty));
            }

            navigate('/cart');
            setIsOpen(false);
        } catch (e) {
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                'Could not add the kit to cart. Please make sure the backend is running.';
            alert(msg);
        } finally {
            setWorking(false);
        }
    };

    useEffect(() => {
        const qs = new URLSearchParams(location.search || '');
        const openTarget = String(qs.get('open') || '').toLowerCase();
        const key = `${location.pathname}?${location.search}`;

        if (openTarget !== 'make-my-kit') return;
        if (handledOpenRef.current === key) return;
        handledOpenRef.current = key;

        openWizard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname, location.search]);

    return (
        <>
            <button
                type="button"
                onClick={handleFloatingClick}
                disabled={working}
                aria-label="Make my kit"
                title="Make my Kit"
                className={
                    'group fixed left-6 bottom-6 z-[60] h-20 w-20 rounded-full bg-[var(--lexy-maroon-75)] text-white shadow-lg ' +
                    'flex items-center justify-center overflow-hidden transition-all duration-300 ease-out ' +
                    'hover:w-56 focus:w-56 ' +
                    (working ? 'opacity-80 cursor-wait' : '')
                }
                style={{ zIndex: 10000 }}
            >
                <div className="w-full h-full flex items-center justify-center gap-0 px-0 transition-all duration-300 ease-out group-hover:justify-start group-hover:gap-2 group-hover:px-5 group-focus:justify-start group-focus:gap-2 group-focus:px-5">
                    <span className="shrink-0">
                        <img src={bagIcon} alt="Make my kit" className="w-14 h-14" draggable={false} />
                    </span>

                    <span
                        className={
                            'overflow-hidden whitespace-nowrap font-brandSerif text-[12px] uppercase tracking-widest ' +
                            'max-w-0 opacity-0 -translate-x-2 transition-all duration-300 ease-out ' +
                            'group-hover:max-w-[10rem] group-hover:opacity-100 group-hover:translate-x-0 ' +
                            'group-focus:max-w-[10rem] group-focus:opacity-100 group-focus:translate-x-0'
                        }
                    >
                        {working ? 'ADDING…' : 'MAKE MY KIT'}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[10010] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="w-full sm:max-w-xl bg-[#fff9f7] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[var(--lexy-maroon-25)] mx-0 sm:mx-4 pb-5">
                        <div className="flex items-start justify-between px-5 pt-4 pb-2 border-b border-[var(--lexy-maroon-10)]/60">
                            <div>
                                <h2 className="font-brandSerif text-lg text-[var(--lexy-maroon-90)]">Make My Kit</h2>
                                <p className="mt-1 text-xs text-primary-grey">
                                    A quick 3-step flow to build a kit tailored to all your needs.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeWizard}
                                className="ml-3 rounded-full p-1 text-primary-grey hover:bg-black/5 focus:outline-none"
                                aria-label="Close make my kit"
                            >
                                <span className="block text-lg leading-none">×</span>
                            </button>
                        </div>

                        <div className="px-5 pt-3 pb-1 text-[11px] text-primary-grey flex items-center justify-between">
                            <span>
                                Step {step === 0 ? 1 : step === 1 ? 2 : 3} of 3
                            </span>
                            {loadingProducts && <span className="text-[11px] text-primary-darkBlue">Building your kit…</span>}
                        </div>

                        <div className="px-5 pt-1 pb-4">
                            {step === 0 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-primary-darkBlue">
                                        Tell us everything you want in your routine, and we&apos;ll put together a kit across categories that fits you.
                                    </p>
                                    <ul className="text-xs text-primary-grey list-disc pl-4 space-y-1">
                                        <li>We&apos;ll pick top-rated essentials from different categories.</li>
                                        <li>Perfect when you don&apos;t want to think about every single product.</li>
                                        <li>You can review everything before it goes to your cart.</li>
                                    </ul>
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="w-full inline-flex items-center justify-center rounded-full bg-[var(--lexy-maroon-75)] text-white text-sm font-medium py-2.5 shadow hover:bg-[var(--lexy-maroon-90)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lexy-maroon-75)]"
                                        >
                                            Start
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-primary-darkBlue mb-1">
                                            Define all your needs in one line
                                        </p>
                                        <p className="text-xs text-primary-grey mb-2">
                                            For example: &quot;Dry sensitive skin, daily office wear makeup, fragrance-free, acne-prone, budget friendly.&quot;
                                        </p>
                                        <textarea
                                            rows={3}
                                            value={needsText}
                                            onChange={(e) => setNeedsText(e.target.value)}
                                            className="w-full rounded-2xl border border-[var(--lexy-maroon-10)] bg-white/80 px-3 py-2 text-sm text-primary-darkBlue placeholder:text-primary-grey focus:outline-none focus:ring-2 focus:ring-[var(--lexy-maroon-50)]"
                                            placeholder="Describe everything you want your kit to solve in a single line."
                                        />
                                    </div>

                                    {error && (
                                        <p className="text-xs text-red-600">{error}</p>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setStep(0)}
                                            className="w-full sm:w-auto px-4 py-2 rounded-full border border-[var(--lexy-maroon-25)] text-xs font-medium text-[var(--lexy-maroon-75)] bg-white hover:bg-[var(--lexy-maroon-5)] hover:text-[var(--lexy-maroon-90)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lexy-maroon-25)]"
                                            disabled={loadingProducts}
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={fetchKitProducts}
                                            disabled={loadingProducts}
                                            className="w-full sm:flex-1 inline-flex items-center justify-center rounded-full bg-[var(--lexy-maroon-75)] text-white text-sm font-medium py-2.5 shadow disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[var(--lexy-maroon-90)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lexy-maroon-75)]"
                                        >
                                            {loadingProducts ? 'Finding your kit…' : 'Show my kit'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-primary-darkBlue">
                                            Your curated kit
                                        </p>
                                        <p className="text-xs text-primary-grey">
                                            Toggle items on/off — only checked items will be added to your cart.
                                        </p>
                                    </div>

                                    {products.length > 0 ? (
                                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                            {/* ── Primary section (What you need) ── */}
                                            {products.some((p) => p?.tier === 'primary') && (
                                                <>
                                                    <div className="flex items-center gap-2 pt-1 pb-1">
                                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b4226]">What you need</span>
                                                        <span className="flex-1 h-px bg-[#e8cdb5]" />
                                                    </div>
                                                    {products.filter((p) => p?.tier === 'primary').map((p) => {
                                                        const id = String(p?._id || '');
                                                        const isChecked = checkedIds.has(id);
                                                        return (
                                                            <KitProductCard
                                                                key={id}
                                                                product={p}
                                                                isChecked={isChecked}
                                                                onToggle={() => {
                                                                    setCheckedIds((prev) => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(id)) next.delete(id);
                                                                        else next.add(id);
                                                                        return next;
                                                                    });
                                                                }}
                                                                bgClass="bg-[#fdf3e7]"
                                                                borderClass="border-[#f0d9b5]"
                                                            />
                                                        );
                                                    })}
                                                </>
                                            )}

                                            {/* ── Suggestion section (Goes well with) ── */}
                                            {products.some((p) => p?.tier !== 'primary') && (
                                                <>
                                                    <div className="flex items-center gap-2 pt-2 pb-1">
                                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b5e6b]">Goes well with</span>
                                                        <span className="flex-1 h-px bg-[#edc9d1]" />
                                                    </div>
                                                    {products.filter((p) => p?.tier !== 'primary').map((p) => {
                                                        const id = String(p?._id || '');
                                                        const isChecked = checkedIds.has(id);
                                                        return (
                                                            <KitProductCard
                                                                key={id}
                                                                product={p}
                                                                isChecked={isChecked}
                                                                onToggle={() => {
                                                                    setCheckedIds((prev) => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(id)) next.delete(id);
                                                                        else next.add(id);
                                                                        return next;
                                                                    });
                                                                }}
                                                                bgClass="bg-[#fdf0f3]"
                                                                borderClass="border-[#f2d0d9]"
                                                            />
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-red-600">
                                            {error || 'Could not build a kit right now. Please try again.'}
                                        </p>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setStep(1);
                                                setProducts([]);
                                                setCheckedIds(new Set());
                                            }}
                                            className="w-full sm:w-auto px-4 py-2 rounded-full border border-[var(--lexy-maroon-25)] text-xs font-medium text-[var(--lexy-maroon-75)] bg-white hover:bg-[var(--lexy-maroon-5)] hover:text-[var(--lexy-maroon-90)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lexy-maroon-25)]"
                                            disabled={working}
                                        >
                                            Start over
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addCurrentKitToCartAndGoToCart}
                                            disabled={working || !checkedIds.size}
                                            className="w-full sm:flex-1 inline-flex items-center justify-center rounded-full bg-[var(--lexy-maroon-75)] text-white text-sm font-medium py-2.5 shadow disabled:opacity-70 disabled:cursor-not-allowed hover:bg-[var(--lexy-maroon-90)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lexy-maroon-75)]"
                                        >
                                            {working ? 'Adding to cart…' : `Add ${checkedIds.size} item${checkedIds.size !== 1 ? 's' : ''} to cart`}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ── KitProductCard with themed toggle ─────────────────────────────
const KitProductCard = ({ product, isChecked, onToggle, bgClass, borderClass }) => {
    const p = product || {};
    const id = p._id;
    const name = p.name || '';
    const imageUrl = p.images?.[0]?.url;
    const category = p.category;
    const price = Number(p.price) || 0;

    return (
        <div className={`flex items-center gap-3 rounded-2xl border ${borderClass} ${bgClass} px-3 py-2 shadow-sm transition-opacity ${isChecked ? 'opacity-100' : 'opacity-50'}`}>
            <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-white/70 flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                    <img src={imageUrl} alt={name} className="w-full h-full object-contain" draggable={false} />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-200" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-darkBlue line-clamp-2">{name}</p>
                {category && (
                    <p className="text-[10px] text-primary-grey mt-0.5">{category}</p>
                )}
                <p className="mt-0.5 text-sm font-semibold text-primary-darkBlue">
                    ₹{price.toLocaleString()}
                </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {id && (
                    <Link
                        to={`/product/${id}`}
                        className="text-[11px] font-medium text-[var(--lexy-maroon-75)] hover:text-[var(--lexy-maroon-90)] underline"
                    >
                        View
                    </Link>
                )}
                {/* Toggle switch */}
                <button
                    type="button"
                    onClick={onToggle}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${isChecked ? 'bg-[var(--lexy-maroon-75)]' : 'bg-gray-300'}`}
                    aria-label={isChecked ? 'Remove from kit' : 'Add to kit'}
                >
                    <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform duration-200 ${isChecked ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
                    />
                </button>
            </div>
        </div>
    );
};

export default FloatingMakeMyKit;
