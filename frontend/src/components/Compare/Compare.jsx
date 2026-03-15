import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import Loader from '../Layouts/Loader';
import MetaData from '../Layouts/MetaData';
import { removeItemsFromCart } from '../../actions/cartAction';
import { removeFromCompare } from '../../actions/compareAction';

const Compare = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const { compareItems } = useSelector((state) => state.compare);

    const ids = useMemo(() => (compareItems || []).map((i) => i.product).filter(Boolean), [compareItems]);

    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (ids.length === 1) {
            navigate(`/product/${ids[0]}`);
        }
    }, [ids, navigate]);

    useEffect(() => {
        let cancelled = false;

        const fetchBoth = async () => {
            if (ids.length !== 2) return;
            setError('');
            setLoading(true);

            try {
                const [a, b] = await Promise.all([
                    axios.get(`/api/v1/product/${ids[0]}`),
                    axios.get(`/api/v1/product/${ids[1]}`),
                ]);

                if (cancelled) return;
                setProducts([a?.data?.product, b?.data?.product].filter(Boolean));
            } catch (e) {
                if (cancelled) return;
                setError(e?.response?.data?.message || 'Failed to load products for comparison');
                setProducts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchBoth();
        return () => {
            cancelled = true;
        };
    }, [ids]);

    const renderValue = (value) => {
        if (value === undefined || value === null || value === '') return '—';
        return value;
    };

    const handleRemoveFromCartAndClearCompare = () => {
        if (!ids.length) return;

        ids.forEach((productId) => {
            if (!productId) return;
            dispatch(removeItemsFromCart(productId));
            dispatch(removeFromCompare(productId));
        });

        enqueueSnackbar('Removed compared products from cart and cleared comparison', { variant: 'success' });
    };

    return (
        <>
            <MetaData title="Compare Products | Flipkart" />
            <main className="w-full mt-4">
                <div className="sm:w-11/12 sm:mt-4 m-auto mb-7">
                    {ids.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 bg-white shadow-sm rounded-sm p-6 sm:p-16">
                            <img
                                draggable="false"
                                className="w-1/2 h-44 object-contain"
                                src="https://static-assets-web.flixcart.com/www/linchpin/fk-cp-zion/img/error-no-search-results_2353c5.png"
                                alt="No products to compare"
                            />
                            <h1 className="text-2xl font-medium text-gray-900">No products selected for comparison</h1>
                            <p className="text-xl text-center text-primary-grey">Add products using the compare icon</p>
                        </div>
                    )}

                    {ids.length === 1 && null}

                    {ids.length === 2 && (
                        <div className="bg-white shadow-sm rounded-sm overflow-hidden">
                            {loading ? (
                                <div className="p-6"><Loader /></div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center gap-3 p-8">
                                    <h1 className="text-xl font-medium text-gray-900">{error}</h1>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-end px-4 pt-4 pb-2 border-b border-gray-100">
                                        <button
                                            type="button"
                                            onClick={handleRemoveFromCartAndClearCompare}
                                            className="px-3 py-1.5 text-xs sm:text-sm rounded border border-gray-300 text-primary-darkBlue hover:bg-gray-50"
                                        >
                                            Remove from cart & clear comparison
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b">
                                        {products.map((p) => (
                                            <div key={p?._id} className="p-4 sm:p-6 border-b sm:border-b-0 sm:border-r last:border-r-0">
                                                <Link to={`/product/${p?._id}`} className="flex gap-4 items-start group">
                                                    <div className="w-28 h-28 bg-gray-50 border flex items-center justify-center shrink-0">
                                                        <img
                                                            draggable="false"
                                                            className="w-full h-full object-contain p-2"
                                                            src={p?.images?.[0]?.url}
                                                            alt={p?.name}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <h2 className="text-sm font-medium text-primary-darkBlue group-hover:text-primary-blue">
                                                            {p?.name}
                                                        </h2>
                                                        <div className="text-lg font-medium text-primary-darkBlue">₹{(p?.price ?? 0).toLocaleString()}</div>
                                                        <div className="text-xs text-primary-grey">{p?.brand?.name}</div>
                                                    </div>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2">
                                        {products.map((p) => (
                                            <div key={p?._id} className="p-4 sm:p-6 border-b sm:border-b-0 sm:border-r last:border-r-0">
                                                <div className="flex flex-col gap-3 text-sm">
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">Category</span><span className="text-primary-darkBlue font-medium text-right">{renderValue(p?.category)}</span></div>
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">Brand</span><span className="text-primary-darkBlue font-medium text-right">{renderValue(p?.brand?.name)}</span></div>
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">Price</span><span className="text-primary-darkBlue font-medium text-right">₹{renderValue((p?.price ?? 0).toLocaleString())}</span></div>
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">MRP</span><span className="text-primary-darkBlue font-medium text-right">₹{renderValue((p?.cuttedPrice ?? 0).toLocaleString())}</span></div>
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">Warranty</span><span className="text-primary-darkBlue font-medium text-right">{renderValue(p?.warranty)} year</span></div>
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">Stock</span><span className="text-primary-darkBlue font-medium text-right">{renderValue(p?.stock)}</span></div>
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">Ratings</span><span className="text-primary-darkBlue font-medium text-right">{renderValue(p?.ratings)}</span></div>
                                                    <div className="flex justify-between gap-6"><span className="text-primary-grey">Reviews</span><span className="text-primary-darkBlue font-medium text-right">{renderValue(p?.numOfReviews)}</span></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
};

export default Compare;
