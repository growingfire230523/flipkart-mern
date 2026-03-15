import FavoriteIcon from '@mui/icons-material/Favorite';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToWishlist, removeFromWishlist } from '../../actions/wishlistAction';
import { addToCompare, removeFromCompare } from '../../actions/compareAction';
import { useSnackbar } from 'notistack';
import { addItemsToCart } from '../../actions/cartAction';
import { useNavigate } from 'react-router-dom';
import Rating from '@mui/material/Rating';
import { useEffect, useMemo, useRef, useState } from 'react';
import giftRibbon from '../../assets/images/GIFT_RIBBON.png';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const Product = ({ _id, name, images, ratings, orderCount, price, cuttedPrice, volumeVariants, sizeVariants, isColorProduct, colorVariants, isGiftable, catalogHighlights }) => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const navigate = useNavigate();

    const { wishlistItems } = useSelector((state) => state.wishlist);
    const { cartItems } = useSelector((state) => state.cart);
    const { compareItems } = useSelector((state) => state.compare);

    const itemInWishlist = wishlistItems.some((i) => i.product === _id);
    const [selectedOption, setSelectedOption] = useState('');

    const variantConfig = useMemo(() => {
        const normalizedColor = Array.isArray(colorVariants)
            ? colorVariants
                .map((v) => ({
                    value: String(v?.hex || '').trim().toUpperCase(),
                    name: String(v?.name || '').trim(),
                    hex: String(v?.hex || '').trim().toUpperCase(),
                    price: Number(v?.price),
                    cuttedPrice: Number(v?.cuttedPrice),
                    stock: Number(v?.stock),
                }))
                .filter((v) => v.name && v.hex && (/^#[0-9A-F]{3}$/.test(v.hex) || /^#[0-9A-F]{6}$/.test(v.hex)))
                .filter((v) => Number.isFinite(v.price))
            : [];

        if (Boolean(isColorProduct) && normalizedColor.length > 0) {
            return { type: 'color', label: 'Shade', options: normalizedColor };
        }

        const normalizedSize = Array.isArray(sizeVariants)
            ? sizeVariants
                .map((v) => ({
                    value: String(v?.size || '').trim(),
                    price: Number(v?.price),
                    cuttedPrice: Number(v?.cuttedPrice),
                    stock: Number(v?.stock),
                }))
                .filter((v) => v.value && Number.isFinite(v.price))
            : [];

        if (normalizedSize.length > 0) {
            return { type: 'size', label: 'Size', options: normalizedSize };
        }

        const normalizedVolume = Array.isArray(volumeVariants)
            ? volumeVariants
                .map((v) => ({
                    value: String(v?.volume || '').trim(),
                    price: Number(v?.price),
                    cuttedPrice: Number(v?.cuttedPrice),
                    stock: Number(v?.stock),
                }))
                .filter((v) => v.value && Number.isFinite(v.price))
            : [];

        if (normalizedVolume.length > 0) {
            return { type: 'volume', label: 'Volume', options: normalizedVolume };
        }

        return { type: null, label: '', options: [] };
    }, [isColorProduct, colorVariants, sizeVariants, volumeVariants]);

    useEffect(() => {
        if (variantConfig.options.length <= 0) {
            setSelectedOption('');
            return;
        }

        if (!selectedOption) {
            setSelectedOption(variantConfig.options[0].value);
            return;
        }

        const stillExists = variantConfig.options.some((v) => v.value === selectedOption);
        if (!stillExists) setSelectedOption(variantConfig.options[0].value);
    }, [variantConfig, selectedOption]);

    const selectedVariant = useMemo(() => {
        if (variantConfig.options.length <= 0) return null;
        return variantConfig.options.find((v) => v.value === selectedOption) || variantConfig.options[0];
    }, [variantConfig, selectedOption]);

    const swatchScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        if (variantConfig.type !== 'color') return;
        const el = swatchScrollRef.current;
        if (!el) return;

        const update = () => {
            const maxScrollLeft = el.scrollWidth - el.clientWidth;
            setCanScrollLeft(el.scrollLeft > 0);
            setCanScrollRight(el.scrollLeft < maxScrollLeft - 1);
        };

        update();
        el.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            el.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [variantConfig.type, variantConfig.options.length]);

    const displayPrice = selectedVariant ? selectedVariant.price : price;
    const displayCuttedPrice = selectedVariant ? (selectedVariant.cuttedPrice || selectedVariant.price) : cuttedPrice;

    const itemInCart = cartItems?.some((i) => {
        if (i.product !== _id) return false;
        if (!selectedVariant) return true;
        if (variantConfig.type === 'size') return String(i.size || '') === String(selectedVariant.value || '');
        if (variantConfig.type === 'volume') return String(i.volume || '') === String(selectedVariant.value || '');
        if (variantConfig.type === 'color') return String(i.colorHex || '').toUpperCase() === String(selectedVariant.hex || '').toUpperCase();
        return true;
    });
    const itemInCompare = compareItems?.some((i) => i.product === _id);

    const addToWishlistHandler = () => {
        if (itemInWishlist) {
            dispatch(removeFromWishlist(_id));
            enqueueSnackbar("Remove From Wishlist", { variant: "success" });
        } else {
            dispatch(addToWishlist(_id));
            enqueueSnackbar("Added To Wishlist", { variant: "success" });
        }
    }

    const addToBagHandler = () => {
        if (itemInCart) {
            navigate('/cart');
            return;
        }

        const opts = !selectedVariant
            ? undefined
            : variantConfig.type === 'size'
                ? { size: selectedVariant.value }
                : variantConfig.type === 'volume'
                    ? { volume: selectedVariant.value }
                    : variantConfig.type === 'color'
                        ? { color: { name: selectedVariant.name, hex: selectedVariant.hex } }
                        : undefined;

        dispatch(addItemsToCart(_id, 1, opts));
        enqueueSnackbar('Added To Bag', { variant: 'success' });
    };

    const addToCompareHandler = async () => {
        if (itemInCompare) {
            dispatch(removeFromCompare(_id));
            enqueueSnackbar("Removed From Compare", { variant: "success" });
            return;
        }

        const willReplace = (compareItems?.length || 0) >= 2;
        const nextCount = Math.min(2, (compareItems?.length || 0) + 1);
        await dispatch(addToCompare(_id));
        enqueueSnackbar(willReplace ? "Comparison list updated" : "Added To Compare", { variant: "success" });

        if (nextCount === 2) {
            navigate('/compare');
        }
    };

    const hasDiscount = typeof displayCuttedPrice === 'number' && displayCuttedPrice > displayPrice;
    const safeRating = Number(ratings) || 0;
    const safeOrders = Number(orderCount) || 0;

    const catalogTagItems = useMemo(() => {
        const normal = Array.isArray(catalogHighlights?.normal) ? catalogHighlights.normal : [];
        const active = Array.isArray(catalogHighlights?.active) ? catalogHighlights.active : [];

        const normalize = (arr) => arr
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .slice(0, 6);

        const items = [];
        for (const label of normalize(active)) items.push({ label, type: 'active' });
        for (const label of normalize(normal)) items.push({ label, type: 'normal' });
        return items;
    }, [catalogHighlights]);

    const compareTopPx = 16;
    const compareSizePx = 36;
    const tagsTopPx = compareTopPx + compareSizePx + 8;

    return (
        <div className="px-1.5 sm:px-2 py-3 sm:py-4">
            <div className="group relative h-full bg-white border border-gray-200 rounded-sm overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_18px_45px_rgba(15,23,42,0.16)] hover:-translate-y-1">
                {/* image */}
                <div className="relative bg-gray-50">
                    <Link to={`/product/${_id}`} className="block">
                        <div className="h-60 sm:h-64 md:h-[22rem] w-full flex items-center justify-center p-2 md:p-3 overflow-hidden">
                            <img
                                draggable="false"
                                className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                                src={images?.[0]?.url}
                                alt={name}
                            />
                        </div>
                    </Link>

                    {catalogTagItems.length > 0 && (
                        <div className="pointer-events-none absolute left-4 z-[1] flex flex-col gap-1" style={{ top: tagsTopPx }}>
                            {catalogTagItems.map((t, idx) => (
                                <div
                                    key={`${t.type}-${idx}-${t.label}`}
                                    className={
                                        t.type === 'active'
                                            ? 'bg-red-600/55 text-white rounded-md'
                                            : 'bg-gray-500/55 text-white rounded-md'
                                    }
                                    style={{ maxWidth: 'calc(100% - 4rem)' }}
                                >
                                    <div className="px-2 py-1 text-[11px] font-semibold tracking-wide uppercase truncate">
                                        {t.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isGiftable && (
                        <img
                            src={giftRibbon}
                            alt="Giftable"
                            className="pointer-events-none absolute bottom-0 right-0 z-[1] w-24 h-24 object-contain"
                        />
                    )}

                    {/* wishlist */}
                    <button
                        type="button"
                        onClick={addToWishlistHandler}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full border border-gray-200 bg-white/90 flex items-center justify-center"
                        aria-label={itemInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                        <span className={itemInWishlist ? 'text-primary-blue' : 'text-primary-grey hover:text-primary-blue'}>
                            <FavoriteIcon sx={{ fontSize: '18px' }} />
                        </span>
                    </button>

                    {/* compare */}
                    <button
                        type="button"
                        onClick={addToCompareHandler}
                        className="absolute top-4 left-4 w-9 h-9 rounded-full border border-gray-200 bg-white/90 flex items-center justify-center"
                        aria-label={itemInCompare ? 'Remove from compare' : 'Add to compare'}
                    >
                        <span className={itemInCompare ? 'text-primary-blue' : 'text-primary-grey hover:text-primary-blue'}>
                            <CompareArrowsIcon sx={{ fontSize: '18px' }} />
                        </span>
                    </button>
                </div>

                {/* content */}
                <div className="p-3 sm:p-4">
                    <Link to={`/product/${_id}`} className="block">
                        <h2 className="text-[13px] uppercase tracking-widest text-primary-darkBlue leading-snug hover:text-primary-blue">
                            {name.length > 70 ? `${name.substring(0, 70)}...` : name}
                        </h2>
                    </Link>

                    <div className="mt-2 flex items-center gap-2">
                        <Rating value={safeRating} precision={0.5} readOnly size="small" />
                        <span className="text-xs text-gray-500">({safeOrders.toLocaleString()})</span>
                    </div>

                    {variantConfig.options.length > 0 && (
                        <div className="mt-3">
                            <div className="flex flex-wrap items-baseline gap-1">
                                <span className="text-xs text-gray-500">{variantConfig.label}:</span>
                                {variantConfig.type === 'color' && selectedVariant?.name ? (
                                    <span className="text-xs text-primary-darkBlue font-medium break-words">{selectedVariant.name}</span>
                                ) : null}
                            </div>

                            {variantConfig.type === 'color' ? (
                                <div className="mt-2 relative">
                                    {(canScrollLeft || canScrollRight) && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => swatchScrollRef.current?.scrollBy({ left: -140, behavior: 'smooth' })}
                                                disabled={!canScrollLeft}
                                                aria-label="Scroll shades left"
                                                className={
                                                    `absolute left-0 top-1/2 -translate-y-1/2 z-[1] w-6 h-6 rounded-full border flex items-center justify-center ` +
                                                    (canScrollLeft
                                                        ? 'bg-white/90 border-black/10 text-primary-darkBlue'
                                                        : 'bg-white/60 border-black/5 text-primary-grey cursor-not-allowed opacity-70')
                                                }
                                            >
                                                <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => swatchScrollRef.current?.scrollBy({ left: 140, behavior: 'smooth' })}
                                                disabled={!canScrollRight}
                                                aria-label="Scroll shades right"
                                                className={
                                                    `absolute right-0 top-1/2 -translate-y-1/2 z-[1] w-6 h-6 rounded-full border flex items-center justify-center ` +
                                                    (canScrollRight
                                                        ? 'bg-white/90 border-black/10 text-primary-darkBlue'
                                                        : 'bg-white/60 border-black/5 text-primary-grey cursor-not-allowed opacity-70')
                                                }
                                            >
                                                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
                                            </button>
                                        </>
                                    )}

                                    <div
                                        ref={swatchScrollRef}
                                        className="flex items-center gap-2 overflow-x-auto lexy-hide-scrollbar px-7"
                                    >
                                        {variantConfig.options.slice(0, 12).map((v) => {
                                            const isSelected = String(selectedOption || '').toUpperCase() === String(v.value || '').toUpperCase();
                                            return (
                                                <button
                                                    key={`${v.hex}-${v.name}`}
                                                    type="button"
                                                    onClick={() => setSelectedOption(v.value)}
                                                    title={v.name}
                                                    className="flex-shrink-0"
                                                    aria-label={`Select ${v.name}`}
                                                    aria-pressed={isSelected}
                                                >
                                                    <span
                                                        className={
                                                            'flex items-center justify-center w-5 h-5 rounded-full border p-[2px] ' +
                                                            (isSelected ? 'border-primary-blue' : 'border-gray-300')
                                                        }
                                                        aria-hidden="true"
                                                    >
                                                        <span
                                                            className="block w-full h-full rounded-full"
                                                            style={{ backgroundColor: v.hex }}
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <select
                                    value={selectedOption}
                                    onChange={(e) => setSelectedOption(e.target.value)}
                                    className="mt-1 w-full border border-gray-200 rounded-sm px-3 py-2 text-sm outline-none bg-white"
                                >
                                    {variantConfig.options.map((v) => (
                                        <option key={v.value} value={v.value}>{v.value}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="mt-3 flex items-baseline gap-2">
                        {hasDiscount && (
                            <span className="text-primary-grey line-through text-sm">₹{displayCuttedPrice.toLocaleString()}</span>
                        )}
                        <span className={hasDiscount ? 'text-primary-blue font-medium' : 'text-primary-darkBlue font-medium'}>
                            ₹{displayPrice.toLocaleString()}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={addToBagHandler}
                        className="mt-4 w-full py-3 border border-primary-darkBlue/40 text-primary-darkBlue text-xs uppercase tracking-widest hover:bg-primary-blue hover:text-white hover:border-white"
                    >
                        {itemInCart ? 'GO TO BAG' : 'ADD TO BAG'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Product;
