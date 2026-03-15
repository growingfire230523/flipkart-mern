import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Rating from '@mui/material/Rating';

const BestSellerProducts = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const { data } = await axios.get('/api/v1/products/best-sellers?limit=8');
                if (!mounted) return;
                setProducts(Array.isArray(data?.products) ? data.products : []);
            } catch {
                // non-blocking
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <section className="w-full">
            <div className="bg-white border border-gray-200 shadow-sm rounded-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-base sm:text-lg font-medium text-primary-darkBlue">Best Seller Items</h2>
                </div>

                <div className="p-4">
                    {!products.length ? (
                        <p className="text-sm text-gray-500">No best sellers yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            {products.slice(0, 8).map((p) => {
                                const img = p?.images?.[0]?.url;
                                const orderCount = Number(p?.orderCount) || 0;
                                const rating = Number(p?.ratings) || 0;

                                const normalTags = Array.isArray(p?.catalogHighlights?.normal) ? p.catalogHighlights.normal : [];
                                const activeTags = Array.isArray(p?.catalogHighlights?.active) ? p.catalogHighlights.active : [];
                                const tagItems = [
                                    ...activeTags.map((label) => ({ label, type: 'active' })),
                                    ...normalTags.map((label) => ({ label, type: 'normal' })),
                                ]
                                    .map((t) => ({ ...t, label: String(t.label || '').trim() }))
                                    .filter((t) => t.label)
                                    .slice(0, 3);

                                return (
                                    <Link
                                        key={p?._id}
                                        to={`/product/${p?._id}`}
                                        className="group flex items-center gap-3 border border-gray-200 rounded-sm p-3 transition-all duration-300 ease-out hover:shadow-[0_14px_32px_rgba(15,23,42,0.14)] hover:-translate-y-[2px]"
                                    >
                                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-50 border border-gray-200 rounded-sm overflow-hidden">
                                            {tagItems.length > 0 && (
                                                <div className="pointer-events-none absolute top-1 left-1 z-[1] flex flex-col gap-1">
                                                    {tagItems.map((t, idx) => (
                                                        <div
                                                            key={`${t.type}-${idx}-${t.label}`}
                                                            className={t.type === 'active' ? 'bg-red-600/55 text-white rounded-md' : 'bg-gray-500/55 text-white rounded-md'}
                                                            style={{ maxWidth: 'calc(100% - 0.5rem)' }}
                                                        >
                                                            <div className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase truncate">{t.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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

                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">{p?.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Rating value={rating} precision={0.5} readOnly size="small" />
                                                <span className="text-xs text-gray-500">({orderCount.toLocaleString()})</span>
                                            </div>
                                            <p className="text-sm font-semibold text-primary-darkBlue mt-1">₹{Number(p?.price || 0).toLocaleString()}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default BestSellerProducts;
