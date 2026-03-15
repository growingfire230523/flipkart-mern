import virtualTryOnImage from '../../../assets/images/Virtual_Try_On.jpg';

const VirtualTryOnTeaser = () => {
    return (
        <section className="w-full bg-white shadow overflow-hidden">
            <div className="relative w-full bg-[#fdf6f3]">
                <img
                    src={virtualTryOnImage}
                    alt="Virtual Try On preview"
                    className="w-full h-auto max-h-[80vh] object-contain opacity-70"
                    aria-hidden="true"
                    draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/70 to-white/80" aria-hidden="true" />

                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="max-w-2xl mx-auto px-6 py-8 sm:py-10 text-center flex flex-col gap-3">
                    <h2 className="font-brandSerif text-3xl sm:text-4xl font-normal tracking-wide text-primary-darkBlue">
                        Virtual Try On
                    </h2>
                    <p className="text-base sm:text-lg font-medium text-[var(--lexy-maroon-75)] uppercase tracking-[0.2em]">
                        Coming Soon!
                    </p>
                    <p className="mt-1 text-sm sm:text-base text-primary-grey max-w-xl mx-auto">
                        We are working on an immersive, camera-powered experience so you can preview looks and shades before you buy.
                    </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default VirtualTryOnTeaser;
