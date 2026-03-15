import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { clearErrors, deleteUser, getAllUsers } from '../../actions/userAction';
import { DELETE_USER_RESET } from '../../constants/userConstants';
import Actions from './Actions';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';

const UserTable = () => {

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { users, error } = useSelector((state) => state.users);
    const { loading, isDeleted, error: deleteError } = useSelector((state) => state.profile);

    const pageSizeOptions = useMemo(() => ([100, 500, 1000, 5000]), []);
    const [pageSize, setPageSize] = useState(100);
    const [page, setPage] = useState(0);

    const [keyword, setKeyword] = useState('');
    const [role, setRole] = useState('');
    const [gender, setGender] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        setPage(0);
    }, [keyword, role, gender, dateFrom, dateTo]);

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (deleteError) {
            enqueueSnackbar(deleteError, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isDeleted) {
            enqueueSnackbar("User Deleted Successfully", { variant: "success" });
            dispatch({ type: DELETE_USER_RESET });
        }
        dispatch(getAllUsers());
    }, [dispatch, error, deleteError, isDeleted, enqueueSnackbar]);

    const deleteUserHandler = (id) => {
        dispatch(deleteUser(id));
    }

    const rows = [];

    (users || []).forEach((item) => {
        rows.push({
            id: item._id,
            name: item.name,
            avatar: item.avatar?.url,
            email: item.email,
            gender: item.gender,
            role: item.role,
            registeredOn: item.createdAt ? new Date(item.createdAt).toISOString().substring(0, 10) : '',
            createdAt: item.createdAt,
        });
    });

    rows.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
    });

    const normalizedKeyword = String(keyword || '').trim().toLowerCase();
    const filteredRows = useMemo(() => {
        const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : undefined;
        const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : undefined;

        return rows.filter((r) => {
            if (normalizedKeyword) {
                const hay = `${r.id || ''} ${r.name || ''} ${r.email || ''}`.toLowerCase();
                if (!hay.includes(normalizedKeyword)) return false;
            }

            if (role && String(r.role) !== String(role)) return false;
            if (gender && String(r.gender || '').toLowerCase() !== String(gender).toLowerCase()) return false;

            const created = r.createdAt ? new Date(r.createdAt).getTime() : undefined;
            if (fromMs !== undefined && created !== undefined && created < fromMs) return false;
            if (toMs !== undefined && created !== undefined && created > toMs) return false;

            return true;
        });
    }, [rows, normalizedKeyword, role, gender, dateFrom, dateTo]);

    const totalCount = rows.length;
    const filteredCount = filteredRows.length;

    const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 100;
    const totalPages = safePageSize > 0 ? Math.max(1, Math.ceil(filteredCount / safePageSize)) : 1;
    const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
    const from = filteredCount === 0 ? 0 : safePage * safePageSize + 1;
    const to = filteredCount === 0 ? 0 : Math.min((safePage + 1) * safePageSize, filteredCount);
    const pageRows = filteredRows.slice(safePage * safePageSize, (safePage + 1) * safePageSize);

    const renderRolePill = (r) => {
        return r === 'admin' ? (
            <span className="text-sm bg-primary-blue/10 p-1 px-2 font-medium rounded-full text-primary-blue capitalize">{r}</span>
        ) : (
            <span className="text-sm bg-gray-100 p-1 px-2 font-medium rounded-full text-primary-grey capitalize">{r || 'user'}</span>
        );
    };

    return (
        <>
            <MetaData title="Admin Users | Flipkart" />

            {loading && <BackdropLoader />}

            <h1 className="text-lg font-medium uppercase">users</h1>

            <div className="flex items-center justify-between mt-4 mb-2">
                <div className="flex items-center gap-2 text-sm text-primary-grey">
                    <span className="font-medium text-primary-darkBlue">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            const next = Number(e.target.value);
                            setPage(0);
                            setPageSize(next);
                        }}
                        className="border border-gray-200 rounded-md px-2 py-1 bg-white/80 text-primary-darkBlue"
                    >
                        {pageSizeOptions.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <span>users per page</span>
                </div>

                <div className="text-sm text-primary-grey">
                    <span className="font-medium text-primary-darkBlue">{from}-{to}</span>
                    <span> of </span>
                    <span className="font-medium text-primary-darkBlue">{filteredCount}</span>
                    {filteredCount !== totalCount ? (
                        <span className="text-primary-grey"> (filtered from {totalCount})</span>
                    ) : null}
                </div>
            </div>

            <div className="bg-white/70 border border-gray-200 rounded-xl shadow-sm px-3 py-3 mb-3">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Search</label>
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Search by name, email, or user ID"
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        />
                    </div>

                    <div className="min-w-[200px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        >
                            <option value="">All</option>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="min-w-[200px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Gender</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        >
                            <option value="">All</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    <div className="min-w-[300px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Registered Date</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm w-full flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200">
                            <tr className="text-left text-primary-darkBlue">
                                <th className="px-4 py-3 whitespace-nowrap">Name</th>
                                <th className="px-4 py-3 whitespace-nowrap">Email</th>
                                <th className="px-4 py-3 whitespace-nowrap">Gender</th>
                                <th className="px-4 py-3 whitespace-nowrap">Role</th>
                                <th className="px-4 py-3 whitespace-nowrap">Registered On</th>
                                <th className="px-4 py-3 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {pageRows.map((row) => (
                                <tr key={row.id} className="hover:bg-primary-pink/5">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 min-w-[240px]">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                                {row.avatar ? (
                                                    <img draggable="false" src={row.avatar} alt={row.name} className="w-full h-full object-cover" />
                                                ) : null}
                                            </div>
                                            <span className="text-primary-darkBlue">{row.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.email}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{String(row.gender || '').toUpperCase()}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{renderRolePill(row.role)}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.registeredOn}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <Actions editRoute={"user"} deleteHandler={deleteUserHandler} id={row.id} name={row.name} />
                                    </td>
                                </tr>
                            ))}

                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-primary-grey">
                                        No users found.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-gray-200 bg-white/70">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={safePage <= 0}
                        className="px-3 py-1.5 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Prev
                    </button>
                    <span className="text-sm text-primary-grey">Page <span className="font-medium text-primary-darkBlue">{safePage + 1}</span> / <span className="font-medium text-primary-darkBlue">{totalPages}</span></span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={safePage >= totalPages - 1}
                        className="px-3 py-1.5 rounded border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    );
};

export default UserTable;