import { useEffect, useState } from 'react';
import Sidebar from './Sidebar/Sidebar';
import MenuIcon from '@mui/icons-material/Menu';

const Dashboard = ({ activeTab, children }) => {

    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        const media = window.matchMedia('(max-width: 639px)');

        const syncIsMobile = () => setIsMobile(media.matches);

        syncIsMobile();
        media.addEventListener('change', syncIsMobile);
        return () => media.removeEventListener('change', syncIsMobile);
    }, []);

    useEffect(() => {
        // Default behavior per breakpoint:
        // - Mobile: start closed
        // - Desktop: start open
        setSidebarOpen(!isMobile);
    }, [isMobile]);

    return (
        <>
            <main className="flex min-h-screen mt-2 sm:min-w-full text-primary-darkBlue bg-[#fff9f7]">

                {isMobile && sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close sidebar"
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/30 z-[8] sm:hidden"
                    />
                )}

                {sidebarOpen && (
                    <Sidebar
                        activeTab={activeTab}
                        setToggleSidebar={setSidebarOpen}
                        isMobile={isMobile}
                    />
                )}

                <div className="flex-1 min-h-screen">
                    <div className="flex flex-col gap-6 sm:m-8 p-2 pb-6 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen((v) => !v)}
                            className="bg-primary-darkBlue/90 hover:bg-primary-darkBlue w-10 h-10 rounded-full shadow text-white flex items-center justify-center"
                            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                        >
                            <MenuIcon />
                        </button>
                        {children}
                    </div>
                </div>
            </main>
        </>
    );
};

export default Dashboard;
