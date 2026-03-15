import signupSideImage from '../../assets/images/Signup.webp';

const FormSidebar = ({ title, tag }) => {
    return (
        <div className="loginSidebar relative overflow-hidden bg-[var(--lexy-maroon-75)] px-9 py-10 hidden sm:flex flex-col gap-4 w-2/5">
            {/* Background image (faded, behind text) */}
            <img
                src={signupSideImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20"
                aria-hidden="true"
                draggable="false"
            />
            {/* Dark overlay to keep text readable */}
            <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

            <div className="relative z-[1]">
                <h1 className="font-brandSerif font-normal text-white text-3xl">{title}</h1>
                <p className="text-white/90 text-lg pr-2 mt-3">{tag}</p>
            </div>
        </div>
    );
};

export default FormSidebar;