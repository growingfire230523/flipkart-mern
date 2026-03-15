import Pagination from '@mui/material/Pagination';
import Slider from '@mui/material/Slider';
import Rating from '@mui/material/Rating';
import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useParams } from 'react-router-dom';
import { clearErrors, getProducts } from '../../actions/productAction';
import Loader from '../Layouts/Loader';
import CategoryNavBar from '../Layouts/CategoryNavBar';
import Product from './Product';
import MetaData from '../Layouts/MetaData';
import SearchIcon from '@mui/icons-material/Search';
import { getDiscount } from '../../utils/functions';
import { categories, subCategoriesByCategory } from '../../utils/constants';

const CompactGridTile = ({ product }) => {
    const { _id, name, images, price, cuttedPrice, ratings, orderCount, catalogHighlights } = product;

    const safeRating = Number(ratings) || 0;
    const safeOrders = Number(orderCount) || 0;
    const safePrice = Number(price) || 0;
    const safeCuttedPrice = Number(cuttedPrice) || 0;

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
            className="relative w-[220px] sm:w-[240px] bg-white border border-gray-200 rounded-sm overflow-hidden shrink-0"
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
            <div className="bg-gray-50">
                <div className="h-40 w-full flex items-center justify-center p-3">
                    <img draggable="false" className="w-full h-full object-contain" src={images?.[0]?.url} alt={name} />
                </div>
            </div>
            <div className="p-3">
                <h2 className="text-[13px] font-medium text-primary-darkBlue leading-snug">
                    {name?.length > 40 ? `${name.substring(0, 40)}...` : name}
                </h2>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-primary-darkBlue font-medium">₹{safePrice.toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-xs text-primary-grey">
                        <Rating value={safeRating} precision={0.5} readOnly size="small" />
                        <span>({safeOrders.toLocaleString()})</span>
                    </span>
                </div>
            </div>
        </Link>
    );
};

