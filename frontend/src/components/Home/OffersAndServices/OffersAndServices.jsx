import { Link } from 'react-router-dom';

import service1 from '../../../assets/images/service_1.jpg';
import service2 from '../../../assets/images/service_2.png';
import service3 from '../../../assets/images/service_3.jpg';
import service4 from '../../../assets/images/service_4.png';

const cards = [
    {
        image: service1,
        title: 'SIGNATURE VIP PROGRAM',
        description: 'Exclusive access to products, rewards, points and more.',
        cta: 'LEARN MORE',
        to: '/lexi-community',
    },
    {
        image: service2,
        title: 'EXCLUSIVE OFFERS',
        description: 'Discover exclusive offers, benefits, and promotions.',
        cta: 'LEARN MORE',
        to: '/products',
    },
    {
        image: service3,
        title: 'VIRTUAL TRY ON',
        description: 'Find your perfect shade and discover our iconic products.',
        cta: 'TRY IT ON',
        to: '/lexi-recommendations',
    },
    {
        image: service4,
        title: 'SERVICE 4',
        description: 'Add your fourth service description here. This one is Special.',
        cta: 'LEARN MORE',
        to: '/',
    },
];

const OffersAndServices = () => {
    return (
        <section className="w-full md:mx-auto md:max-w-6xl">
            <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4 sm:p-8">
                <h2 className="text-center font-brandSerif text-2xl sm:text-4xl font-normal tracking-wide text-gray-900">
                    OFFERS AND SERVICES
                </h2>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cards.map((card) => (
                        <article key={card.title} className="flex flex-col items-center text-center">
                            <div className="w-full border border-gray-200 bg-gray-50 overflow-hidden">
                                <img
                                    src={card.image}
                                    alt=""
                                    className="w-full h-72 sm:h-80 object-cover"
                                    loading="lazy"
                                />
                            </div>

                            <h3 className="mt-4 text-sm font-semibold tracking-wide text-gray-900">
                                {card.title}
                            </h3>

                            <p className="mt-3 text-sm text-gray-700 max-w-sm">
                                {card.description}
                            </p>

                            <Link
                                to={card.to}
                                className="mt-5 inline-flex items-center justify-center px-10 py-3 rounded-sm bg-black text-white text-xs font-medium tracking-wide"
                            >
                                {card.cta}
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default OffersAndServices;
