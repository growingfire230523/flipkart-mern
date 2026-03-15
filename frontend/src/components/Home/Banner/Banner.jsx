import { useEffect, useMemo, useState } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import './Banner.css';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import axios from 'axios';
import banner2 from '../../../assets/images/Banners/banner1.png';
import banner1 from '../../../assets/images/Banners/banner2.png';
import banner4 from '../../../assets/images/Banners/banner4.png';
import banner3 from '../../../assets/images/Banners/banner3.png';
import { useBannerTheme } from '../../../context/BannerThemeContext';
// import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
// import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
// import gadgetSale from '../../../assets/images/Banners/gadget-sale.jpg';
// import kitchenSale from '../../../assets/images/Banners/kitchen-sale.jpg';
// import poco from '../../../assets/images/Banners/poco-m4-pro.webp';
// import realme from '../../../assets/images/Banners/realme-9-pro.webp';
// import fashionSale from '../../../assets/images/Banners/fashion-sale.webp';
// import oppo from '../../../assets/images/Banners/oppo-reno7.webp';

export const PreviousBtn = ({ className, onClick }) => {
  return (
    <button type="button" className={className} onClick={onClick} aria-label="Previous">
      <ArrowBackIosIcon sx={{ fontSize: 18, marginLeft: '3px' }} />
    </button>
  )
}

export const NextBtn = ({ className, onClick }) => {
  return (
    <button type="button" className={className} onClick={onClick} aria-label="Next">
      <ArrowForwardIosIcon sx={{ fontSize: 18 }} />
    </button>
  )
}

const Banner = () => {

  const { setSmokeColor } = useBannerTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [banners, setBanners] = useState([]);
  const [bannerLinks, setBannerLinks] = useState([]);
  const [bannerSmokeColors, setBannerSmokeColors] = useState([]);

  const fallbackBanners = useMemo(() => [banner1, banner2, banner3, banner4], []);

  const fallbackSmokeColors = useMemo(
    () => [
      'rgba(232, 113, 141, 0.50)',
      'rgba(120, 196, 219, 0.50)',
      'rgba(245, 178, 93, 0.50)',
      'rgba(151, 110, 219, 0.50)',
    ],
    []
  );

  const getAverageRgba = (src, alpha = 0.5) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(null);
            return;
          }

          const sampleSize = 32;
          canvas.width = sampleSize;
          canvas.height = sampleSize;
          ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

          const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
          let r = 0;
          let g = 0;
          let b = 0;
          let count = 0;

          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 16) continue;

            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count += 1;
          }

          if (!count) {
            resolve(null);
            return;
          }

          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);

          // If the image averages out to a near-neutral tone, the smoke can look invisible.
          // Nudge saturation slightly by pulling away from mid-gray.
          const pushFromMid = (n) => {
            const mid = 128;
            const delta = n - mid;
            return Math.round(mid + delta * 1.15);
          };
          r = pushFromMid(r);
          g = pushFromMid(g);
          b = pushFromMid(b);

          const clamp = (n) => Math.max(0, Math.min(255, n));
          resolve(`rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${alpha})`);
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const settings = {
    autoplay: true,
    autoplaySpeed: 3000,
    dots: false,
    arrows: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    afterChange: (nextIndex) => setActiveIndex(nextIndex),
  };

  useEffect(() => {
    let cancelled = false;

    const loadHeroBanners = async () => {
      try {
        const { data } = await axios.get('/api/v1/home/hero-banners');
        const items = Array.isArray(data?.banners) ? data.banners : [];
        if (!items.length) {
          if (!cancelled) {
            setBanners([]);
            setBannerLinks([]);
          }
          return;
        }

        const imageUrls = items
          .map((item) => item?.image?.url || '')
          .filter((url) => typeof url === 'string' && url.trim().length > 0);

        if (!imageUrls.length) {
          if (!cancelled) {
            setBanners([]);
            setBannerLinks([]);
          }
          return;
        }

        if (!cancelled) {
          setBanners(imageUrls);
          setBannerLinks(items.map((item) => String(item?.link || '')));
        }
      } catch {
        if (!cancelled) {
          setBanners([]);
          setBannerLinks([]);
        }
      }
    };

    loadHeroBanners();

    return () => {
      cancelled = true;
    };
  }, [fallbackBanners]);

  useEffect(() => {
    let cancelled = false;

    if (!banners.length) {
      setBannerSmokeColors([]);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const colors = await Promise.all(
        banners.map(async (src, index) => {
          const sampled = await getAverageRgba(src);
          return sampled || fallbackSmokeColors[index] || 'rgba(36, 23, 26, 0.45)';
        })
      );
      if (cancelled) return;
      setBannerSmokeColors(colors);
    })();

    return () => {
      cancelled = true;
    };
  }, [banners, fallbackSmokeColors]);

  useEffect(() => {
    const nextColor = bannerSmokeColors?.[activeIndex];
    if (nextColor) setSmokeColor(nextColor);
  }, [activeIndex, bannerSmokeColors, setSmokeColor]);

  return (
    <>
      <section
        id="home-banner"
        className="w-full rounded-sm shadow relative overflow-visible sm:overflow-hidden"
      >
        <Slider {...settings}>
          {banners.map((el, i) => {
            const imgEl = (
              <img
                draggable="false"
                className="w-full h-auto object-contain"
                src={el}
                alt={`banner-${i + 1}`}
              />
            );

            const href = bannerLinks[i] && typeof bannerLinks[i] === 'string' ? bannerLinks[i].trim() : '';

            return href ? (
              <a href={href} key={i}>
                {imgEl}
              </a>
            ) : (
              <div key={i}>{imgEl}</div>
            );
          })}
        </Slider>
      </section>
    </>
  );
};

export default Banner;
