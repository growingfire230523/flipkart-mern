import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const isExternalLink = (href) => {
    const s = String(href || '').trim().toLowerCase();
    return s.startsWith('http://') || s.startsWith('https://');
};

const SkinCarePromoBanner = () => {
    const [banner, setBanner] = useState(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const { data } = await axios.get('/api/v1/home/skincare-promo-banner');
                if (!mounted) return;
                setBanner(data?.banner || null);
            } catch {
                if (mounted) setBanner(null);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const imageUrl = banner?.image?.url;
    const heading = String(banner?.heading || '').trim();
    const subheading = String(banner?.subheading || '').trim();
    const ctaText = String(banner?.ctaText || '').trim() || 'Shop now';
    const link = String(banner?.link || '').trim();

    const shouldRender = Boolean(imageUrl);

    const Cta = useMemo(() => {
        if (!link) return null;

        if (isExternalLink(link)) {
            return (
                <a
                    href={link}
                    className="inline-flex items-center justify-center h-11 px-8 bg-white text-primary-darkBlue text-xs font-medium uppercase tracking-widest rounded-sm border border-white/60 hover:bg-white/95"
                    target="_blank"
                    rel="noreferrer"
                >
                    {ctaText}
                </a>
            );
        }

        return (
            <Link
                to={link}
                className="inline-flex items-center justify-center h-11 px-8 bg-white text-primary-darkBlue text-xs font-medium uppercase tracking-widest rounded-sm border border-white/60 hover:bg-white/95"
            >
                {ctaText}
            </Link>
        );
    }, [ctaText, link]);

    if (!shouldRender) return null;

    return (
        <section className="w-full shadow overflow-hidden">
            <div
                className="relative w-full"
                style={{ aspectRatio: '2000 / 694', minHeight: '180px' }}
            >
                <img
                    src={imageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    aria-hidden="true"
                    draggable="false"
                />
                <div className="absolute inset-0 bg-black/25" aria-hidden="true" />

                <div className="relative z-[1] w-full h-full flex items-center">
                    <div className="w-full px-6 sm:px-10 py-8 flex justify-end">
                        <div className="max-w-[560px] text-right">
                            {heading ? (
                                <h2 className="font-brandSerif font-normal text-white text-2xl sm:text-3xl tracking-wide">
                                    {heading}
                                </h2>
                            ) : null}
                            {subheading ? (
                                <p className="mt-3 text-white/90 text-sm sm:text-base">{subheading}</p>
                            ) : null}
                            <div className="mt-5">{Cta}</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SkinCarePromoBanner;
