import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import MetaData from '../Layouts/MetaData';

const DealsConfig = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [dealEndsAtLocal, setDealEndsAtLocal] = useState('');
	const [dealOfDayProductId, setDealOfDayProductId] = useState('');
	const [dealOfDayEndsAtLocal, setDealOfDayEndsAtLocal] = useState('');

	useEffect(() => {
		let mounted = true;

		const toLocalInput = (dateValue) => {
			const d = new Date(dateValue);
			if (Number.isNaN(d.getTime())) return '';
			const pad = (v) => String(v).padStart(2, '0');
			const yyyy = d.getFullYear();
			const mm = pad(d.getMonth() + 1);
			const dd = pad(d.getDate());
			const hh = pad(d.getHours());
			const mi = pad(d.getMinutes());
			return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
		};

		const load = async () => {
			try {
				setLoading(true);
				const { data } = await axios.get('/api/v1/deals/config');
				if (!mounted) return;
				setDealEndsAtLocal(toLocalInput(data?.endsAt));
				setDealOfDayProductId(String(data?.dealOfDayProductId || ''));
				setDealOfDayEndsAtLocal(toLocalInput(data?.dealOfDayEndsAt));
			} catch (e) {
				enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to load deal config', { variant: 'error' });
			} finally {
				if (mounted) setLoading(false);
			}
		};

		load();
		return () => { mounted = false; };
	}, [enqueueSnackbar]);

	const dealEndsAtISO = useMemo(() => {
		if (!dealEndsAtLocal) return '';
		const d = new Date(dealEndsAtLocal);
		if (Number.isNaN(d.getTime())) return '';
		return d.toISOString();
	}, [dealEndsAtLocal]);

	const dealOfDayEndsAtISO = useMemo(() => {
		if (!dealOfDayEndsAtLocal) return '';
		const d = new Date(dealOfDayEndsAtLocal);
		if (Number.isNaN(d.getTime())) return '';
		return d.toISOString();
	}, [dealOfDayEndsAtLocal]);

	const handleSave = async () => {
		if (!dealEndsAtISO) {
			enqueueSnackbar('Please select a valid date/time', { variant: 'error' });
			return;
		}
		try {
			setSaving(true);
			await axios.put('/api/v1/admin/deals/config', {
				endsAt: dealEndsAtISO,
				dealOfDayProductId: String(dealOfDayProductId || '').trim(),
				dealOfDayEndsAt: dealOfDayEndsAtISO,
			}, {
				headers: { 'Content-Type': 'application/json' },
			});
			enqueueSnackbar('Deal settings updated', { variant: 'success' });
		} catch (e) {
			enqueueSnackbar(e?.response?.data?.message || e.message || 'Failed to update deal config', { variant: 'error' });
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<MetaData title="Admin | Deals" />
			<div className="flex flex-col gap-6">
				<h1 className="text-xl sm:text-2xl font-semibold text-primary-darkBlue">Deals Settings</h1>

				<div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6 max-w-3xl">
					<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Flash Deal Timer</h3>
							<p className="text-sm text-primary-grey">Controls when the Flash Deal timer ends on the homepage.</p>
						</div>

						<div className="flex flex-col sm:flex-row sm:items-end gap-3">
							<div className="flex flex-col">
								<label className="text-xs font-medium text-primary-grey uppercase tracking-wide">Ends At</label>
								<input
									type="datetime-local"
									value={dealEndsAtLocal}
									onChange={(e) => setDealEndsAtLocal(e.target.value)}
									className="mt-1 border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue"
								/>
							</div>
						</div>
					</div>
				</div>


				<div className="bg-white/80 border border-gray-200 rounded-xl shadow-sm p-6 max-w-3xl">
					<div className="flex flex-col gap-4">
						<div>
							<h3 className="text-sm font-medium uppercase tracking-wide text-primary-darkBlue">Deal Of The Day</h3>
							<p className="text-sm text-primary-grey">Set a product ID to feature on the home page. If blank, a Flash Deal product will be picked and rotated daily.</p>
						</div>

						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-primary-grey uppercase tracking-wide">Product ID</label>
								<input
									type="text"
									value={dealOfDayProductId}
									onChange={(e) => setDealOfDayProductId(e.target.value)}
									placeholder="e.g. 65a2f0d1234abc..."
									className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue"
								/>
								<p className="text-[11px] text-primary-grey">Leave blank to auto-pick from Flash Deals.</p>
							</div>

							<div className="flex flex-col gap-1">
								<label className="text-xs font-medium text-primary-grey uppercase tracking-wide">Ends At</label>
								<input
									type="datetime-local"
									value={dealOfDayEndsAtLocal}
									onChange={(e) => setDealOfDayEndsAtLocal(e.target.value)}
									className="border border-gray-200 rounded px-3 py-2 bg-white text-primary-darkBlue"
								/>
								<p className="text-[11px] text-primary-grey">Defaults to 24 hours from the time you set a product.</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex justify-end">
					<button
						type="button"
						onClick={handleSave}
						disabled={saving || loading}
						className="h-10 px-5 rounded-sm shadow-lg bg-primary-blue text-white text-xs font-medium uppercase disabled:opacity-60"
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</div>
		</>
	);
};

export default DealsConfig;
