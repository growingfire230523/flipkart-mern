import MetaData from '../Layouts/MetaData';
import LexyApp from '../LexyRecommendationsApp/LexyApp';
import Home from '../Home/Home';
import { useNavigate } from 'react-router-dom';

const LexiRecommendations = () => {
    const navigate = useNavigate();

    return (
        <>
            <MetaData title="Lexi Recommendations | Flipkart" />
            <div className="fixed inset-0 overflow-y-auto">
                <Home />
            </div>
            <main className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/30 backdrop-blur-sm p-2 sm:p-5">
                <section className="w-full sm:max-w-5xl bg-[#fff9f7] rounded-3xl shadow-2xl border border-[var(--lexy-maroon-25)] overflow-hidden lexi-reco-window max-h-[86vh] flex flex-col">
                    <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-[var(--lexy-maroon-10)]/60">
                        <div>
                            <h1 className="font-brandSerif text-lg text-primary-darkBlue">LEXI Recommendations</h1>
                            <p className="mt-1 text-xs text-primary-grey">
                                Fill your skin details to get personalized skincare &amp; makeup picks.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="ml-3 rounded-full p-1 text-primary-grey hover:bg-black/5 focus:outline-none"
                            aria-label="Close Lexi Recommendations"
                            title="Close"
                        >
                            <span className="block text-lg leading-none">×</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto lexy-hide-scrollbar px-2 sm:px-3 pb-4">
                        <LexyApp embedded={true} />
                    </div>
                </section>
            </main>
        </>
    );
};

export default LexiRecommendations;
