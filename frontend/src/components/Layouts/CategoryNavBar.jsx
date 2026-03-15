import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { categories } from '../../utils/constants';
import { useBannerTheme } from '../../context/BannerThemeContext';

const getActiveCategory = (search) => {
    try {
        const params = new URLSearchParams(search);
        return params.get('category');
    } catch {
        return null;
    }
};

const isShopAt99Active = (pathname, search) => {
    if (pathname !== '/products') return false;

    try {
        const params = new URLSearchParams(search);
        const min = Number(params.get('price[gte]'));
        const max = Number(params.get('price[lte]'));

        if (!Number.isFinite(min) || !Number.isFinite(max)) return false;

        return min === 0 && max === 99;
    } catch {
        return false;
    }
};

const buildProductsUrl = ({ category, subCategory }) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (subCategory) params.set('subCategory', subCategory);
    const qs = params.toString();
    return qs ? `/products?${qs}` : '/products';
};

const CategoryNavBar = () => {
    const location = useLocation();
    const activeCategory = getActiveCategory(location.search);

    const [useWhiteBackground, setUseWhiteBackground] = useState(location.pathname !== '/');

    const { smokeColor } = useBannerTheme();

    const solidNavbarBg = useMemo(() => {
        const base = { r: 247, g: 241, b: 230 }; // #f7f1e6
        const raw = String(smokeColor || '').trim();

        const rgbaMatch = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+)\s*)?\)/i);
        if (!rgbaMatch) return `rgb(${base.r}, ${base.g}, ${base.b})`;

        const r = Math.min(255, Math.max(0, Number(rgbaMatch[1])));
        const g = Math.min(255, Math.max(0, Number(rgbaMatch[2])));
        const b = Math.min(255, Math.max(0, Number(rgbaMatch[3])));
        const inputAlpha = rgbaMatch[4] === undefined ? 1 : Math.min(1, Math.max(0, Number(rgbaMatch[4])));

        // Strengthen the blend so the navbar background more closely matches
        // the current banner while preserving the existing theme and transitions.
        const a = Math.min(0.9, Math.max(0.72, 0.62 + inputAlpha * 0.38));

        const blend = (baseC, overlayC) => Math.round((1 - a) * baseC + a * overlayC);
        return `rgb(${blend(base.r, r)}, ${blend(base.g, g)}, ${blend(base.b, b)})`;
    }, [smokeColor]);

    const useLightNavbarText = useMemo(() => {
        if (useWhiteBackground) return false;

        const raw = String(solidNavbarBg || '').trim();
        const rgbMatch = raw.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
        if (!rgbMatch) return false;

        const r8 = Math.min(255, Math.max(0, Number(rgbMatch[1])));
        const g8 = Math.min(255, Math.max(0, Number(rgbMatch[2])));
        const b8 = Math.min(255, Math.max(0, Number(rgbMatch[3])));

        const toLinear = (v8) => {
            const v = v8 / 255;
            return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };

        const r = toLinear(r8);
        const g = toLinear(g8);
        const b = toLinear(b8);

        // WCAG relative luminance; if background is dark, switch to light text.
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luminance < 0.55;
    }, [solidNavbarBg, useWhiteBackground]);

    useEffect(() => {
        const isHome = location.pathname === '/';
        if (!isHome) {
            setUseWhiteBackground(true);
            return;
        }

        const update = () => {
            const bannerEl = document.getElementById('home-banner');
            if (!bannerEl) {
                // Home page before banner mounts: keep themed background.
                setUseWhiteBackground(false);
                return;
            }

            const bannerRect = bannerEl.getBoundingClientRect();
            const bannerBottomY = bannerRect.bottom + window.scrollY;
            const scrollY = window.scrollY || 0;

            // Once the banner is scrolled past, switch to white.
            setUseWhiteBackground(scrollY >= bannerBottomY - 8);
        };

        update();
        requestAnimationFrame(update);

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [location.pathname]);

    const [openMenu, setOpenMenu] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, maxHeight: 0 });

    const mid = Math.ceil(categories.length / 2);
    const leftCategories = categories.slice(0, mid);
    const rightCategories = categories.slice(mid);

    const linkClassName = (isActive) => {
        const base = 'text-[14px] uppercase tracking-widest border-b-2 pb-1 transition-colors duration-300 flex-shrink-0';

        if (useWhiteBackground) {
            return isActive
                ? `${base} font-semibold text-black border-black`
                : `${base} font-medium text-black/80 border-transparent hover:text-black hover:border-black`;
        }

        if (useLightNavbarText) {
            return isActive
                ? `${base} font-semibold text-white border-white`
                : `${base} font-medium text-white/90 border-transparent hover:text-white hover:border-white`;
        }

        return isActive
            ? `${base} font-semibold text-black border-black`
            : `${base} font-medium text-black/80 border-transparent hover:text-black hover:border-black`;
    };

    const dropdownMenus = useMemo(() => {
        const momAndBabyMenu = {
            columns: 1,
            widthClassName: 'w-80',
            widthPx: 320,
            cols: [
                {
                    colTitle: '',
                    items: ['Johnson & Johnsons', 'Chicco', 'Mothercare', 'Cetaphil', "Palmer’s", 'Sebamed'],
                },
            ],
        };

        const giftsMenu = {
            columns: 1,
            widthClassName: 'w-64',
            widthPx: 256,
            cols: [
                {
                    colTitle: '',
                    items: ['For Him', 'For Her'],
                },
            ],
        };

        const innerwearMenu = {
            columns: 3,
            widthClassName: 'w-[1000px]',
            widthPx: 1000,
            cols: [
                {
                    colTitle: 'KIDS',
                    items: ['Girls Vest', 'Boys Underwear', 'Boys Vest'],
                },
                {
                    colTitle: 'MENS',
                    items: ['Boxers', 'Lowers', 'T-Shirts', 'Underwear', 'Vest'],
                },
                {
                    colTitle: 'WOMENS LINGERIE',
                    items: ['Bras', 'Panties', 'Women T-Shirts'],
                },
            ],
        };

        const mensGroomingMenu = {
            columns: 1,
            widthClassName: 'w-96',
            widthPx: 384,
            cols: [
                {
                    colTitle: '',
                    items: [
                        'After Shaves',
                        'Beard Color',
                        'Shaving Cream, Gel & Foam',
                        'Shaving Razors & Blades',
                        'Hair Styling',
                        'Deodorants & Mists',
                        'Deo Sticks & Roll Ons',
                        'Beard Oil',
                    ],
                },
            ],
        };

        const bathAndBodyMenu = {
            columns: 4,
            widthClassName: 'w-[1200px]',
            widthPx: 1200,
            cols: [
                {
                    colTitle: 'PERFUMES',
                    items: [],
                    subItems: ['Mens Perfumes', 'Womens Perfumes', 'Body Sprays & Mists', 'Deodorants & Roll Ons'],
                },
                {
                    colTitle: 'BATH & BODY',
                    items: [
                        'Shower Gel',
                        'Lotions & Creams',
                        'Body Scrubs & Polish',
                        'Body Oils',
                        'Soaps',
                        'Hand Wash & Sanitizers',
                        'Room Freshners',
                    ],
                },
                {
                    colTitle: 'GROOMING',
                    items: [],
                    subItems: [
                        'Oral Care',
                        'Face Wipes',
                        'Loofahs & Scrubbers',
                        'Talcum powder',
                        'Toiletries & Tissues',
                        'Tools & Accessories',
                    ],
                },
                {
                    colTitle: 'FEMALE HYGIENE',
                    items: [],
                    subItems: ['Bleach & Hair Removal', 'Hair Removal Wax'],
                },
            ],
        };

        const skinCareMenu = {
            linkColTitle: true,
            columns: 5,
            widthClassName: 'w-[1200px]',
            widthPx: 1200,
            cols: [
                { colTitle: 'Face Mask', items: [] },
                { colTitle: 'Lotions & Creams', items: [] },
                { colTitle: 'Face Wash & Cleanser', items: [] },
                { colTitle: 'Serums & Oils', items: [] },
                { colTitle: 'Scrubs & Exfoliators', items: [] },
                { colTitle: 'Hand & Nail Cream', items: [] },
                { colTitle: 'Foot Cream', items: [] },
                { colTitle: 'Skin Toner & Makeup Remover', items: [] },
                { colTitle: 'Eye Care', items: [] },
                { colTitle: 'Sunscreen', items: [] },
            ],
        };

        const professionalMenu = {
            variant: 'tiles',
            columns: 5,
            widthClassName: 'w-[1200px]',
            widthPx: 1200,
            cols: [
                { colTitle: "L'OREAL PROFESSIONAL", items: [] },
                { colTitle: 'SCHWARZKOPF PROFESSIONAL', items: [] },
                { colTitle: 'KRYOLAN MAKEUP', items: [] },
                { colTitle: 'KERASTASE', items: [] },
                { colTitle: 'WELLA', items: [] },
                { colTitle: 'MATRIX', items: [] },
                { colTitle: 'OLAPLEX', items: [] },
            ],
        };

        const makeupMenu = {
            columns: 4,
            widthClassName: 'w-[1100px]',
            widthPx: 1100,
            cols: [
                {
                    colTitle: 'FACE',
                    items: [
                        'Face Primer',
                        'Concealer',
                        'Foundation',
                        'Compact',
                        'Loose Powder',
                        'Blush',
                        'Bronzer',
                        'BB & CC Cream',
                        'Highlighters',
                        'Setting Spray',
                        'Makeup Remover',
                        'Face and Body Glitter',
                        'Highlighter',
                        'Illuminator',
                        'Loose Powder',
                    ],
                },
                {
                    colTitle: 'EYES',
                    items: [
                        'Kajal',
                        'Eyeliner',
                        'Mascara',
                        'Eye Shadow',
                        'Eye Brow Enhancers',
                        'Eye Primer',
                        'False Eyelashes',
                        'Eye Makeup Remover',
                    ],
                    subTitle: 'MAKEUP KITS',
                    subItems: ['Eye Palettes', 'Face Palettes'],
                },
                {
                    colTitle: 'LIPS',
                    items: ['Lipstick', 'Lip Gloss', 'Lip Liner', 'Lip Balm', 'Lip Primer', 'lipstick kit'],
                    subTitle: 'NAILS',
                    subItems: ['Nail Polish', 'Nail Polish Remover', 'Manicure and Pedicure Kits', 'Nail Tool'],
                },
                {
                    colTitle: 'TOOLS AND BRUSHES',
                    items: ['Brushes', 'Sponges & Applicators', 'Eyelash Curlers', 'Tweezers', 'Sharpeners', 'Mirrors'],
                },
            ],
        };

        const hairCareMenu = {
            linkColTitle: true,
            columns: 5,
            widthClassName: 'w-[1200px]',
            widthPx: 1200,
            cols: [
                {
                    colTitle: 'SHAMPOO',
                    items: [],
                },
                {
                    colTitle: 'CONDITIONER',
                    items: [],
                },
                {
                    colTitle: 'HAIR MASKS',
                    items: [],
                },
                {
                    colTitle: 'HAIR COLOR',
                    items: [],
                },
                {
                    colTitle: 'HAIR COLOR DEVELOPERS',
                    items: [],
                },
                {
                    colTitle: 'HAIR OIL',
                    items: [],
                },
                {
                    colTitle: 'HAIR TREATMENTS',
                    items: [],
                },
                {
                    colTitle: 'HAIR STYLING',
                    items: [],
                    subItems: ['Hair Gel', 'Hair Spray'],
                },
                {
                    colTitle: 'HAIR SERUM',
                    items: [],
                },
                {
                    colTitle: 'TOOLS & ACCESSORIES',
                    items: [],
                    subItems: ['Hair Brush', 'Hair comb'],
                },
            ],
        };

        const fragrancesMenu = {
            columns: 4,
            widthClassName: 'w-[800px]',
            widthPx: 800,
            cols: [
                { colTitle: '', items: ['Premium Perfumes'] },
                { colTitle: '', items: ['Mens Perfumes'] },
                { colTitle: '', items: ['Womens Perfumes'] },
                { colTitle: '', items: ['Deodorant & Roll Ons'] },
            ],
        };

        return {
            MAKEUP: makeupMenu,
            'HAIR CARE': hairCareMenu,
            FRAGRANCES: fragrancesMenu,
            PROFESSIONAL: professionalMenu,
            'SKIN CARE': skinCareMenu,
            'BATH & BODY': bathAndBodyMenu,
            'MENS GROOMING': mensGroomingMenu,
            INNERWEAR: innerwearMenu,
            GIFTS: giftsMenu,
            'MOM & BABY': momAndBabyMenu,
        };
    }, []);

    const openDropdownAt = (name, element) => {
        const menu = dropdownMenus[name];
        const menuWidth = Math.min(menu?.widthPx ?? 600, window.innerWidth - 16);
        const rect = element.getBoundingClientRect();
        const barRect = element.closest('.categoryNavHideScrollbar')?.getBoundingClientRect?.();
        const navRect = element.closest('nav')?.getBoundingClientRect?.();
        const desiredLeft = rect.left + rect.width / 2 - menuWidth / 2;
        const clampedLeft = Math.max(8, Math.min(desiredLeft, window.innerWidth - menuWidth - 8));
        const anchorBottom = barRect?.bottom ?? navRect?.bottom ?? rect.bottom;
        const top = anchorBottom + 8;
        const maxHeight = Math.max(240, window.innerHeight - top - 16);

        setMenuPosition({ left: clampedLeft, top, maxHeight });
        setOpenMenu(name);
    };

    const renderCategoryLink = (name) => {
        const menu = dropdownMenus[name];
        if (!menu) {
            return (
                <Link
                    key={name}
                    to={`/products?category=${encodeURIComponent(name)}`}
                    className={linkClassName(activeCategory === name)}
                >
                    {name}
                </Link>
            );
        }

        const isOpen = openMenu === name;
        const gridColsClassName =
            menu.columns === 5
                ? 'grid-cols-5'
                : menu.columns === 3
                    ? 'grid-cols-3'
                : menu.columns === 4
                    ? 'grid-cols-4'
                    : menu.columns === 1
                        ? 'grid-cols-1'
                        : 'grid-cols-4';

        const isTileMenu = menu.variant === 'tiles';
        const isWrapMenu = menu.variant === 'wrap';

        const getColumnStripeClassName = (idx) => {
            const colsCount = menu.columns ?? 4;
            const colIdx = ((idx % colsCount) + colsCount) % colsCount;
            return colIdx % 2 === 1 ? 'bg-primary-yellow/10' : 'bg-white';
        };

        const tileColsToRender = isTileMenu
            ? (() => {
                const items = [...(menu.cols ?? [])];
                const colsCount = menu.columns ?? 4;
                const remainder = items.length % colsCount;
                if (remainder !== 0) {
                    items.push(...Array(colsCount - remainder).fill(null));
                }
                return items;
            })()
            : null;

        const renderSubCategoryLink = (subCategory, key) => {
            // For GIFTS, show all products that have the gift tag (isGiftable=true),
            // regardless of the specific "For Him" / "For Her" label.
            const to =
                name === 'GIFTS'
                    ? '/products?isGiftable=true'
                    : buildProductsUrl({ category: name, subCategory });

            return (
                <Link
                    key={key}
                    to={to}
                    onClick={() => setOpenMenu(null)}
                    className="hover:text-primary-darkBlue"
                >
                    {subCategory}
                </Link>
            );
        };

        return (
            <div
                key={name}
                className="relative"
                onMouseEnter={(e) => openDropdownAt(name, e.currentTarget)}
                onMouseLeave={() => setOpenMenu(null)}
            >
                <Link to={`/products?category=${encodeURIComponent(name)}`} className={linkClassName(activeCategory === name)}>
                    {name}
                </Link>

                <div
                    aria-hidden={!isOpen}
                    style={{ left: menuPosition.left, top: menuPosition.top, maxHeight: menuPosition.maxHeight }}
                    className={
                        'hidden sm:block ' +
                        'fixed z-30 ' +
                        `${menu.widthClassName} max-w-[calc(100vw-1rem)] ` +
                        'rounded-lg border border-white/60 shadow-2xl overflow-hidden ' +
                        'overflow-auto overscroll-contain ' +
                        'transform-gpu origin-top transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ' +
                        (isOpen
                            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                            : 'opacity-0 -translate-y-1 scale-95 pointer-events-none')
                    }
                >
                    {isTileMenu ? (
                        <div className={`grid ${gridColsClassName} bg-white`}>
                            {tileColsToRender.map((col, idx) => (
                                <div
                                    key={col ? `${col.colTitle}-${idx}` : `empty-${idx}`}
                                    className={getColumnStripeClassName(idx)}
                                >
                                    <div className="px-8 py-6 min-w-0">
                                        {col ? (
                                            <Link
                                                to={buildProductsUrl({ category: name, subCategory: col.colTitle })}
                                                onClick={() => setOpenMenu(null)}
                                                className="block text-center text-sm uppercase tracking-widest font-semibold text-primary-darkBlue whitespace-normal break-words leading-snug hover:opacity-90"
                                            >
                                                {col.colTitle}
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`grid ${gridColsClassName} bg-white`}>
                            {menu.cols.map((col, idx) => (
                                <div key={`${col.colTitle}-${idx}`} className={getColumnStripeClassName(idx)}>
                                    <div className="px-8 py-6">
                                        {col.colTitle ? (
                                            menu.linkColTitle ? (
                                                <Link
                                                    to={buildProductsUrl({ category: name, subCategory: col.colTitle })}
                                                    onClick={() => setOpenMenu(null)}
                                                    className="block text-sm uppercase tracking-widest font-semibold text-primary-darkBlue whitespace-normal break-words leading-snug hover:opacity-90"
                                                >
                                                    {col.colTitle}
                                                </Link>
                                            ) : (
                                                <div className="text-sm uppercase tracking-widest font-semibold text-primary-darkBlue whitespace-normal break-words leading-snug">
                                                    {col.colTitle}
                                                </div>
                                            )
                                        ) : null}

                                        {col.items?.length > 0 && (
                                            <div
                                                className={
                                                    isWrapMenu
                                                        ? `${col.colTitle ? 'mt-4' : ''} flex flex-wrap gap-x-12 gap-y-6 text-[16px] text-primary-grey`
                                                        : `${col.colTitle ? 'mt-4' : ''} flex flex-col gap-3 text-[16px] text-primary-grey`
                                                }
                                            >
                                                {col.items.map((label, i) => renderSubCategoryLink(label, `${label}-${i}`))}
                                            </div>
                                        )}

                                        {col.subTitle && (
                                            <div className="mt-8 text-sm uppercase tracking-widest font-semibold text-primary-darkBlue">
                                                {col.subTitle}
                                            </div>
                                        )}

                                        {col.subItems?.length > 0 && (
                                            <div className="mt-4 flex flex-col gap-3 text-[16px] text-primary-grey">
                                                {col.subItems.map((label, i) => renderSubCategoryLink(label, `${label}-${i}`))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="sticky top-[4.5rem] z-[5] px-2 md:px-0 mt-2" aria-label="Category navigation">
            <nav
                className={`mx-auto w-full max-w-screen-2xl shadow rounded-full overflow-visible relative transition-colors duration-700 ease-in-out ${
                    useWhiteBackground ? 'border border-black/10' : 'border border-white/40'
                }`}
                style={{ backgroundColor: useWhiteBackground ? 'white' : solidNavbarBg }}
            >
                <div className="px-3 sm:px-6 relative z-10">
                    <div className="categoryNavHideScrollbar flex items-center justify-start sm:justify-center gap-6 overflow-x-auto sm:overflow-visible whitespace-nowrap py-1 font-brandSerif">
                        <Link
                            to="/products"
                            className={linkClassName(location.pathname === '/products' && !activeCategory)}
                        >
                            SHOP ALL
                        </Link>

                        <Link
                            to="/products?price[gte]=0&price[lte]=99"
                            className={linkClassName(isShopAt99Active(location.pathname, location.search))}
                        >
                            SHOP AT 99
                        </Link>

                        {leftCategories.map(renderCategoryLink)}
                        {rightCategories.map(renderCategoryLink)}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default CategoryNavBar;
