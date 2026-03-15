import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PriceSidebar from './PriceSidebar';
import Stepper from './Stepper';
import { useSnackbar } from 'notistack';
import { saveShippingInfo } from '../../actions/cartAction';
import { useNavigate } from 'react-router-dom';
import MetaData from '../Layouts/MetaData';
import states from '../../utils/states';

const Shipping = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const { cartItems } = useSelector((state) => state.cart);
    const { shippingInfo } = useSelector((state) => state.cart);

    const [address, setAddress] = useState(shippingInfo.address);
    const [city, setCity] = useState(shippingInfo.city);
    const [country, setCountry] = useState('IN');
    const [state, setState] = useState(shippingInfo.state);
    const [pincode, setPincode] = useState(shippingInfo.pincode);
    const [phoneNo, setPhoneNo] = useState(shippingInfo.phoneNo);
    const [whatsappTransactionalOptIn, setWhatsappTransactionalOptIn] = useState(Boolean(shippingInfo.whatsappTransactionalOptIn));
    const [locating, setLocating] = useState(false);

    const reverseGeocodeToAddress = async ({ latitude, longitude }) => {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`;
        const res = await fetch(url, {
            headers: {
                // Nominatim usage requires a valid User-Agent or Referer in many cases.
                // Browsers control User-Agent; Referer will be your site origin.
                'Accept': 'application/json',
            },
        });

        if (!res.ok) {
            throw new Error(`Reverse geocoding failed (${res.status})`);
        }

        const data = await res.json();
        const addr = data?.address || {};

        const cityValue = addr.city || addr.town || addr.village || addr.county || '';
        const stateName = addr.state || '';
        const postcode = addr.postcode || '';

        const parts = [
            addr.house_number,
            addr.road,
            addr.neighbourhood,
            addr.suburb,
        ].filter(Boolean);

        const addressValue = parts.length > 0 ? parts.join(', ') : (data?.display_name || '');

        const stateCode = states.find((s) => String(s.name).toLowerCase() === String(stateName).toLowerCase())?.code || '';

        return {
            address: addressValue,
            city: cityValue,
            pincode: postcode,
            stateCode,
        };
    };

    const useCurrentLocation = async () => {
        if (!('geolocation' in navigator)) {
            enqueueSnackbar('Location is not supported in this browser', { variant: 'error' });
            return;
        }

        // Geolocation requires HTTPS (except localhost).
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (window.location.protocol !== 'https:' && !isLocalhost) {
            enqueueSnackbar('Location requires HTTPS to work', { variant: 'error' });
            return;
        }

        try {
            setLocating(true);

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 12000,
                    maximumAge: 0,
                });
            });

            const { latitude, longitude } = position.coords || {};
            if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                throw new Error('Could not read coordinates');
            }

            const filled = await reverseGeocodeToAddress({ latitude, longitude });

            if (filled.address) setAddress(filled.address);
            if (filled.city) setCity(filled.city);
            if (filled.pincode) setPincode(filled.pincode);
            if (filled.stateCode) setState(filled.stateCode);

            enqueueSnackbar('Address filled from current location', { variant: 'success' });
        } catch (e) {
            const code = e?.code;
            if (code === 1) {
                enqueueSnackbar('Location permission denied', { variant: 'error' });
            } else if (code === 2) {
                enqueueSnackbar('Location unavailable. Try again.', { variant: 'error' });
            } else if (code === 3) {
                enqueueSnackbar('Location request timed out', { variant: 'error' });
            } else {
                enqueueSnackbar(e?.message || 'Could not fetch current location', { variant: 'error' });
            }
        } finally {
            setLocating(false);
        }
    };

    const shippingSubmit = (e) => {
        e.preventDefault();

        if (phoneNo.length < 10 || phoneNo.length > 10) {
            enqueueSnackbar("Invalid Phone Number", { variant: "error" });
            return;
        }
        dispatch(saveShippingInfo({ address, city, country, state, pincode, phoneNo, whatsappTransactionalOptIn }));
        navigate("/order/confirm");
    }

    return (
        <>
            <MetaData title="Flipkart: Shipping Details" />
            <main className="w-full mt-4">

                {/* <!-- row --> */}
                <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-11/12 mt-0 sm:mt-4 m-auto sm:mb-7 overflow-hidden">

                    {/* <!-- cart column --> */}
                    <div className="flex-1">

                        <Stepper activeStep={1}>
                            <div className="w-full bg-white">

                                <form onSubmit={shippingSubmit} autoComplete="off" className="flex flex-col justify-start gap-3 w-full sm:w-3/4 mx-1 sm:mx-8 my-4">

                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-primary-grey">Fill address faster using your current location</span>
                                        <button
                                            type="button"
                                            onClick={useCurrentLocation}
                                            disabled={locating}
                                            className="px-4 py-2 rounded-sm border border-primary-blue text-primary-blue text-xs font-medium uppercase hover:bg-primary-blue hover:text-white disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-primary-blue"
                                        >
                                            {locating ? 'Locating...' : 'Use current location'}
                                        </button>
                                    </div>

                                    <TextField
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        fullWidth
                                        label="Address"
                                        variant="outlined"
                                        required
                                    />

                                    <div className="flex gap-6">
                                        <TextField
                                            value={pincode}
                                            onChange={(e) => setPincode(e.target.value)}
                                            type="number"
                                            label="Pincode"
                                            fullWidth
                                            variant="outlined"
                                            required
                                        />
                                        <TextField
                                            value={phoneNo}
                                            onChange={(e) => setPhoneNo(e.target.value)}
                                            type="number"
                                            label="Phone No"
                                            fullWidth
                                            variant="outlined"
                                            required
                                        />
                                    </div>

                                    <FormControlLabel
                                        control={(
                                            <Checkbox
                                                checked={whatsappTransactionalOptIn}
                                                onChange={(e) => setWhatsappTransactionalOptIn(e.target.checked)}
                                            />
                                        )}
                                        label="Get order updates on WhatsApp"
                                    />

                                    <div className="flex gap-6">
                                        <TextField
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            label="City"
                                            fullWidth
                                            variant="outlined"
                                            required
                                        />
                                        <TextField
                                            label="Landmark (Optional)"
                                            fullWidth
                                            variant="outlined"
                                        />
                                    </div>

                                    <div className="flex gap-6">

                                        <FormControl fullWidth>
                                            <InputLabel id="country-select">Country</InputLabel>
                                            <Select
                                                labelId="country-select"
                                                id="country-select"
                                                defaultValue={country}
                                                disabled
                                                label="Country"
                                                // onChange={(e) => setCountry(e.target.value)}
                                            >
                                                <MenuItem value={'IN'}>India</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth disabled={country ? false : true}>
                                            <InputLabel id="state-select">State</InputLabel>
                                            <Select
                                                labelId="state-select"
                                                id="state-select"
                                                value={state}
                                                label="State"
                                                onChange={(e) => setState(e.target.value)}
                                                required
                                            >
                                                {states.map((item) => (
                                                    <MenuItem key={item.code} value={item.code}>{item.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                    </div>

                                    <button type="submit" className="bg-primary-orange w-full sm:w-1/3 my-2 py-3.5 text-sm font-medium text-white shadow hover:shadow-lg rounded-sm uppercase outline-none">save and deliver here</button>
                                </form>
                            </div>
                        </Stepper>
                    </div>

                    <PriceSidebar cartItems={cartItems} />
                </div>
            </main>
        </>
    );
};

export default Shipping;
