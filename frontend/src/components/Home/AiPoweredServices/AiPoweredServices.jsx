import { Link } from 'react-router-dom';

import service1 from '../../../assets/images/LEXI_AI_Chat_service.png';
import service2 from '../../../assets/images/LEXI_AI_Recommendation_service.png';
import service3 from '../../../assets/images/LEXI_AI_FindMyFragrance_service.png';
import service4 from '../../../assets/images/LEXI_AI_MakeMyKit_service.png';

const services = [
    {
        key: 'assistant',
        title: 'MILAARI: AI Shopping Assistant',
        blurb: 'Ask for product help in natural language—budget, skin concerns, gifting ideas, and more.',
        cta: 'TRY IT NOW!',
        to: '/?open=lexi-assistant',
        imageSrc: service1,
        imageAlt: 'Milaari AI Assistant',
    },
    {
        key: 'recommender',
        title: 'MILAARI Personalized Picks',
        blurb: 'Get tailored recommendations based on your preferences—like a personal beauty concierge.',
        cta: 'TRY IT NOW!',
        to: '/lexi-recommendations',
        imageSrc: service2,
        imageAlt: 'Milaari Product Recommender',
    },
    {
        key: 'fragrance',
        title: 'MILAARI Find My Fragrance',
        blurb: 'Answer a few quick questions and discover a fragrance profile that matches your vibe.',
        cta: 'TRY IT NOW!',
        to: '/fragrance-finder',
        imageSrc: service3,
        imageAlt: 'Milaari Find My Fragrance',
    },
    {
        key: 'kit',
        title: 'MILAARI Make My Kit',
        blurb: 'Instantly build a curated kit of top-rated essentials and add them to your cart in one go.',
        cta: 'TRY IT NOW!',
        to: '/?open=make-my-kit',
        imageSrc: service4,
        imageAlt: 'Milaari Make My Kit',
    },
];

const AiPoweredServices = () => {
    return (
        <section className="bg-white w-full shadow overflow-hidden">
            <div className="px-6 py-5">
                <h2 className="text-center font-brandSerif text-3xl font-normal text-primary-darkBlue tracking-wide">
                    OUR AI-POWERED SERVICES
                </h2>
                <p className="mt-2 text-center text-sm text-primary-grey max-w-[720px] mx-auto">
                    Explore Milaari—our in-store AI experiences designed to help you shop faster, smarter, and more confidently.
                </p>
            </div>

            <div className="px-4 sm:px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {services.map((s) => (
                        <div key={s.key} className="bg-white border border-gray-200 rounded-sm overflow-hidden">
                            <div className="h-44 bg-gray-50 flex items-center justify-center">
                                {s.imageSrc ? (
                                    <img
                                        src={s.imageSrc}
                                        alt={s.imageAlt}
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full" aria-hidden="true" />
                                )}
                            </div>

                            <div className="p-4">
                                <div className="text-[12px] uppercase tracking-widest text-primary-darkBlue leading-snug">
                                    {s.title}
                                </div>
                                <div className="mt-2 text-sm text-primary-grey leading-relaxed">{s.blurb}</div>

                                <div className="mt-4">
                                    <Link
                                        to={s.to}
                                        className="inline-flex items-center justify-center bg-primary-blue text-xs font-medium text-white px-5 py-2.5 rounded-sm shadow-lg uppercase"
                                    >
                                        {s.cta}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AiPoweredServices;
