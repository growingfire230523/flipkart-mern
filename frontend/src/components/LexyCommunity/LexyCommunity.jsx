import CategoryNavBar from '../Layouts/CategoryNavBar';
import MetaData from '../Layouts/MetaData';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import Rating from '@mui/material/Rating';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

const LexyCommunity = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [testimonials, setTestimonials] = useState([]);
    const [showForm, setShowForm] = useState(false);


    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [productImageFile, setProductImageFile] = useState(null);

    const imagePreviewUrl = useMemo(() => {
        if (!imageFile) return '';
        return URL.createObjectURL(imageFile);
    }, [imageFile]);

    const productImagePreviewUrl = useMemo(() => {
        if (!productImageFile) return '';
        return URL.createObjectURL(productImageFile);
    }, [productImageFile]);

    useEffect(() => {
        return () => {
            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
            if (productImagePreviewUrl) URL.revokeObjectURL(productImagePreviewUrl);
        };
    }, [imagePreviewUrl, productImagePreviewUrl]);

    const formatDateTime = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        try {
            return new Intl.DateTimeFormat(undefined, {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            }).format(d);
        } catch {
            return d.toLocaleString();
        }
    };

    const loadTestimonials = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/v1/testimonials');
            setTestimonials(Array.isArray(data?.testimonials) ? data.testimonials : []);
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || 'Failed to load testimonials.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTestimonials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSubmit = async (e) => {
        e.preventDefault();

        const trimmedName = String(name || '').trim();
        const trimmedReview = String(review || '').trim();

        if (!trimmedName) {
            enqueueSnackbar('Please enter your name.', { variant: 'error' });
            return;
        }
        if (!imageFile) {
            enqueueSnackbar('Please upload an image with the product.', { variant: 'error' });
            return;
        }
        if (!productImageFile) {
            enqueueSnackbar('Please upload a happy customer with products image.', { variant: 'error' });
            return;
        }
        if (!trimmedReview) {
            enqueueSnackbar('Please write a review.', { variant: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', trimmedName);
            formData.append('role', String(role || '').trim());
            formData.append('rating', String(rating || 5));
            formData.append('review', trimmedReview);
            formData.append('image', imageFile);
            formData.append('productImage', productImageFile);

            const { data } = await axios.post('/api/v1/testimonials', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const created = data?.testimonial;
            if (created) {
                setTestimonials((prev) => [created, ...prev]);
            } else {
                await loadTestimonials();
            }

            enqueueSnackbar('Testimonial posted. Thank you!', { variant: 'success' });
            setName('');
            setRole('');
            setRating(5);
            setReview('');
            setImageFile(null);
            setProductImageFile(null);
            setShowForm(false);
        } catch (e) {
            const status = e?.response?.status;
            if (status === 404) {
                enqueueSnackbar('Failed to post testimonial: backend route not found. Restart the backend from the flipkart-mern root.', { variant: 'error' });
            } else {
                enqueueSnackbar(e?.response?.data?.message || 'Failed to post testimonial.', { variant: 'error' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <MetaData title="LEXI Community | Flipkart" />
            <main className="flex flex-col gap-3 px-2 mt-3">
                <CategoryNavBar />
                <section className="w-full md:mx-auto md:max-w-6xl">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500">Testimonials</p>
                                <h1 className="text-2xl sm:text-3xl font-semibold">Our Clients Review</h1>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowForm((v) => !v)}
                                className="px-3 py-2 text-sm font-medium rounded-sm bg-primary-darkBlue text-white"
                            >
                                Add a Testimonial
                            </button>
                        </div>

                        {showForm && (
                            <form onSubmit={onSubmit} className="mt-4 border border-gray-200 rounded-sm p-3 sm:p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Your Name</label>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="mt-1 w-full border border-gray-300 rounded-sm px-3 py-2 text-sm outline-none focus:border-gray-400"
                                            placeholder="e.g. Sophia White"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Role (optional)</label>
                                        <input
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="mt-1 w-full border border-gray-300 rounded-sm px-3 py-2 text-sm outline-none focus:border-gray-400"
                                            placeholder="e.g. Happy Customer"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700">LEXI Rating</label>
                                        <div className="mt-1">
                                            <Rating
                                                name="lexi-rating"
                                                value={rating}
                                                onChange={(_, newValue) => setRating(newValue || 5)}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Upload Image</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                            className="mt-1 w-full text-sm"
                                        />
                                        {imagePreviewUrl && (
                                            <div className="mt-2 flex items-center gap-3">
                                                <img
                                                    src={imagePreviewUrl}
                                                    alt="Selected"
                                                    className="w-16 h-16 rounded-full object-cover border"
                                                />
                                                <span className="text-xs text-gray-500">Preview</span>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Upload Happy Customer With Products Image</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setProductImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                            className="mt-1 w-full text-sm"
                                        />
                                        {productImagePreviewUrl && (
                                            <div className="mt-2 flex items-center gap-3">
                                                <img
                                                    src={productImagePreviewUrl}
                                                    alt="Selected product"
                                                    className="w-24 h-16 rounded-md object-cover border"
                                                />
                                                <span className="text-xs text-gray-500">Preview</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <label className="text-sm font-medium text-gray-700">Your Review</label>
                                    <textarea
                                        value={review}
                                        onChange={(e) => setReview(e.target.value)}
                                        className="mt-1 w-full border border-gray-300 rounded-sm px-3 py-2 text-sm outline-none focus:border-gray-400 min-h-[96px]"
                                        placeholder="Write your experience with LEXI..."
                                    />
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 text-sm font-medium rounded-sm bg-primary-darkBlue text-white disabled:opacity-60"
                                    >
                                        {submitting ? 'Posting...' : 'Post'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 text-sm font-medium rounded-sm border border-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="mt-6">
                            {loading ? (
                                <p className="text-sm text-gray-600">Loading testimonials...</p>
                            ) : testimonials.length === 0 ? (
                                <p className="text-sm text-gray-600">No testimonials yet. Be the first to post one.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {testimonials.map((t) => (
                                        <article
                                            key={t?._id || `${t?.name}-${t?.createdAt}`}
                                            className="relative bg-gray-50 border border-gray-200 rounded-lg p-4 pt-10 shadow-sm"
                                        >
                                            {t?.productImage?.url ? (
                                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-32 h-20 rounded-md overflow-hidden border border-gray-200 bg-white shadow-sm">
                                                    <img
                                                        src={t.productImage.url}
                                                        alt="Happy customer"
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            ) : null}

                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={t?.image?.url}
                                                        alt={t?.name || 'Customer'}
                                                        className="w-14 h-14 rounded-full object-cover border"
                                                        loading="lazy"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-gray-900 leading-tight">{t?.name}</p>
                                                        <p className="text-xs text-gray-600">{t?.role || 'Happy Customer'}</p>
                                                    </div>
                                                </div>
                                                <span className="text-gray-400">
                                                    <FormatQuoteIcon />
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-700 mt-3">{t?.review}</p>

                                            <div className="mt-3 flex items-end justify-between gap-3">
                                                <Rating value={Number(t?.rating) || 0} readOnly />
                                                <time className="text-xs text-gray-500" dateTime={t?.createdAt || ''}>
                                                    {formatDateTime(t?.createdAt)}
                                                </time>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
};

export default LexyCommunity;
