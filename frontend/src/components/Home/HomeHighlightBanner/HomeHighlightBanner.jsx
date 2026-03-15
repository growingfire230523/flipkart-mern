import { useEffect, useState } from 'react';
import axios from 'axios';

const HomeHighlightBanner = () => {
    const [banner, setBanner] = useState(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const { data } = await axios.get('/api/v1/home/banner');
                if (!mounted) return;
                setBanner(data?.banner || null);
            } catch {
                // non-blocking
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    if (!banner?.image?.url) return null;

    // IMPORTANT: image-only section (no extra text/content)
    if (banner?.link) {
        return (
            <a href={banner.link} className="block">
                <img
                    src={banner.image.url}
                    alt=""
                    className="w-full h-auto rounded-sm border border-gray-200"
                    loading="lazy"
                />
            </a>
        );
    }

    return (
        <img
            src={banner.image.url}
            alt=""
            className="w-full h-auto rounded-sm border border-gray-200"
            loading="lazy"
        />
    );
};

export default HomeHighlightBanner;
