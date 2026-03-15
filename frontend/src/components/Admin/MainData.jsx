import { useEffect, useState } from 'react';
import 'chart.js/auto';
import { Doughnut, Line, Pie, Bar } from 'react-chartjs-2';
import { categories } from '../../utils/constants';
import MetaData from '../Layouts/MetaData';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const CT_COLORS = {
    burgundy: '#6b1f2c',
    rose: '#b76e79',
    gold: '#d6b36a',
    green: '#2a5f44',
    cocoa: '#24171a',
};

const MainData = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [dashboardStats, setDashboardStats] = useState(null);
    const [dealEndsAt, setDealEndsAt] = useState(null);
    const [dealOfDayEndsAt, setDealOfDayEndsAt] = useState(null);
    const [mailListCount, setMailListCount] = useState(0);
    const [dealTimer, setDealTimer] = useState('');
    const [dealOfDayTimer, setDealOfDayTimer] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadDashboardStats = async () => {
            try {
                const { data } = await axios.get('/api/v1/admin/dashboard/stats');
                if (!mounted) return;
                setDashboardStats(data || null);
            } catch (e) {
                if (!mounted) return;
                enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to load dashboard stats', { variant: 'error' });
            }
        };

        loadDashboardStats();
        return () => { mounted = false; };
    }, [enqueueSnackbar]);

    useEffect(() => {
        let mounted = true;

        const loadExtras = async () => {
            try {
                const [{ data: dealData }, { data: mailData }] = await Promise.all([
                    axios.get('/api/v1/deals/config'),
                    axios.get('/api/v1/admin/mailing-list'),
                ]);

                if (!mounted) return;
                setDealEndsAt(dealData?.endsAt ? new Date(dealData.endsAt) : null);
                setDealOfDayEndsAt(dealData?.dealOfDayEndsAt ? new Date(dealData.dealOfDayEndsAt) : null);
                setMailListCount(Array.isArray(mailData?.entries) ? mailData.entries.length : 0);
            } catch {
                if (!mounted) return;
            }
        };

        loadExtras();
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const formatCountdown = (target) => {
            if (!target || Number.isNaN(target.getTime())) return 'Not set';
            const diff = target.getTime() - Date.now();
            if (diff <= 0) return 'Ended';
            const totalSeconds = Math.floor(diff / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const pad = (v) => String(v).padStart(2, '0');
            return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
        };

        const tick = () => {
            setDealTimer(formatCountdown(dealEndsAt));
            setDealOfDayTimer(formatCountdown(dealOfDayEndsAt));
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [dealEndsAt, dealOfDayEndsAt]);

    const summary = dashboardStats?.summary || {};
    const charts = dashboardStats?.charts || {};
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentYear = new Date().getFullYear();
    const yearlySales = Array.isArray(charts?.yearlySales) ? charts.yearlySales : [];

    const lineState = {
        labels: months,
        datasets: [
            {
                label: `Sales in ${currentYear - 2}`,
                borderColor: CT_COLORS.burgundy,
                backgroundColor: CT_COLORS.burgundy,
                data: yearlySales.find((entry) => entry.year === currentYear - 2)?.monthly || Array(12).fill(0),
            },
            {
                label: `Sales in ${currentYear - 1}`,
                borderColor: CT_COLORS.gold,
                backgroundColor: CT_COLORS.gold,
                data: yearlySales.find((entry) => entry.year === currentYear - 1)?.monthly || Array(12).fill(0),
            },
            {
                label: `Sales in ${currentYear}`,
                borderColor: CT_COLORS.green,
                backgroundColor: CT_COLORS.green,
                data: yearlySales.find((entry) => entry.year === currentYear)?.monthly || Array(12).fill(0),
            },
        ],
    };

    const statuses = ['Processing', 'Shipped', 'Delivered'];
    const pieState = {
        labels: statuses,
        datasets: [
            {
                backgroundColor: [CT_COLORS.rose, CT_COLORS.gold, CT_COLORS.green],
                hoverBackgroundColor: [CT_COLORS.rose, CT_COLORS.gold, CT_COLORS.green],
                data: statuses.map((status) => Number(charts?.orderStatus?.[status] || 0)),
            },
        ],
    };

    const doughnutState = {
        labels: ['Out of Stock', 'In Stock'],
        datasets: [
            {
                backgroundColor: [CT_COLORS.rose, CT_COLORS.green],
                hoverBackgroundColor: [CT_COLORS.rose, CT_COLORS.green],
                data: [
                    Number(charts?.stockBreakdown?.outOfStock || 0),
                    Number(charts?.stockBreakdown?.inStock || 0),
                ],
            },
        ],
    };

    const barState = {
        labels: categories,
        datasets: [
            {
                label: 'Products',
                borderColor: CT_COLORS.burgundy,
                backgroundColor: CT_COLORS.burgundy,
                hoverBackgroundColor: CT_COLORS.burgundy,
                data: categories.map((cat) => Number(charts?.productsByCategory?.[cat] || 0)),
            },
        ],
    };

    return (
        <>
            <MetaData title="Admin Dashboard | Flipkart" />

            <div className="mb-4 sm:mb-6">
                <h1 className="font-brandSerif text-2xl sm:text-3xl font-normal text-primary-darkBlue tracking-wide">
                    Admin Dashboard
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-primary-grey">
                    Quick view of your store performance, deals and subscribers.
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-6 text-sm">
                <div className="flex flex-col bg-white border border-gray-200 border-t-4 border-t-primary-blue gap-2 rounded-xl shadow-sm p-5">
                    <h4 className="text-primary-grey font-brandSerif uppercase tracking-wide text-[11px]">Total Sales Amount</h4>
                    <h2 className="text-2xl font-semibold text-primary-darkBlue">₹{Number(summary?.totalSalesAmount || 0).toLocaleString()}</h2>
                </div>
                <div className="flex flex-col bg-white border border-gray-200 border-t-4 border-t-primary-orange gap-2 rounded-xl shadow-sm p-5">
                    <h4 className="text-primary-grey font-brandSerif uppercase tracking-wide text-[11px]">Total Orders</h4>
                    <h2 className="text-2xl font-semibold text-primary-darkBlue">{Number(summary?.totalOrders || 0).toLocaleString()}</h2>
                </div>
                <div className="flex flex-col bg-white border border-gray-200 border-t-4 border-t-primary-yellow gap-2 rounded-xl shadow-sm p-5">
                    <h4 className="text-primary-grey font-brandSerif uppercase tracking-wide text-[11px]">Total Products</h4>
                    <h2 className="text-2xl font-semibold text-primary-darkBlue">{Number(summary?.totalProducts || 0).toLocaleString()}</h2>
                </div>
                <div className="flex flex-col bg-white border border-gray-200 border-t-4 border-t-primary-green gap-2 rounded-xl shadow-sm p-5">
                    <h4 className="text-primary-grey font-brandSerif uppercase tracking-wide text-[11px]">Total Users</h4>
                    <h2 className="text-2xl font-semibold text-primary-darkBlue">{Number(summary?.totalUsers || 0).toLocaleString()}</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 text-sm">
                <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <h4 className="text-primary-grey font-brandSerif uppercase tracking-wide text-[11px]">Flash Deal Ends In</h4>
                    <p className="mt-2 text-base sm:text-lg font-semibold text-primary-darkBlue">{dealTimer || 'Not set'}</p>
                </div>
                <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <h4 className="text-primary-grey font-brandSerif uppercase tracking-wide text-[11px]">Deal Of The Day Ends In</h4>
                    <p className="mt-2 text-base sm:text-lg font-semibold text-primary-darkBlue">{dealOfDayTimer || 'Not set'}</p>
                </div>
                <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <h4 className="text-primary-grey font-brandSerif uppercase tracking-wide text-[11px]">Mail List Subscribers</h4>
                    <p className="mt-2 text-base sm:text-lg font-semibold text-primary-darkBlue">{Number(mailListCount || 0).toLocaleString()}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-8 min-w-full text-sm">
                <div className="bg-white border border-gray-200 rounded-xl h-auto w-full shadow-sm p-4">
                    <Line data={lineState} />
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-center">
                    <span className="text-xs sm:text-sm font-brandSerif uppercase tracking-wide text-primary-darkBlue">Order Status</span>
                    <Pie data={pieState} />
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-8 min-w-full mb-6 text-sm">
                <div className="bg-white border border-gray-200 rounded-xl h-auto w-full shadow-sm p-4">
                    <Bar data={barState} />
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 text-center">
                    <span className="text-xs sm:text-sm font-brandSerif uppercase tracking-wide text-primary-darkBlue">Stock Status</span>
                    <Doughnut data={doughnutState} />
                </div>
            </div>
        </>
    );
};

export default MainData;
