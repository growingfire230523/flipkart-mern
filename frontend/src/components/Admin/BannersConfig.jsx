import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';

const DEFAULT_SLOTS = [
    { key: 'banner1', label: 'Banner 1' },
    { key: 'banner2', label: 'Banner 2' },
    { key: 'banner3', label: 'Banner 3' },
    { key: 'banner4', label: 'Banner 4' },
];

const BannersConfig = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [banners, setBanners] = useState(() =>
        DEFAULT_SLOTS.map((slot) => ({ ...slot, link: '', image: null, file: null }))
    );

    const [communityBannerLoading, setCommunityBannerLoading] = useState(false);
    const [communityBannerSaving, setCommunityBannerSaving] = useState(false);
    const [communityBanner, setCommunityBanner] = useState(null);
    const [communityBannerEnabled, setCommunityBannerEnabled] = useState(false);
    const [communityBannerLink, setCommunityBannerLink] = useState('');
    const [communityBannerImageFile, setCommunityBannerImageFile] = useState(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/v1/admin/home/hero-banners');
                if (!mounted) return;
                const incoming = Array.isArray(data?.banners) ? data.banners : [];

                setBanners((prev) =>
                    DEFAULT_SLOTS.map((slot, index) => {
                        const existing = incoming[index] || {};
                        return {
                            key: slot.key,
                            label: slot.label,
                            link: String(existing?.link || ''),
                            image: existing?.image || null,
                            file: null,
                        };
                    })
                );
            } catch (e) {
                if (!mounted) return;
                enqueueSnackbar(
                    e?.response?.data?.message || e.message || 'Failed to load hero banners',
                    { variant: 'error' }
                );
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [enqueueSnackbar]);

    useEffect(() => {
        let mounted = true;

        const loadCommunityBanner = async () => {
            setCommunityBannerLoading(true);
            try {
                const { data } = await axios.get('/api/v1/admin/home/banner');
                if (!mounted) return;
                const banner = data?.banner || null;
                setCommunityBanner(banner);
                setCommunityBannerEnabled(Boolean(banner?.isActive));
                setCommunityBannerLink(String(banner?.link || ''));
            } catch {
                // non-blocking
            } finally {
                if (mounted) setCommunityBannerLoading(false);
            }
        };

        loadCommunityBanner();
        return () => {
            mounted = false;
        };
    }, []);

    const updateBannerField = (index, patch) => {
        setBanners((prev) =>
            prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
        );
    };

    const save = async () => {
        try {
            setSaving(true);
            const formData = new FormData();

            banners.forEach((banner, index) => {
                const idx = index + 1;
                formData.append(`banner${idx}Link`, String(banner.link || '').trim());
                if (banner.file) {
                    formData.append(`banner${idx}Image`, banner.file);
                }
            });

            const { data } = await axios.put('/api/v1/admin/home/hero-banners', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const incoming = Array.isArray(data?.banners) ? data.banners : [];
            setBanners((prev) =>
                DEFAULT_SLOTS.map((slot, index) => {
                    const existing = incoming[index] || {};
                    return {
                        key: slot.key,
                        label: slot.label,
                        link: String(existing?.link || ''),
                        image: existing?.image || null,
                        file: null,
                    };
                })
            );

            enqueueSnackbar('Homepage banners updated', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(
                e?.response?.data?.message || e.message || 'Failed to update homepage banners',
                { variant: 'error' }
            );
        } finally {
            setSaving(false);
        }
    };

    const clearAll = async () => {
        try {
            setSaving(true);
            await axios.delete('/api/v1/admin/home/hero-banners');
            setBanners(
                DEFAULT_SLOTS.map((slot) => ({ ...slot, link: '', image: null, file: null }))
            );
            enqueueSnackbar('All homepage banners removed', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(
                e?.response?.data?.message || e.message || 'Failed to remove homepage banners',
                { variant: 'error' }
            );
        } finally {
            setSaving(false);
        }
    };

    const saveCommunityBanner = async () => {
        try {
            setCommunityBannerSaving(true);
            const formData = new FormData();
            formData.append('isActive', communityBannerEnabled ? 'true' : 'false');
            formData.append('link', String(communityBannerLink || '').trim());
            if (communityBannerImageFile) formData.append('image', communityBannerImageFile);

            const { data } = await axios.put('/api/v1/admin/home/banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const banner = data?.banner || null;
            setCommunityBanner(banner);
            setCommunityBannerEnabled(Boolean(banner?.isActive));
            setCommunityBannerLink(String(banner?.link || ''));
            setCommunityBannerImageFile(null);

            enqueueSnackbar('Community banner updated', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to update banner', { variant: 'error' });
        } finally {
            setCommunityBannerSaving(false);
        }
    };

    const clearCommunityBanner = async () => {
        try {
            setCommunityBannerSaving(true);
            await axios.delete('/api/v1/admin/home/banner');
            setCommunityBanner(null);
            setCommunityBannerEnabled(false);
            setCommunityBannerLink('');
            setCommunityBannerImageFile(null);
            enqueueSnackbar('Community banner removed', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to remove banner', { variant: 'error' });
        } finally {
            setCommunityBannerSaving(false);
        }
    };

    return (
        <>
            <MetaData title="Admin | Homepage Banners" />

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Homepage Hero Banners</h3>
                <p className="text-sm text-primary-grey mt-1">
                    These images power the main banner slider at the top of the home page.
                    Recommended size: around <span className="font-medium">1879×361px</span> or a
                    similar wide ratio (5:1). Use JPG/PNG images under 6&nbsp;MB.
                </p>
            </div>

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
                <div className="flex flex-col gap-4 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {banners.map((banner, index) => (
                            <div
                                key={banner.key}
                                className="flex flex-col gap-3 border border-gray-200 rounded-lg p-4"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-primary-grey uppercase tracking-wide">
                                        {banner.label}
                                    </p>
                                    {loading && (
                                        <span className="text-[11px] text-primary-grey">Loading…</span>
                                    )}
                                </div>

                                <input
                                    value={banner.link}
                                    onChange={(e) =>
                                        updateBannerField(index, { link: e.target.value })
                                    }
                                    placeholder="Optional link (e.g. /products?keyword=offer)"
                                    className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full text-sm"
                                />

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file =
                                            e.target.files && e.target.files[0]
                                                ? e.target.files[0]
                                                : null;
                                        updateBannerField(index, { file });
                                    }}
                                    className="text-xs text-primary-grey"
                                />

                                {banner?.image?.url && (
                                    <div className="border border-gray-200 rounded overflow-hidden">
                                        <img
                                            src={banner.image.url}
                                            alt={`${banner.label} preview`}
                                            className="w-full max-w-[520px] h-auto object-cover"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : 'Save All'}
                        </button>
                        <button
                            type="button"
                            onClick={clearAll}
                            disabled={saving}
                            className="h-10 px-5 rounded-sm border border-gray-300 text-xs font-medium uppercase disabled:opacity-60"
                        >
                            Remove All
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Homepage Highlight Banner</h3>
                        <p className="text-sm text-primary-grey">Shown on the home page above “Top Brands, Best Price” only when enabled.</p>
                    </div>

                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-sm text-primary-darkBlue">
                                <input
                                    type="checkbox"
                                    checked={communityBannerEnabled}
                                    onChange={(e) => setCommunityBannerEnabled(e.target.checked)}
                                />
                                Enable
                            </label>

                            <input
                                value={communityBannerLink}
                                onChange={(e) => setCommunityBannerLink(e.target.value)}
                                placeholder="Optional link (e.g. /products?keyword=brand)"
                                className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue w-full sm:w-96"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setCommunityBannerImageFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                                className="text-sm"
                            />

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={saveCommunityBanner}
                                    disabled={communityBannerSaving || communityBannerLoading}
                                    className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
                                >
                                    {communityBannerSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    onClick={clearCommunityBanner}
                                    disabled={communityBannerSaving || communityBannerLoading}
                                    className="h-10 px-5 rounded-sm border border-gray-300 text-xs font-medium uppercase disabled:opacity-60"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>

                        {!!communityBanner?.image?.url && (
                            <div className="border border-gray-200 rounded overflow-hidden">
                                <img
                                    src={communityBanner.image.url}
                                    alt="Community banner preview"
                                    className="w-full max-w-[520px] h-auto object-cover"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default BannersConfig;
