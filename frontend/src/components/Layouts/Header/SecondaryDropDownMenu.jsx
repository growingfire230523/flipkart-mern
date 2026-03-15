import NotificationsIcon from '@mui/icons-material/Notifications';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DownloadIcon from '@mui/icons-material/Download';

const SecondaryDropDownMenu = ({ open = false }) => {

    const navs = [
        {
            title: "Notification Preferences",
            icon: <NotificationsIcon sx={{ fontSize: "18px" }} />,
            redirect: "https://www.flipkart.com/communication-preferences/push",
        },
        {
            title: "Sell on Flipkart",
            icon: <BusinessCenterIcon sx={{ fontSize: "18px" }} />,
            redirect: "https://seller.flipkart.com/sell-online",
        },
        {
            title: "24x7 Customer Care",
            icon: <LiveHelpIcon sx={{ fontSize: "18px" }} />,
            redirect: "https://www.flipkart.com/helpcentre",
        },
        {
            title: "Advertise",
            icon: <TrendingUpIcon sx={{ fontSize: "18px" }} />,
            redirect: "https://advertising.flipkart.com",
        },
        {
            title: "Download App",
            icon: <DownloadIcon sx={{ fontSize: "18px" }} />,
            redirect: "https://www.flipkart.com/mobile-apps",
        },
    ]

    return (
        <div
            aria-hidden={!open}
            className={
                `absolute w-60 -right-2 top-9 bg-white shadow-2xl rounded flex-col text-sm ` +
                `transform-gpu origin-top transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ` +
                (open
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 -translate-y-1 scale-95 pointer-events-none')
            }
        >

            {navs.map((item, i) => {

                const { title, icon, redirect } = item;

                return (
                    <a className="pl-3 py-3.5 border-b flex gap-3 items-center hover:bg-gray-50 rounded-t" href={redirect} key={i}>
                        <span className="text-primary-blue">{icon}</span>
                        {title}
                    </a>
                )
            })}

            <div className="absolute right-1/2 -top-2.5">
                <div className="arrow_down"></div>
            </div>
        </div>
    );
};

export default SecondaryDropDownMenu;
