import { Link } from 'react-router-dom';
import Rating from '@mui/material/Rating';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const PerfumeCard = ({ product }) => {
    const name = String(product?.name || '').trim();
    const imageUrl = product?.images?.[0]?.url;
    const price = Number(product?.price) || 0;
    const ratings = Number(product?.ratings) || 0;
    const orderCount = Number(product?.orderCount) || 0;

    const cuttedPrice = Number(product?.cuttedPrice) || price;

    const normalTags = Array.isArray(product?.catalogHighlights?.normal) ? product.catalogHighlights.normal : [];
    const activeTags = Array.isArray(product?.catalogHighlights?.active) ? product.catalogHighlights.active : [];
    const tagItems = [
        ...activeTags.map((label) => ({ label, type: 'active' })),
        ...normalTags.map((label) => ({ label, type: 'normal' })),
    ]
        .map((t) => ({ ...t, label: String(t.label || '').trim() }))
        .filter((t) => t.label)
        .slice(0, 3);

    return (
        <div className="group relative bg-white border border-gray-200 rounded-sm overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_16px_40px_rgba(15,23,42,0.14)] hover:-translate-y-1">
            {tagItems.length > 0 && (
                <div className="pointer-events-none absolute top-3 left-3 z-[1] flex flex-col gap-1">
                    {tagItems.map((t, idx) => (
                        <div
                            key={`${t.type}-${idx}-${t.label}`}
                            className={t.type === 'active' ? 'bg-red-600/55 text-white rounded-md' : 'bg-gray-500/55 text-white rounded-md'}
                            style={{ maxWidth: 'calc(100% - 3rem)' }}
                        >
                            <div className="px-2 py-1 text-[11px] font-semibold tracking-wide uppercase truncate">{t.label}</div>
                        </div>
                    ))}
                </div>
            )}
            {/* Discount tag intentionally omitted for Perfume Collection catalogue cards */}

            <Link to={`/product/${product?._id}`} className="block">
                <div className="h-44 sm:h-48 w-full flex items-center justify-center bg-gray-50 p-3 overflow-hidden">
                    {imageUrl ? (
                        <img
                            draggable="false"
                            className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                            src={imageUrl}
                            alt={name}
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full" />
                    )}
                </div>
            </Link>

            <div className="p-4">
                <Link to={`/product/${product?._id}`} className="block">
                    <h2 className="text-[12px] uppercase tracking-widest text-primary-darkBlue leading-snug">
                        {name.length > 34 ? `${name.substring(0, 34)}...` : name}
                    </h2>
                </Link>

                <div className="mt-2 flex items-center gap-2">
                    <Rating value={ratings} precision={0.5} readOnly size="small" />
                    <span className="text-xs text-gray-500">({orderCount.toLocaleString()})</span>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-primary-darkBlue font-medium">₹{price.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

const PerfumeCollection = () => {
    const { products } = useSelector((state) => state.products);

    const perfumeProducts = useMemo(() => {
        const list = Array.isArray(products) ? products : [];
        const fragrances = list.filter((p) => String(p?.category || '').toUpperCase() === 'FRAGRANCES');

        const perfumesOnly = fragrances.filter((p) => {
            const sub = String(p?.subCategory || '').toLowerCase();
            const nm = String(p?.name || '').toLowerCase();
            return sub.includes('perfume') || nm.includes('perfume');
        });

        const picked = perfumesOnly.length > 0 ? perfumesOnly : fragrances;
        return picked.slice(0, 30);
    }, [products]);

    if (!perfumeProducts || perfumeProducts.length === 0) return null;

    return (
        <section className="bg-white w-full shadow overflow-hidden">
            <div className="flex px-6 py-3 justify-between items-center">
                <div className="flex flex-col">
                    <h1 className="font-brandSerif text-2xl font-normal text-primary-darkBlue leading-none">Perfume Collection</h1>
                    <span className="mt-2 h-px w-24 bg-primary-grey/40" />
                </div>

                <Link
                    to="/products?category=FRAGRANCES"
                    className="bg-primary-blue text-xs font-medium text-white px-5 py-2.5 rounded-sm shadow-lg uppercase"
                >
                    VIEW MORE
                </Link>
            </div>
            <hr />

            <div className="px-4 sm:px-6 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {perfumeProducts.map((p) => (
                        <PerfumeCard key={p._id} product={p} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PerfumeCollection;
