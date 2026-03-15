import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';
import BackdropLoader from '../Layouts/BackdropLoader';
import Actions from './Actions';

const MailList = () => {
    const { enqueueSnackbar } = useSnackbar();

    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState([]);
    const [campaignSending, setCampaignSending] = useState(false);
    const [campaignMode, setCampaignMode] = useState('immediate');
    const [campaignSubject, setCampaignSubject] = useState('');
    const [campaignBody, setCampaignBody] = useState('');
    const [campaignSchedule, setCampaignSchedule] = useState('');
    const [campaignAttachments, setCampaignAttachments] = useState([]);

    const pageSizeOptions = useMemo(() => ([100, 500, 1000, 5000]), []);
    const [pageSize, setPageSize] = useState(100);
    const [page, setPage] = useState(0);

    const [keyword, setKeyword] = useState('');
    const [source, setSource] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        setPage(0);
    }, [keyword, source, dateFrom, dateTo]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/v1/admin/mailing-list');
                if (!mounted) return;
                setEntries(Array.isArray(data?.entries) ? data.entries : []);
            } catch (e) {
                if (!mounted) return;
                enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to load mail list', { variant: 'error' });
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [enqueueSnackbar]);

    const deleteEntry = async (id) => {
        try {
            await axios.delete(`/api/v1/admin/mailing-list/${id}`);
            setEntries((prev) => prev.filter((item) => item._id !== id));
            enqueueSnackbar('Mail list entry deleted', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to delete entry', { variant: 'error' });
        }
    };

    const rows = entries.map((item) => ({
        id: item._id,
        name: item.name || '—',
        email: item.email,
        source: item.source || 'footer',
        subscribedOn: item.subscribedAt ? new Date(item.subscribedAt).toISOString().substring(0, 10) : '',
        createdAt: item.createdAt,
    }));

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

            if (source && String(r.source || '') !== String(source)) return false;

            const created = r.createdAt ? new Date(r.createdAt).getTime() : undefined;
            if (fromMs !== undefined && created !== undefined && created < fromMs) return false;
            if (toMs !== undefined && created !== undefined && created > toMs) return false;

            return true;
        });
    }, [rows, normalizedKeyword, source, dateFrom, dateTo]);

    const totalCount = rows.length;
    const filteredCount = filteredRows.length;

    const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 100;
    const totalPages = safePageSize > 0 ? Math.max(1, Math.ceil(filteredCount / safePageSize)) : 1;
    const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
    const from = filteredCount === 0 ? 0 : safePage * safePageSize + 1;
    const to = filteredCount === 0 ? 0 : Math.min((safePage + 1) * safePageSize, filteredCount);
    const pageRows = filteredRows.slice(safePage * safePageSize, (safePage + 1) * safePageSize);

    const handleSendCampaign = async () => {
        const subject = String(campaignSubject || '').trim();
        const body = String(campaignBody || '').trim();
        if (!subject || !body) {
            enqueueSnackbar('Please add a subject and message body.', { variant: 'error' });
            return;
        }

        if (campaignMode === 'scheduled' && !campaignSchedule) {
            enqueueSnackbar('Please select a schedule time.', { variant: 'error' });
            return;
        }

        try {
            setCampaignSending(true);
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('body', body);
            formData.append('mode', campaignMode);
            if (campaignMode === 'scheduled') {
                formData.append('scheduledAt', new Date(campaignSchedule).toISOString());
            }

            const filters = {
                keyword,
                source,
                dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : null,
                dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : null,
            };
            formData.append('filters', JSON.stringify(filters));

            campaignAttachments.forEach((file) => {
                formData.append('attachments', file);
            });

            await axios.post('/api/v1/admin/mailing-list/campaigns', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            enqueueSnackbar(
                campaignMode === 'scheduled'
                    ? 'Campaign scheduled.'
                    : 'Campaign is sending now.',
                { variant: 'success' }
            );
            setCampaignSubject('');
            setCampaignBody('');
            setCampaignSchedule('');
            setCampaignAttachments([]);
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to send campaign', { variant: 'error' });
        } finally {
            setCampaignSending(false);
        }
    };

    const renderSourcePill = (value) => {
        const label = String(value || 'footer');
        const tone = label === 'signup' || label === 'google' ? 'bg-primary-blue/10 text-primary-blue' : 'bg-gray-100 text-primary-grey';
        return (
            <span className={`text-sm ${tone} p-1 px-2 font-medium rounded-full capitalize`}>{label}</span>
        );
    };

    return (
        <>
            <MetaData title="Admin Mail List | Flipkart" />

            {loading && <BackdropLoader />}

            <h1 className="text-lg font-medium uppercase">mail list</h1>

            <div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm px-4 py-4 mb-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Mass Mail</h2>
                            <p className="text-xs text-primary-grey">Send promotions to the filtered mailing list.</p>
                        </div>
                        <div className="text-xs text-primary-grey">
                            Recipients: <span className="font-medium text-primary-darkBlue">{filteredRows.length}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-primary-grey mb-1">Subject</label>
                            <input
                                value={campaignSubject}
                                onChange={(e) => setCampaignSubject(e.target.value)}
                                placeholder="Subject line"
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-primary-grey mb-1">Send Mode</label>
                            <select
                                value={campaignMode}
                                onChange={(e) => setCampaignMode(e.target.value)}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            >
                                <option value="immediate">Send Now</option>
                                <option value="scheduled">Schedule</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-primary-grey mb-1">Message (supports HTML)</label>
                            <textarea
                                value={campaignBody}
                                onChange={(e) => setCampaignBody(e.target.value)}
                                placeholder="Write your promotional message here..."
                                rows={5}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-primary-grey mb-1">Schedule Time</label>
                            <input
                                type="datetime-local"
                                value={campaignSchedule}
                                onChange={(e) => setCampaignSchedule(e.target.value)}
                                disabled={campaignMode !== 'scheduled'}
                                className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue disabled:opacity-60"
                            />
                            <p className="mt-2 text-[11px] text-primary-grey">Uses your local timezone.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-primary-grey mb-1">Attachments</label>
                            <input
                                type="file"
                                multiple
                                onChange={(e) => setCampaignAttachments(Array.from(e.target.files || []))}
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                className="w-full text-sm text-primary-grey"
                            />
                            <p className="mt-2 text-[11px] text-primary-grey">Allowed: images, PDF, DOC, DOCX, TXT. Max 3MB per file.</p>
                            {campaignAttachments.length ? (
                                <div className="mt-2 text-[11px] text-primary-darkBlue/80">
                                    {campaignAttachments.map((file) => file.name).join(', ')}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleSendCampaign}
                            disabled={campaignSending}
                            className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
                        >
                            {campaignSending ? 'Sending...' : campaignMode === 'scheduled' ? 'Schedule' : 'Send Now'}
                        </button>
                    </div>
                </div>
            </div>

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
                    <span>entries per page</span>
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
                            placeholder="Search by name, email, or entry ID"
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        />
                    </div>

                    <div className="min-w-[200px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Source</label>
                        <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white/80 text-primary-darkBlue"
                        >
                            <option value="">All</option>
                            <option value="footer">Footer</option>
                            <option value="signup">Signup</option>
                            <option value="google">Google</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div className="min-w-[300px]">
                        <label className="block text-xs font-medium text-primary-grey mb-1">Subscribed Date</label>
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
                                <th className="px-4 py-3 whitespace-nowrap">Source</th>
                                <th className="px-4 py-3 whitespace-nowrap">Subscribed On</th>
                                <th className="px-4 py-3 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {pageRows.map((row) => (
                                <tr key={row.id} className="hover:bg-primary-pink/5">
                                    <td className="px-4 py-3 text-primary-darkBlue whitespace-nowrap">{row.name}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.email}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{renderSourcePill(row.source)}</td>
                                    <td className="px-4 py-3 text-primary-grey whitespace-nowrap">{row.subscribedOn}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <Actions editRoute="review" deleteHandler={deleteEntry} id={row.id} name={row.email} />
                                    </td>
                                </tr>
                            ))}

                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-primary-grey">
                                        No mail list entries found.
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

export default MailList;
