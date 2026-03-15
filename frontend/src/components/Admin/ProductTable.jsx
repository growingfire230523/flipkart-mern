import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { Link } from 'react-router-dom';
import { clearErrors, deleteProduct, getAdminProducts } from '../../actions/productAction';
import Rating from '@mui/material/Rating';
import IconButton from '@mui/material/IconButton';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import axios from 'axios';
import { DELETE_PRODUCT_RESET } from '../../constants/productConstants';
import Actions from './Actions';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';
import { categories } from '../../utils/constants';

const ProductTable = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { products, error, loading: productsLoading, adminProductsCount } = useSelector((state) => state.products);
    const { adminFilteredProductsCount } = useSelector((state) => state.products);
    const { loading, isDeleted, error: deleteError } = useSelector((state) => state.product);

    const pageSizeOptions = useMemo(() => ([100, 500, 1000, 5000]), []);
    const [pageSize, setPageSize] = useState(500);
    const [page, setPage] = useState(0);

    const [keyword, setKeyword] = useState('');
    const [category, setCategory] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [stockMin, setStockMin] = useState('');
    const [stockMax, setStockMax] = useState('');

    useEffect(() => {
        setPage(0);
    }, [keyword, category, priceMin, priceMax, stockMin, stockMax]);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (deleteError) {
            enqueueSnackbar(deleteError, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isDeleted) {
            enqueueSnackbar("Product Deleted Successfully", { variant: "success" });
            dispatch({ type: DELETE_PRODUCT_RESET });
        }
        dispatch(
            getAdminProducts(page + 1, pageSize, {
                keyword,
                category,
                priceMin,
                priceMax,
                stockMin,
                stockMax,
            })
        );
    }, [dispatch, error, deleteError, isDeleted, enqueueSnackbar, page, pageSize, keyword, category, priceMin, priceMax, stockMin, stockMax]);

    const deleteProductHandler = (id) => {
        dispatch(deleteProduct(id));
    }

    const toggleDealHandler = async (id, dealOfDay) => {
        try {
            await axios.put(`/api/v1/admin/product/${id}/deal`, { dealOfDay: !dealOfDay }, {
                headers: { 'Content-Type': 'application/json' },
            });
            enqueueSnackbar(!dealOfDay ? 'Added to Deals of the Day' : 'Removed from Deals of the Day', { variant: 'success' });
            dispatch(
                getAdminProducts(page + 1, pageSize, {
                    keyword,
                    category,
                    priceMin,
                    priceMax,
                    stockMin,
                    stockMax,
                })
            );
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to update deal', { variant: 'error' });
        }
    };

    const rows = [];
    products && products.forEach((item) => {
        rows.push({
            id: item._id,
            name: item.name,
            image: item.images?.[0]?.url,
            category: item.category,
            stock: item.stock,
            price: item.price,
            cprice: item.cuttedPrice,
            rating: item.ratings,
            dealOfDay: item.dealOfDay,
        });
    });

    const totalCount = Number.isFinite(adminProductsCount) ? adminProductsCount : rows.length;
    const filteredCount = Number.isFinite(adminFilteredProductsCount) ? adminFilteredProductsCount : totalCount;
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(filteredCount / pageSize)) : 1;
    const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
    const from = filteredCount === 0 ? 0 : safePage * pageSize + 1;
    const to = filteredCount === 0 ? 0 : Math.min((safePage + 1) * pageSize, filteredCount);

    return (
        <>
            <MetaData title="Admin Products | Flipkart" />

            {(loading || productsLoading) && <BackdropLoader />}

            <div className="flex justify-between items-center">
                <h1 className="text-lg font-medium uppercase">products</h1>
                <Link to="/admin/new_product" className="py-2 px-4 rounded shadow font-medium text-white bg-primary-blue hover:shadow-lg">New Product</Link>
            </div>

            <div className="flex items-center justify-between mt-4 mb-2">
                <div className="flex items-center gap-2 text-sm text-primary-grey">
                    <span className="font-medium text-primary-darkBlue">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const next = Number(e.target.value);
                            setPage(0);
                            setPageSize(next);
                        }}
                        className="border border-gray-200 rounded-md px-2 py-1 bg-white/80 text-primary-darkBlue"
                    >
                        {pageSizeOptions.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <span>products per page</span>
                </div>

                <div className="text-sm text-primary-grey">
                    <span className="font-medium text-primary-darkBlue">{from}-{to}</span>
                    <span> of </span>
                    <span className="font-medium text-primary-darkBlue">{filteredCount}</span>
                    {filteredCount !== totalCount ? (
                        <span className="text-primary-grey"> (filtered from {totalCount})</span>
                    ) : null}
                </div>
            </div>

            <div className="bg-white/70 border border-gray-200 rounded-xl shadow-sm px-3 py-3 mb-3">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Search</label>
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Search by product name or exact ID"
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        />
                    </div>

                    <div className="min-w-[220px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        >
                            <option value="">All</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-[260px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Price Range</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={priceMin}
                                onChange={(e) => setPriceMin(e.target.value)}
                                placeholder="Min"
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                            <input
                                type="number"
                                value={priceMax}
                                onChange={(e) => setPriceMax(e.target.value)}
                                placeholder="Max"
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                        </div>
                    </div>

                    <div className="min-w-[260px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Stock Range</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={stockMin}
                                onChange={(e) => setStockMin(e.target.value)}
                                placeholder="Min"
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                            <input
                                type="number"
                                value={stockMax}
                                onChange={(e) => setStockMax(e.target.value)}
                                placeholder="Max"
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm w-full flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200">
                            <tr className="text-left text-primary-darkBlue">
                                <th className="px-4 py-3 whitespace-nowrap">Product ID</th>
                                <th className="px-4 py-3 whitespace-nowrap">Name</th>
                                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                                <th className="px-4 py-3 whitespace-nowrap">Stock</th>
                                <th className="px-4 py-3 whitespace-nowrap">Price</th>
                                <th className="px-4 py-3 whitespace-nowrap">Cutted Price</th>
                                <th className="px-4 py-3 whitespace-nowrap">Rating</th>
                                <th className="px-4 py-3 whitespace-nowrap">Deal</th>
                                <th className="px-4 py-3 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {rows.map((row) => {
                                const isDeal = Boolean(row.dealOfDay);
                                return (
                                    <tr key={row.id} className="hover:bg-primary-pink/5">
                                        <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.id}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 min-w-[260px]">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                                    {row.image ? (
                                                        <img draggable="false" src={row.image} alt={row.name} className="w-full h-full object-cover" />
                                                    ) : null}
                                                </div>
                                                <span className="text-primary-darkBlue">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.category}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {row.stock < 10 ? (
                                                <span className="font-medium text-primary-darkBlue rounded-full bg-primary-yellow/20 border border-primary-yellow/40 p-1 w-6 h-6 flex items-center justify-center">{row.stock}</span>
                                            ) : (
                                                <span className="text-primary-grey">{row.stock}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-primary-grey">₹{Number(row.price || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-primary-grey">₹{Number(row.cprice || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Rating
                                                readOnly
                                                value={row.rating}
                                                size="small"
                                                precision={0.5}
                                                sx={{
                                                    '& .MuiRating-iconFilled': { color: '#d6b36a' },
                                                    '& .MuiRating-iconHover': { color: '#d6b36a' },
                                                    '& .MuiRating-iconEmpty': { color: 'rgba(36,23,26,0.20)' },
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <IconButton
                                                size="small"
                                                onClick={() => toggleDealHandler(row.id, isDeal)}
                                                aria-label={isDeal ? 'Remove from deals of the day' : 'Add to deals of the day'}
                                            >
                                                {isDeal ? (
                                                    <StarIcon sx={{ fontSize: '18px' }} className="text-primary-blue" />
                                                ) : (
                                                    <StarBorderIcon sx={{ fontSize: '18px' }} className="text-primary-grey hover:text-primary-blue" />
                                                )}
                                            </IconButton>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Actions editRoute={"product"} deleteHandler={deleteProductHandler} id={row.id} />
                                        </td>
                                    </tr>
                                );
                            })}

                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-primary-grey">
                                        No products found.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-white/70">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page <= 0}
                        className="px-3 py-1.5 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Prev
                    </button>
                    <span className="text-sm text-primary-grey">Page <span className="font-medium text-primary-darkBlue">{page + 1}</span> / <span className="font-medium text-primary-darkBlue">{totalPages}</span></span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    );
};

export default ProductTable;