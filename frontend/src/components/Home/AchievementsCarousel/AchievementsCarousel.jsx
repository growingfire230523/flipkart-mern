import Slider from 'react-slick';

const achievements = [
    {
        id: 'customer-love',
        label: 'Customer Love',
        title: '4.8/5 Average Rating',
        description:
            'Consistently rated highly by beauty shoppers for our curated assortment and guidance.',
        imageUrl:
            'https://dummyimage.com/1200x600/4b2a1a/ffffff&text=Customer+Love',
    },
    {
        id: 'clean-beauty',
        label: 'Clean Beauty Focus',
        title: 'Curated Clean & Conscious Brands',
        description:
            'A growing portfolio of thoughtfully selected, ingredient-conscious products across makeup, fragrance, and skincare.',
        imageUrl:
            'https://dummyimage.com/1200x600/5b3a2a/ffffff&text=Clean+Beauty+Certified',
    },
    {
        id: 'secure-payments',
        label: 'Secure Payments',
        title: 'Bank-Grade Payment Security',
        description:
            'End-to-end encrypted payment flows with best-practice security and continuous monitoring.',
        imageUrl:
            'https://dummyimage.com/1200x600/6b4632/ffffff&text=Secure+Payments',
    },
    {
        id: 'ai-innovation',
        label: 'AI Innovation',
        title: 'Lexi AI Retail Experiences',
        description:
            'Pioneering in-store AI assistants and recommendation engines tailored for beauty retail.',
        imageUrl:
            'https://dummyimage.com/1200x600/7b5240/ffffff&text=AI+Innovation',
    },
];

const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: false,
    cssEase: 'ease-in-out',
    responsive: [
        {
            breakpoint: 1024,
            settings: { slidesToShow: 2 },
        },
        {
            breakpoint: 640,
            settings: { slidesToShow: 1 },
        },
    ],
};

const AchievementsCarousel = () => {
    return (
        <section className="bg-white w-full shadow overflow-hidden">
            <div className="px-6 pt-6 pb-3 text-center">
                <h2 className="font-brandSerif text-3xl font-normal text-primary-darkBlue tracking-wide">
                    Our Achievements &amp; Certifications
                </h2>
                <p className="mt-2 text-sm text-primary-grey max-w-[720px] mx-auto">
                    A quick glimpse into the trust, innovation, and customer love that power the Lexi experience.
                </p>
            </div>

            <div className="px-2 sm:px-4 pb-6">
                <Slider {...sliderSettings}>
                    {achievements.map((item) => (
                        <div key={item.id} className="px-2 py-2">
                            <article className="group h-full bg-white border border-[var(--lexy-maroon-10)] rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                                <div className="relative h-40 sm:h-44 bg-gray-100 overflow-hidden">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover transform transition-transform duration-700 ease-out group-hover:scale-105"
                                        loading="lazy"
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-black/10 to-transparent" aria-hidden="true" />
                                    <div className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium tracking-wide text-[var(--lexy-maroon-75)] uppercase">
                                        {item.label}
                                    </div>
                                </div>

                                <div className="p-4 flex flex-col gap-2">
                                    <h3 className="font-brandSerif text-lg text-primary-darkBlue leading-snug">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm text-primary-grey leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </article>
                        </div>
                    ))}
                </Slider>
            </div>
        </section>
    );
};

export default AchievementsCarousel;
