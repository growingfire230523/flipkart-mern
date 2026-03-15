import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import Rating from '@mui/material/Rating';

const TopRatedProducts = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const { data } = await axios.get('/api/v1/products/top-rated?limit=12');
                if (!mounted) return;
                setProducts(Array.isArray(data?.products) ? data.products : []);
            } catch {
                // non-blocking
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    if (!products.length) return null;

    return (
        <section className="w-full">
            <div className="bg-white border border-gray-200 shadow-sm rounded-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h2 className="text-base sm:text-lg font-medium text-primary-darkBlue">Top Rated Products</h2>
                    <Link to="/products" className="bg-primary-blue text-xs font-medium text-white px-5 py-2.5 rounded-sm shadow-lg uppercase">view all</Link>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {products.slice(0, 12).map((p) => {
                            const img = p?.images?.[0]?.url;
                            return (
                                <Link
                                    key={p?._id}
                                    to={`/product/${p?._id}`}
                                    className="group flex items-center gap-3 border border-gray-200 rounded-sm p-3 transition-all duration-300 ease-out hover:shadow-[0_14px_32px_rgba(15,23,42,0.14)] hover:-translate-y-[2px]"
                                >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-50 border border-gray-200 rounded-sm overflow-hidden">
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
                                            <Rating value={Number(p?.ratings) || 0} precision={0.5} readOnly size="small" />
                                            <span className="text-xs text-gray-500">({(Number(p?.orderCount) || 0).toLocaleString()})</span>
                                        </div>
                                        <p className="text-sm font-semibold text-primary-darkBlue mt-1">₹{Number(p?.price || 0).toLocaleString()}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TopRatedProducts;