const DetailedProductRow = ({ product }) => {
    const {
        _id,
        name,
        images,
        brand,
        category,
        subCategory,
        price,
        cuttedPrice,
        ratings,
        numOfReviews,
        orderCount,
        stock,
        highlights,
        catalogHighlights,
    } = product;

    const safeRating = Number(ratings) || 0;
    const safeReviews = Number(numOfReviews) || 0;
    const safeOrders = Number(orderCount) || 0;
    const safeStock = Number(stock);
    const safePrice = Number(price) || 0;
    const safeCuttedPrice = Number(cuttedPrice) || 0;
    const showDiscount = safeCuttedPrice > 0 && safePrice > 0 && safeCuttedPrice > safePrice;
    const discountPct = showDiscount ? getDiscount(safePrice, safeCuttedPrice) : null;

    const tags = (() => {
        const basic = Array.isArray(highlights) ? highlights : [];
        const normal = Array.isArray(catalogHighlights?.normal) ? catalogHighlights.normal : [];
        const active = Array.isArray(catalogHighlights?.active) ? catalogHighlights.active : [];
        return [...active, ...normal, ...basic]
            .map((v) => String(v || '').trim())
            .filter(Boolean)
            .slice(0, 6);
    })();

    return (
        <div className="w-full flex flex-col md:flex-row gap-4 px-4 py-4 border-b border-gray-100">
            <Link to={`/product/${_id}`} className="w-full md:w-[160px] flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-sm p-3">
                <img draggable="false" className="w-full h-40 object-contain" src={images?.[0]?.url} alt={name} />
            </Link>

            <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div>
                        <Link to={`/product/${_id}`} className="block">
                            <h2 className="text-sm font-medium text-primary-darkBlue hover:text-primary-blue">
                                {name}
                            </h2>
                        </Link>
                        <div className="mt-1 text-xs text-primary-grey flex flex-wrap gap-2">
                            {brand?.name && <span className="font-semibold text-primary-darkBlue">Brand: {brand.name}</span>}
                            {category && <span>Category: {category}</span>}
                            {subCategory && <span>Sub-category: {subCategory}</span>}
                            {Number.isFinite(safeStock) && <span>Stock: {safeStock}</span>}
                        </div>
                    </div>

                    <div className="text-right min-w-[140px]">
                        <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="text-xl font-semibold text-primary-darkBlue">₹{safePrice.toLocaleString()}</span>
                            {showDiscount && (
                                <span className="text-xs text-primary-grey line-through">₹{safeCuttedPrice.toLocaleString()}</span>
                            )}
                        </div>
                        {showDiscount && (
                            <div className="text-xs text-green-700 font-medium mt-1">{discountPct}% OFF</div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-primary-grey">
                    <span className="flex items-center gap-1">
                        <Rating value={safeRating} precision={0.5} readOnly size="small" />
                        <span>({safeReviews.toLocaleString()} reviews)</span>
                    </span>
                    {safeOrders > 0 && <span>{safeOrders.toLocaleString()}+ orders</span>}
                </div>

                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {tags.map((t, idx) => (
                            <span
                                key={`${idx}-${t}`}
                                className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[11px] text-primary-darkBlue"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Products = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const params = useParams();
    const location = useLocation();

    const [price, setPrice] = useState([0, 200000]);
    const [priceDraft, setPriceDraft] = useState([0, 200000]);
    const [priceMinInput, setPriceMinInput] = useState('0');
    const [priceMaxInput, setPriceMaxInput] = useState('200000');
    const [category, setCategory] = useState(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get('category') || "";
    });
    const [subCategory, setSubCategory] = useState(() => {
        const searchParams = new URLSearchParams(location.search);
        return searchParams.get('subCategory') || "";
    });
    const [ratings, setRatings] = useState(0);

    const [localSearch, setLocalSearch] = useState('');
    const [sortOption, setSortOption] = useState('default');
    const [filterOption, setFilterOption] = useState('default');
    const [viewCols, setViewCols] = useState(4);

    const [brandFilter, setBrandFilter] = useState('');
    const [minDiscount, setMinDiscount] = useState(0);

    const [selectedFacets, setSelectedFacets] = useState({
        finish: [],
        coverage: [],
        color: [],
        size: [],
        fragranceNote: [],
        exclusivesServices: [],
        formulation: [],
    });

    // pagination
    const [currentPage, setCurrentPage] = useState(1);

    const { products, loading, error, resultPerPage, filteredProductsCount, searchMeta } = useSelector((state) => state.products);
    const keyword = params.keyword;

    // UI-defined options (as provided). These are used instead of Meili facet lists for now.
    const staticFacetOptions = useMemo(
        () => ({
            finish: ['Glow', 'Matte', 'Metallics', 'Satin', 'Shimmer', 'Shine', 'Velvet'],
            color: [
                'Beige',
                'Black',
                'Blue',
                'Brown',
                'Bronze',
                'Burgundy',
                'Champagne',
                'Coral',
                'Copper',
                'Gold',
                'Green',
                'Grey',
                'Lavender',
                'Maroon',
                'Mauve',
                'Nude',
                'Orange',
                'Peach',
                'Pink',
                'Plum',
                'Purple',
                'Red',
                'Rose Gold',
                'Silver',
                'Tan',
                'Teal',
                'White',
                'Yellow',
            ],
            size: [
                'Travel Size (10mL)',
                'Small (30mL)',
                'Medium (40-50mL)',
                'Large (60-100mL)',
                'XL (125-300mL)',
                'Refill',
            ],
            formulation: ['Liquid', 'Powder', 'Stick'],
        }),
        []
    );

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        setCategory(searchParams.get('category') || "");
        setSubCategory(searchParams.get('subCategory') || "");

        const minRaw = searchParams.get('price[gte]');
        const maxRaw = searchParams.get('price[lte]');

        if (minRaw !== null || maxRaw !== null) {
            const MIN = 0;
            const MAX = 200000;

            const parse = (v, fallback) => {
                if (v === null || v === undefined) return fallback;
                const n = Number(String(v).replace(/,/g, '').trim());
                return Number.isFinite(n) ? n : fallback;
            };

            let nextMin = parse(minRaw, MIN);
            let nextMax = parse(maxRaw, MAX);

            nextMin = Math.max(MIN, Math.min(MAX, Math.floor(nextMin)));
            nextMax = Math.max(MIN, Math.min(MAX, Math.floor(nextMax)));

            if (nextMin > nextMax) {
                const temp = nextMin;
                nextMin = nextMax;
                nextMax = temp;
            }

            const next = [nextMin, nextMax];
            setPrice(next);
            setPriceDraft(next);
        }

        setCurrentPage(1);
        // eslint-disable-next-line
    }, [location.search]);

    useEffect(() => {
        setPriceMinInput(String(priceDraft?.[0] ?? 0));
        setPriceMaxInput(String(priceDraft?.[1] ?? 200000));
    }, [priceDraft]);

    const priceHandler = (e, newPrice) => {
        setPriceDraft(newPrice);
    }

    const priceCommitHandler = (e, newPrice) => {
        setPrice(newPrice);
        setCurrentPage(1);
    };

    const commitPriceInputs = () => {
        const MIN = 0;
        const MAX = 200000;

        const parse = (v, fallback) => {
            const raw = String(v ?? '').replace(/,/g, '').trim();
            if (!raw) return fallback;
            const n = Number(raw);
            return Number.isFinite(n) ? n : fallback;
        };

        let nextMin = parse(priceMinInput, MIN);
        let nextMax = parse(priceMaxInput, MAX);

        nextMin = Math.max(MIN, Math.min(MAX, Math.floor(nextMin)));
        nextMax = Math.max(MIN, Math.min(MAX, Math.floor(nextMax)));

        if (nextMin > nextMax) {
            const temp = nextMin;
            nextMin = nextMax;
            nextMax = temp;
        }

        const next = [nextMin, nextMax];
        setPriceDraft(next);
        priceCommitHandler(undefined, next);
    };

    const clearFilters = () => {
        setPrice([0, 200000]);
        setPriceDraft([0, 200000]);
        setCategory("");
        setSubCategory("");
        setRatings(0);
        setSelectedFacets({
            finish: [],
            coverage: [],
            color: [],
            size: [],
            fragranceNote: [],
            exclusivesServices: [],
            formulation: [],
        });
        setBrandFilter('');
        setMinDiscount(0);
        setCurrentPage(1);
    }

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        dispatch(getProducts(keyword, category, subCategory, price, ratings, currentPage, selectedFacets));
    }, [dispatch, keyword, category, subCategory, price, ratings, currentPage, selectedFacets, error, enqueueSnackbar]);

    const facets = searchMeta?.facets || {};
    const facetOptions = useMemo(() => {
        const toSortedOptions = (key) => {
            const dist = facets?.[key] || {};
            return Object.entries(dist)
                .filter(([name]) => String(name || '').trim())
                .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                .map(([name]) => name);
        };
        return {
            finish: toSortedOptions('finish'),
            coverage: toSortedOptions('coverage'),
            color: toSortedOptions('color'),
            size: toSortedOptions('size'),
            fragranceNote: toSortedOptions('fragranceNote'),
            exclusivesServices: toSortedOptions('exclusivesServices'),
            formulation: toSortedOptions('formulation'),
        };
    }, [facets]);

    const toggleFacetValue = (key, value) => {
        setSelectedFacets((prev) => {
            const existing = Array.isArray(prev?.[key]) ? prev[key] : [];
            const hasValue = existing.includes(value);
            const next = hasValue ? existing.filter((v) => v !== value) : [...existing, value];
            return { ...prev, [key]: next };
        });
        setCurrentPage(1);
    };

    const hasLocalControls = useMemo(
        () =>
            Boolean(localSearch.trim()) ||
            sortOption !== 'default' ||
            filterOption !== 'default',
        [localSearch, sortOption, filterOption]
    );

    const visibleProducts = useMemo(() => {
        let list = Array.isArray(products) ? [...products] : [];

        if (localSearch.trim()) {
            const q = localSearch.trim().toLowerCase();
            list = list.filter((p) => String(p?.name || '').toLowerCase().includes(q));
        }

        if (brandFilter.trim()) {
            const q = brandFilter.trim().toLowerCase();
            list = list.filter((p) => String(p?.brand?.name || '').toLowerCase().includes(q));
        }

        if (Array.isArray(selectedFacets.color) && selectedFacets.color.length > 0) {
            const colorFilters = selectedFacets.color.map((c) => String(c || '').toLowerCase());
            list = list.filter((p) => {
                const variants = Array.isArray(p?.colorVariants) ? p.colorVariants : [];
                const names = variants.map((v) => String(v?.name || '').toLowerCase());
                return colorFilters.some((c) => names.includes(c));
            });
        }

        if (Array.isArray(selectedFacets.size) && selectedFacets.size.length > 0) {
            const sizeFilters = selectedFacets.size.map((s) => String(s || '').toLowerCase());
            list = list.filter((p) => {
                const sizes = [
                    ...(Array.isArray(p?.sizeVariants) ? p.sizeVariants.map((v) => String(v?.size || '')) : []),
                    ...(Array.isArray(p?.volumeVariants) ? p.volumeVariants.map((v) => String(v?.volume || '')) : []),
                ].map((s) => s.toLowerCase());
                if (sizes.length === 0) return false;
                return sizeFilters.some((s) => sizes.includes(s));
            });
        }

        if (Array.isArray(price) && price.length === 2) {
            const [minPrice, maxPrice] = price;
            const hasExplicitPriceRange = Number.isFinite(minPrice) && Number.isFinite(maxPrice);

            if (hasExplicitPriceRange) {
                list = list.filter((p) => {
                    const v = Number(p?.price);
                    if (!Number.isFinite(v)) return true;
                    return v >= minPrice && v <= maxPrice;
                });
            }
        }

        if (ratings > 0) {
            list = list.filter((p) => (Number(p?.ratings) || 0) >= ratings);
        }

        if (minDiscount > 0) {
            list = list.filter((p) => {
                const safePrice = Number(p?.price) || 0;
                const safeCutted = Number(p?.cuttedPrice) || 0;
                if (!(safePrice > 0 && safeCutted > safePrice)) return false;
                const pct = Number(getDiscount(safePrice, safeCutted)) || 0;
                return pct >= minDiscount;
            });
        }

        // Filter By dropdown: high-level popularity filters
        switch (filterOption) {
            case 'best-selling':
                list.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
                break;
            case 'top-rated':
                list.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
                break;
            case 'most-favorite':
                list.sort((a, b) => (b.numOfReviews || 0) - (a.numOfReviews || 0));
                break;
            default:
                break;
        }

        // Sort By dropdown: price/rating/alphabetical
        switch (sortOption) {
            case 'price-asc':
                list.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price-desc':
                list.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'rating-asc':
                list.sort((a, b) => (a.ratings || 0) - (b.ratings || 0));
                break;
            case 'rating-desc':
                list.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
                break;
            case 'alpha-asc':
                list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
                break;
            case 'alpha-desc':
                list.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
                break;
            default:
                break;
        }

        return list;
    }, [products, localSearch, brandFilter, ratings, minDiscount, selectedFacets, sortOption, filterOption, price]);

    const gridColsClass = useMemo(() => {
        if (viewCols === 5) return 'sm:grid-cols-5';
        return 'sm:grid-cols-4';
    }, [viewCols]);

    const itemsFound = useMemo(() => {
        if (hasLocalControls) return visibleProducts.length;
        if (Number.isFinite(filteredProductsCount)) return filteredProductsCount;
        return visibleProducts.length;
    }, [hasLocalControls, visibleProducts.length, filteredProductsCount]);

    const pageTitle = useMemo(() => {
        if (keyword) return `${keyword} Products`;
        if (subCategory) return `${subCategory} Products`;
        if (category) return `${category} Products`;
        return 'All Products';
    }, [keyword, category, subCategory]);

    const breadcrumbItems = useMemo(() => {
        const normalizeLabel = (v) => String(v || '').trim();
        const toUpper = (v) => normalizeLabel(v).toUpperCase();

        const items = [{ label: 'HOME', to: '/' }];

        if (category) {
            items.push({ label: toUpper(category) });
        } else {
            items.push({ label: 'SHOP ALL' });
        }

        if (subCategory) {
            items.push({ label: toUpper(subCategory) });
        }

        return items;
    }, [category, subCategory]);

    const renderViewIcon = (cols) => {
        if (cols === 4) {
            return <span className="w-5 h-5 bg-current rounded-sm" />;
        }

        if (cols === 5) {
            const cellClass = 'w-2.5 h-2.5 bg-current rounded-sm';
            return (
                <div className="grid grid-cols-2 gap-[2px]">
                    <span className={cellClass} />
                    <span className={cellClass} />
                    <span className={cellClass} />
                    <span className={cellClass} />
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-[3px]">
                <span className="h-[4px] w-6 bg-current rounded-sm" />
                <span className="h-[4px] w-6 bg-current rounded-sm" />
                <span className="h-[4px] w-6 bg-current rounded-sm" />
            </div>
        );
    };

    return (
        <>
            <MetaData title="All Products | Flipkart" />

            <CategoryNavBar />
            <main className="w-full mt-1 sm:mt-2">

                {/* <!-- row --> */}
                <div className="flex flex-col gap-2 sm:gap-3 mt-1 sm:mt-2 sm:mx-3 m-auto mb-5 sm:mb-7">

                    {/* header + search/sort/filter bar (match sample UI) */}
                    <div className="bg-white rounded-sm shadow-sm px-3 py-2 sm:px-4 border border-black/10 w-full">
                        <div className="flex flex-col gap-2 sm:gap-3">
                            {/* top row: breadcrumb + search */}
                            <div className="flex flex-wrap items-start gap-2 sm:gap-3">
                                <div className="min-w-[140px] flex-1">
                                    <nav className="text-[11px] uppercase tracking-wide text-primary-grey flex items-center gap-2 mb-1">
                                        {breadcrumbItems.map((item, idx) => {
                                            const isLast = idx === breadcrumbItems.length - 1;
                                            const content = item.to ? (
                                                <Link to={item.to} className={isLast ? 'text-primary-darkBlue' : 'hover:text-primary-darkBlue'}>
                                                    {item.label}
                                                </Link>
                                            ) : (
                                                <span className={isLast ? 'text-primary-darkBlue' : ''}>{item.label}</span>
                                            );

                                            return (
                                                <span key={`${item.label}-${idx}`} className="flex items-center gap-2">
                                                    {idx > 0 && <span className="text-primary-grey">&gt;</span>}
                                                    {content}
                                                </span>
                                            );
                                        })}
                                    </nav>
                                    <h1 className="text-sm sm:text-base font-medium text-primary-darkBlue leading-tight">{pageTitle}</h1>
                                    <p className="text-[11px] sm:text-xs italic text-primary-grey mt-0.5 sm:mt-0">
                                        {itemsFound} {itemsFound === 1 ? 'item' : 'items'} found
                                    </p>
                                </div>

                                <div className="flex-1 min-w-[160px] flex justify-end">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                        }}
                                        className="w-full max-w-xs sm:max-w-sm md:max-w-md flex items-center justify-between bg-primary-yellow bg-opacity-20 rounded-full px-4 sm:px-5 py-1.5"
                                    >
                                        <input
                                            type="search"
                                            value={localSearch}
                                            onChange={(e) => setLocalSearch(e.target.value)}
                                            placeholder={keyword ? `Search \\u201c${keyword}\\u201d ...` : 'Search for items...'}
                                            className="flex-1 bg-transparent text-[11px] sm:text-sm outline-none text-primary-darkBlue placeholder:text-primary-darkBlue"
                                        />
                                        <button
                                            type="submit"
                                            className="flex items-center justify-center text-primary-darkBlue hover:text-primary-blue transition-colors"
                                            aria-label="Search products"
                                        >
                                            <SearchIcon sx={{ fontSize: 20 }} />
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* bottom row: sort / filter / view (hidden on mobile except view) */}
                            <div className="w-full lg:w-auto hidden sm:flex flex-col sm:flex-row items-stretch lg:items-end justify-end gap-3 sm:gap-4">
                                <fieldset className="min-w-[170px] sm:min-w-[190px] border border-gray-300 rounded-md px-3 pb-1">
                                    <legend className="px-1 text-xs text-primary-grey">Sort by</legend>
                                    <select
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                        className="w-full bg-transparent text-sm text-primary-darkBlue outline-none py-1.5"
                                    >
                                        <option value="default">Default</option>
                                        <option value="price-asc">Price (Low to High)</option>
                                        <option value="price-desc">Price (High to Low)</option>
                                        <option value="rating-asc">Rating (Low to High)</option>
                                        <option value="rating-desc">Rating (High to Low)</option>
                                        <option value="alpha-asc">Alphabetical (A To Z)</option>
                                        <option value="alpha-desc">Alphabetical (Z To A)</option>
                                    </select>
                                </fieldset>

                                <fieldset className="min-w-[170px] sm:min-w-[190px] border border-gray-300 rounded-md px-3 pb-1">
                                    <legend className="px-1 text-xs text-primary-grey">Filter by</legend>
                                    <select
                                        value={filterOption}
                                        onChange={(e) => setFilterOption(e.target.value)}
                                        className="w-full bg-transparent text-sm text-primary-darkBlue outline-none py-1.5"
                                    >
                                        <option value="default">Default</option>
                                        <option value="best-selling">Best Selling</option>
                                        <option value="top-rated">Top Rated</option>
                                        <option value="most-favorite">Most Favorite</option>
                                    </select>
                                </fieldset>

                                <div className="min-w-[150px] hidden sm:block">
                                    <div className="text-xs text-primary-grey mb-1">View</div>
                                    <div className="flex items-center gap-2">
                                        {[4, 5, 8].map((n) => {
                                            const active = viewCols === n;
                                            return (
                                                <button
                                                    key={n}
                                                    type="button"
                                                    onClick={() => setViewCols(n)}
                                                    className={
                                                        'w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center text-primary-darkBlue ' +
                                                        (active ? 'bg-primary-yellow bg-opacity-20' : 'bg-white')
                                                    }
                                                    aria-label={`View mode ${n}`}
                                                >
                                                    {renderViewIcon(n)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 sm:gap-3 items-start">
                        {/* sidebar filters */}
                        <aside className="w-full md:w-72 lg:w-80 bg-white rounded-md shadow-md border border-gray-200 p-3 sm:p-4 flex-shrink-0">
                            <div className="flex items-center justify-between pb-2 sm:pb-3 mb-3 sm:mb-4 border-b border-gray-200">
                                <h2 className="text-sm sm:text-base font-semibold text-primary-darkBlue">Filters</h2>
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-xs text-primary-blue hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>

                            {/* SubCategory + Brand (side by side) */}
                            <div className="mb-3 sm:mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <fieldset className="border border-gray-300 rounded-md px-3 pb-1">
                                    <legend className="px-1 text-xs text-primary-grey font-medium">SubCategory</legend>
                                    <select
                                        value={subCategory}
                                        onChange={(e) => {
                                            setSubCategory(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full bg-transparent text-sm text-primary-darkBlue outline-none py-1.5"
                                    >
                                        <option value="">All SubCategories</option>
                                        {(subCategoriesByCategory[category] || []).map((sc) => (
                                            <option key={sc} value={sc}>{sc}</option>
                                        ))}
                                    </select>
                                </fieldset>

                                <fieldset className="border border-gray-300 rounded-md px-3 pb-2">
                                    <legend className="px-1 text-xs text-primary-grey font-medium">Brand</legend>
                                    <input
                                        type="search"
                                        value={brandFilter}
                                        onChange={(e) => setBrandFilter(e.target.value)}
                                        placeholder="Search brand..."
                                        className="w-full bg-transparent text-sm text-primary-darkBlue outline-none py-1 placeholder:text-primary-grey/70"
                                    />
                                </fieldset>
                            </div>

                            {/* Price: only min / max fields */}
                            <div className="mb-4 sm:mb-5">
                                <span className="text-xs font-semibold text-primary-grey uppercase tracking-wide">Price</span>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <fieldset className="border border-gray-300 rounded-md px-3 pb-1">
                                        <legend className="px-1 text-[11px] text-primary-grey">Min</legend>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={200000}
                                            step={1}
                                            value={priceMinInput}
                                            onChange={(e) => setPriceMinInput(e.target.value)}
                                            onBlur={commitPriceInputs}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitPriceInputs();
                                            }}
                                            className="w-full bg-transparent text-sm text-primary-darkBlue outline-none py-1"
                                            placeholder="0"
                                            aria-label="Minimum price"
                                        />
                                    </fieldset>

                                    <fieldset className="border border-gray-300 rounded-md px-3 pb-1">
                                        <legend className="px-1 text-[11px] text-primary-grey">Max</legend>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={200000}
                                            step={1}
                                            value={priceMaxInput}
                                            onChange={(e) => setPriceMaxInput(e.target.value)}
                                            onBlur={commitPriceInputs}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitPriceInputs();
                                            }}
                                            className="w-full bg-transparent text-sm text-primary-darkBlue outline-none py-1"
                                            placeholder="200000"
                                            aria-label="Maximum price"
                                        />
                                    </fieldset>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="mb-3 sm:mb-4">
                                <div className="text-xs font-semibold text-primary-grey uppercase tracking-wide mb-2">Rating</div>
                                <div className="flex flex-wrap gap-2 text-xs text-primary-darkBlue">
                                    {[0, 4, 3].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => {
                                                setRatings(r);
                                                setCurrentPage(1);
                                            }}
                                            className={
                                                'px-2.5 py-1 rounded-full border text-[11px] ' +
                                                (ratings === r
                                                    ? 'border-primary-blue bg-primary-blue text-white'
                                                    : 'border-gray-300 bg-white text-primary-darkBlue')
                                            }
                                        >
                                            {r === 0 ? 'Any' : `${r}+ ★`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Discount */}
                            <div className="mb-3 sm:mb-4">
                                <div className="text-xs font-semibold text-primary-grey uppercase tracking-wide mb-2">Discount</div>
                                <div className="flex flex-wrap gap-2 text-xs text-primary-darkBlue">
                                    {[0, 10, 20, 30].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setMinDiscount(d)}
                                            className={
                                                'px-2.5 py-1 rounded-full border text-[11px] ' +
                                                (minDiscount === d
                                                    ? 'border-primary-blue bg-primary-blue text-white'
                                                    : 'border-gray-300 bg-white text-primary-darkBlue')
                                            }
                                        >
                                            {d === 0 ? 'Any' : `${d}%+`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* <!-- content column --> */}
                        <div className="flex-1">

                        {!loading && visibleProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center gap-3 bg-white shadow-sm rounded-sm p-6 sm:p-16">
                                <img draggable="false" className="w-1/2 h-44 object-contain" src="https://static-assets-web.flixcart.com/www/linchpin/fk-cp-zion/img/error-no-search-results_2353c5.png" alt="Search Not Found" />
                                <h1 className="text-2xl font-medium text-gray-900">Sorry, no results found!</h1>
                                <p className="text-xl text-center text-primary-grey">Please check the spelling or try searching for something else</p>
                            </div>
                        )}

                        {loading ? <Loader /> : (
                            <div className="flex flex-col gap-2 pb-3 sm:pb-4 justify-center items-center w-full overflow-hidden bg-white">

                                {viewCols === 8 ? (
                                    <div className="w-full place-content-start overflow-hidden pb-4 border-b">
                                        {visibleProducts.map((product) => (
                                            <DetailedProductRow key={product._id} product={product} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`grid grid-cols-2 ${gridColsClass} w-full place-content-start overflow-hidden pb-3 sm:pb-4 border-b`}>
                                        {visibleProducts.map((product) => (
                                            viewCols === 5 ? (
                                                <CompactGridTile key={product._id} product={product} />
                                            ) : (
                                                <Product {...product} key={product._id} />
                                            )
                                        ))}
                                    </div>
                                )}
                                {!hasLocalControls && filteredProductsCount > resultPerPage && (
                                    <Pagination
                                        count={Number(((filteredProductsCount + 6) / resultPerPage).toFixed())}
                                        page={currentPage}
                                        onChange={(e, val) => setCurrentPage(val)}
                                        color="primary"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    {/* <!-- content column --> */}
                </div>
                {/* <!-- filters + content row --> */}
            </div>
            {/* <!-- row --> */}

        </main>
        </>
    );
};

export default Products;
