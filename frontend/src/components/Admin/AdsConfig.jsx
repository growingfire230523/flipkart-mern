import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';

const AdsConfig = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [newInAdsLoading, setNewInAdsLoading] = useState(false);
    const [newInAdsSaving, setNewInAdsSaving] = useState(false);
    const [newInAds, setNewInAds] = useState(null);
    const [newInLeftLink, setNewInLeftLink] = useState('');
    const [newInRightLink, setNewInRightLink] = useState('');
    const [newInLeftImageFile, setNewInLeftImageFile] = useState(null);
    const [newInRightImageFile, setNewInRightImageFile] = useState(null);

    const [perfumeLoading, setPerfumeLoading] = useState(false);
    const [perfumeSaving, setPerfumeSaving] = useState(false);
    const [perfumeBanner, setPerfumeBanner] = useState(null);
    const [perfumeHeading, setPerfumeHeading] = useState('');
    const [perfumeSubheading, setPerfumeSubheading] = useState('');
    const [perfumeCtaText, setPerfumeCtaText] = useState('');
    const [perfumeLink, setPerfumeLink] = useState('');
    const [perfumeImageFile, setPerfumeImageFile] = useState(null);

    const [makeupLoading, setMakeupLoading] = useState(false);
    const [makeupSaving, setMakeupSaving] = useState(false);
    const [makeupBanner, setMakeupBanner] = useState(null);
    const [makeupHeading, setMakeupHeading] = useState('');
    const [makeupSubheading, setMakeupSubheading] = useState('');
    const [makeupCtaText, setMakeupCtaText] = useState('');
    const [makeupLink, setMakeupLink] = useState('');
    const [makeupImageFile, setMakeupImageFile] = useState(null);

    const [skincareLoading, setSkincareLoading] = useState(false);
    const [skincareSaving, setSkincareSaving] = useState(false);
    const [skincareBanner, setSkincareBanner] = useState(null);
    const [skincareHeading, setSkincareHeading] = useState('');
    const [skincareSubheading, setSkincareSubheading] = useState('');
    const [skincareCtaText, setSkincareCtaText] = useState('');
    const [skincareLink, setSkincareLink] = useState('');
    const [skincareImageFile, setSkincareImageFile] = useState(null);

    useEffect(() => {
        let mounted = true;

        const loadNewInAds = async () => {
            setNewInAdsLoading(true);
            try {
                const { data } = await axios.get('/api/v1/admin/home/new-in-ads');
                if (!mounted) return;
                const ads = data?.ads || null;
                setNewInAds(ads);
                setNewInLeftLink(String(ads?.left?.link || ''));
                setNewInRightLink(String(ads?.right?.link || ''));
            } catch {
                // non-blocking
            } finally {
                if (mounted) setNewInAdsLoading(false);
            }
        };

        loadNewInAds();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadPerfumeBanner = async () => {
            setPerfumeLoading(true);
            try {
                const { data } = await axios.get('/api/v1/admin/home/perfume-promo-banner');
                if (!mounted) return;
                const banner = data?.banner || null;
                setPerfumeBanner(banner);
                setPerfumeHeading(String(banner?.heading || ''));
                setPerfumeSubheading(String(banner?.subheading || ''));
                setPerfumeCtaText(String(banner?.ctaText || 'Shop now'));
                setPerfumeLink(String(banner?.link || ''));
            } catch {
                // non-blocking
            } finally {
                if (mounted) setPerfumeLoading(false);
            }
        };

        loadPerfumeBanner();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadMakeupBanner = async () => {
            setMakeupLoading(true);
            try {
                const { data } = await axios.get('/api/v1/admin/home/makeup-promo-banner');
                if (!mounted) return;
                const banner = data?.banner || null;
                setMakeupBanner(banner);
                setMakeupHeading(String(banner?.heading || ''));
                setMakeupSubheading(String(banner?.subheading || ''));
                setMakeupCtaText(String(banner?.ctaText || 'Shop now'));
                setMakeupLink(String(banner?.link || ''));
            } catch {
                // non-blocking
            } finally {
                if (mounted) setMakeupLoading(false);
            }
        };

        loadMakeupBanner();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadSkincareBanner = async () => {
            setSkincareLoading(true);
            try {
                const { data } = await axios.get('/api/v1/admin/home/skincare-promo-banner');
                if (!mounted) return;
                const banner = data?.banner || null;
                setSkincareBanner(banner);
                setSkincareHeading(String(banner?.heading || ''));
                setSkincareSubheading(String(banner?.subheading || ''));
                setSkincareCtaText(String(banner?.ctaText || 'Shop now'));
                setSkincareLink(String(banner?.link || ''));
            } catch {
                // non-blocking
            } finally {
                if (mounted) setSkincareLoading(false);
            }
        };

        loadSkincareBanner();
        return () => {
            mounted = false;
        };
    }, []);

    const saveNewInAds = async () => {
        try {
            setNewInAdsSaving(true);
            const formData = new FormData();
            formData.append('leftLink', String(newInLeftLink || '').trim());
            formData.append('rightLink', String(newInRightLink || '').trim());
            if (newInLeftImageFile) formData.append('leftImage', newInLeftImageFile);
            if (newInRightImageFile) formData.append('rightImage', newInRightImageFile);

            const { data } = await axios.put('/api/v1/admin/home/new-in-ads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const ads = data?.ads || null;
            setNewInAds(ads);
            setNewInLeftLink(String(ads?.left?.link || ''));
            setNewInRightLink(String(ads?.right?.link || ''));
            setNewInLeftImageFile(null);
            setNewInRightImageFile(null);
            enqueueSnackbar('New In ads updated', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to update New In ads', { variant: 'error' });
        } finally {
            setNewInAdsSaving(false);
        }
    };

    const clearNewInAds = async () => {
        try {
            setNewInAdsSaving(true);
            await axios.delete('/api/v1/admin/home/new-in-ads');
            setNewInAds(null);
            setNewInLeftLink('');
            setNewInRightLink('');
            setNewInLeftImageFile(null);
            setNewInRightImageFile(null);
            enqueueSnackbar('New In ads removed', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to remove New In ads', { variant: 'error' });
        } finally {
            setNewInAdsSaving(false);
        }
    };

    const savePerfumeBanner = async () => {
        try {
            setPerfumeSaving(true);
            const formData = new FormData();
            formData.append('heading', String(perfumeHeading || '').trim());
            formData.append('subheading', String(perfumeSubheading || '').trim());
            formData.append('ctaText', String(perfumeCtaText || '').trim());
            formData.append('link', String(perfumeLink || '').trim());
            if (perfumeImageFile) formData.append('image', perfumeImageFile);

            const { data } = await axios.put('/api/v1/admin/home/perfume-promo-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const banner = data?.banner || null;
            setPerfumeBanner(banner);
            setPerfumeHeading(String(banner?.heading || ''));
            setPerfumeSubheading(String(banner?.subheading || ''));
            setPerfumeCtaText(String(banner?.ctaText || 'Shop now'));
            setPerfumeLink(String(banner?.link || ''));
            setPerfumeImageFile(null);
            enqueueSnackbar('Perfume promo banner updated', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to update perfume promo banner', { variant: 'error' });
        } finally {
            setPerfumeSaving(false);
        }
    };

    const clearPerfumeBanner = async () => {
        try {
            setPerfumeSaving(true);
            await axios.delete('/api/v1/admin/home/perfume-promo-banner');
            setPerfumeBanner(null);
            setPerfumeHeading('');
            setPerfumeSubheading('');
            setPerfumeCtaText('Shop now');
            setPerfumeLink('');
            setPerfumeImageFile(null);
            enqueueSnackbar('Perfume promo banner removed', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to remove perfume promo banner', { variant: 'error' });
        } finally {
            setPerfumeSaving(false);
        }
    };

    const saveMakeupBanner = async () => {
        try {
            setMakeupSaving(true);
            const formData = new FormData();
            formData.append('heading', String(makeupHeading || '').trim());
            formData.append('subheading', String(makeupSubheading || '').trim());
            formData.append('ctaText', String(makeupCtaText || '').trim());
            formData.append('link', String(makeupLink || '').trim());
            if (makeupImageFile) formData.append('image', makeupImageFile);

            const { data } = await axios.put('/api/v1/admin/home/makeup-promo-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const banner = data?.banner || null;
            setMakeupBanner(banner);
            setMakeupHeading(String(banner?.heading || ''));
            setMakeupSubheading(String(banner?.subheading || ''));
            setMakeupCtaText(String(banner?.ctaText || 'Shop now'));
            setMakeupLink(String(banner?.link || ''));
            setMakeupImageFile(null);
            enqueueSnackbar('Makeup promo banner updated', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to update makeup promo banner', { variant: 'error' });
        } finally {
            setMakeupSaving(false);
        }
    };

    const clearMakeupBanner = async () => {
        try {
            setMakeupSaving(true);
            await axios.delete('/api/v1/admin/home/makeup-promo-banner');
            setMakeupBanner(null);
            setMakeupHeading('');
            setMakeupSubheading('');
            setMakeupCtaText('Shop now');
            setMakeupLink('');
            setMakeupImageFile(null);
            enqueueSnackbar('Makeup promo banner removed', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to remove makeup promo banner', { variant: 'error' });
        } finally {
            setMakeupSaving(false);
        }
    };

    const saveSkincareBanner = async () => {
        try {
            setSkincareSaving(true);
            const formData = new FormData();
            formData.append('heading', String(skincareHeading || '').trim());
            formData.append('subheading', String(skincareSubheading || '').trim());
            formData.append('ctaText', String(skincareCtaText || '').trim());
            formData.append('link', String(skincareLink || '').trim());
            if (skincareImageFile) formData.append('image', skincareImageFile);

            const { data } = await axios.put('/api/v1/admin/home/skincare-promo-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const banner = data?.banner || null;
            setSkincareBanner(banner);
            setSkincareHeading(String(banner?.heading || ''));
            setSkincareSubheading(String(banner?.subheading || ''));
            setSkincareCtaText(String(banner?.ctaText || 'Shop now'));
            setSkincareLink(String(banner?.link || ''));
            setSkincareImageFile(null);
            enqueueSnackbar('SkinCare promo banner updated', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to update skincare promo banner', { variant: 'error' });
        } finally {
            setSkincareSaving(false);
        }
    };

    const clearSkincareBanner = async () => {
        try {
            setSkincareSaving(true);
            await axios.delete('/api/v1/admin/home/skincare-promo-banner');
            setSkincareBanner(null);
            setSkincareHeading('');
            setSkincareSubheading('');
            setSkincareCtaText('Shop now');
            setSkincareLink('');
            setSkincareImageFile(null);
            enqueueSnackbar('SkinCare promo banner removed', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to remove skincare promo banner', { variant: 'error' });
        } finally {
            setSkincareSaving(false);
        }
    };

    return (
        <>
            <MetaData title="Admin | Ads" />

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Homepage “New In” Side Ads</h3>
                        <p className="text-sm text-primary-grey">Left and right ad images shown alongside the “New In” products section.</p>
                    </div>

                    <div className="flex flex-col gap-4 w-full sm:w-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-medium text-primary-grey uppercase tracking-wide">Left ad</p>
                                <input
                                    value={newInLeftLink}
                                    onChange={(e) => setNewInLeftLink(e.target.value)}
                                    placeholder="Optional link (e.g. /products?keyword=sale)"
                                    className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewInLeftImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                    className="text-sm"
                                />
                                {!!newInAds?.left?.image?.url && (
                                    <div className="border border-gray-200 rounded overflow-hidden">
                                        <img
                                            src={newInAds.left.image.url}
                                            alt="New In left ad preview"
                                            className="w-full max-w-[320px] h-auto object-cover"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-medium text-primary-grey uppercase tracking-wide">Right ad</p>
                                <input
                                    value={newInRightLink}
                                    onChange={(e) => setNewInRightLink(e.target.value)}
                                    placeholder="Optional link (e.g. /products?keyword=new)"
                                    className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                                />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewInRightImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                    className="text-sm"
                                />
                                {!!newInAds?.right?.image?.url && (
                                    <div className="border border-gray-200 rounded overflow-hidden">
                                        <img
                                            src={newInAds.right.image.url}
                                            alt="New In right ad preview"
                                            className="w-full max-w-[320px] h-auto object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={saveNewInAds}
                                disabled={newInAdsSaving || newInAdsLoading}
                                className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
                            >
                                {newInAdsSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={clearNewInAds}
                                disabled={newInAdsSaving || newInAdsLoading}
                                className="h-10 px-5 rounded-sm border border-gray-300 text-xs font-medium uppercase disabled:opacity-60"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Homepage Perfume Promo Banner</h3>
                        <p className="text-sm text-primary-grey">Large banner displayed above the Perfume Collection section (only visible when configured). Recommended size: 2000 x 694 px.</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full sm:w-[520px]">
                        <input
                            value={perfumeHeading}
                            onChange={(e) => setPerfumeHeading(e.target.value)}
                            placeholder="Heading (e.g. STRONGER WITH YOU POWERFULLY)"
                            className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                        />
                        <input
                            value={perfumeSubheading}
                            onChange={(e) => setPerfumeSubheading(e.target.value)}
                            placeholder="Subheading (optional)"
                            className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                value={perfumeCtaText}
                                onChange={(e) => setPerfumeCtaText(e.target.value)}
                                placeholder="Button text (e.g. SHOP NOW)"
                                className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                            />
                            <input
                                value={perfumeLink}
                                onChange={(e) => setPerfumeLink(e.target.value)}
                                placeholder="Button link (e.g. /products?category=FRAGRANCES)"
                                className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setPerfumeImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                className="text-sm"
                            />
                            <p className="text-[11px] text-primary-grey">Best results with a 2000 x 694 px image.</p>
                        </div>

                        {!!perfumeBanner?.image?.url && (
                            <div className="border border-gray-200 rounded overflow-hidden">
                                <img
                                    src={perfumeBanner.image.url}
                                    alt="Perfume promo banner preview"
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={savePerfumeBanner}
                                disabled={perfumeSaving || perfumeLoading}
                                className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
                            >
                                {perfumeSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={clearPerfumeBanner}
                                disabled={perfumeSaving || perfumeLoading}
                                className="h-10 px-5 rounded-sm border border-gray-300 text-xs font-medium uppercase disabled:opacity-60"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Homepage Makeup Promo Banner</h3>
                        <p className="text-sm text-primary-grey">Large banner displayed above the Makeup Collection section (only visible when configured). Recommended size: 2000 x 694 px.</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full sm:w-[520px]">
                        <input
                            value={makeupHeading}
                            onChange={(e) => setMakeupHeading(e.target.value)}
                            placeholder="Heading (e.g. NEW MAKEUP ARRIVALS)"
                            className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                        />
                        <input
                            value={makeupSubheading}
                            onChange={(e) => setMakeupSubheading(e.target.value)}
                            placeholder="Subheading (optional)"
                            className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                value={makeupCtaText}
                                onChange={(e) => setMakeupCtaText(e.target.value)}
                                placeholder="Button text (e.g. SHOP NOW)"
                                className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                            />
                            <input
                                value={makeupLink}
                                onChange={(e) => setMakeupLink(e.target.value)}
                                placeholder="Button link (e.g. /products?category=MAKEUP)"
                                className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setMakeupImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                className="text-sm"
                            />
                            <p className="text-[11px] text-primary-grey">Best results with a 2000 x 694 px image.</p>
                        </div>

                        {!!makeupBanner?.image?.url && (
                            <div className="border border-gray-200 rounded overflow-hidden">
                                <img
                                    src={makeupBanner.image.url}
                                    alt="Makeup promo banner preview"
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={saveMakeupBanner}
                                disabled={makeupSaving || makeupLoading}
                                className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
                            >
                                {makeupSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={clearMakeupBanner}
                                disabled={makeupSaving || makeupLoading}
                                className="h-10 px-5 rounded-sm border border-gray-300 text-xs font-medium uppercase disabled:opacity-60"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Homepage SkinCare Promo Banner</h3>
                        <p className="text-sm text-primary-grey">Large banner displayed above the SkinCare Collection section (only visible when configured). Recommended size: 2000 x 694 px.</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full sm:w-[520px]">
                        <input
                            value={skincareHeading}
                            onChange={(e) => setSkincareHeading(e.target.value)}
                            placeholder="Heading (e.g. SKINCARE FAVOURITES)"
                            className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                        />
                        <input
                            value={skincareSubheading}
                            onChange={(e) => setSkincareSubheading(e.target.value)}
                            placeholder="Subheading (optional)"
                            className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                value={skincareCtaText}
                                onChange={(e) => setSkincareCtaText(e.target.value)}
                                placeholder="Button text (e.g. SHOP NOW)"
                                className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                            />
                            <input
                                value={skincareLink}
                                onChange={(e) => setSkincareLink(e.target.value)}
                                placeholder="Button link (e.g. /products?category=SKINCARE)"
                                className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setSkincareImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                className="text-sm"
                            />
                            <p className="text-[11px] text-primary-grey">Best results with a 2000 x 694 px image.</p>
                        </div>

                        {!!skincareBanner?.image?.url && (
                            <div className="border border-gray-200 rounded overflow-hidden">
                                <img
                                    src={skincareBanner.image.url}
                                    alt="SkinCare promo banner preview"
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={saveSkincareBanner}
                                disabled={skincareSaving || skincareLoading}
                                className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
                            >
                                {skincareSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={clearSkincareBanner}
                                disabled={skincareSaving || skincareLoading}
                                className="h-10 px-5 rounded-sm border border-gray-300 text-xs font-medium uppercase disabled:opacity-60"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdsConfig;
