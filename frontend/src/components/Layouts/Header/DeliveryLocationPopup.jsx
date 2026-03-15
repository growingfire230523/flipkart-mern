import { useEffect, useState } from 'react';
import axios from 'axios';
import TextField from '@mui/material/TextField';
import { useDispatch } from 'react-redux';
import { useSnackbar } from 'notistack';
import { loadUser } from '../../../actions/userAction';

const DeliveryLocationPopup = ({ open, onClose, initialAddress }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAddress(initialAddress?.address || '');
    setCity(initialAddress?.city || '');
    setStateName(initialAddress?.state || '');
    setCountry(initialAddress?.country || '');
    setPincode(initialAddress?.pincode || '');
    setPhoneNo(initialAddress?.phoneNo || '');
  }, [open, initialAddress]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.put('/api/v1/me/delivery-location', {
        address,
        city,
        state: stateName,
        country,
        pincode,
        phoneNo,
      });
      enqueueSnackbar('Delivery location saved.', { variant: 'success' });
      dispatch(loadUser());
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (typeof onClose === 'function') onClose();
  };

  const handleClear = async () => {
    try {
      setSaving(true);
      await axios.put('/api/v1/me/delivery-location', {});
      enqueueSnackbar('Delivery location cleared.', { variant: 'success' });
      dispatch(loadUser());
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!('geolocation' in navigator)) {
      enqueueSnackbar('Location is not supported in this browser.', { variant: 'error' });
      return;
    }

    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 600000,
        });
      });

      const { latitude, longitude } = position.coords || {};
      if (latitude == null || longitude == null) {
        enqueueSnackbar('Could not read your current location.', { variant: 'error' });
        return;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
          latitude,
        )}&lon=${encodeURIComponent(longitude)}&zoom=18&addressdetails=1`;
        const { data } = await axios.get(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });

        const addr = data?.address || {};
        const line = [addr.road, addr.neighbourhood, addr.suburb]
          .filter(Boolean)
          .join(', ');

        setAddress(line || address);
        setCity(addr.city || addr.town || addr.village || city);
        setStateName(addr.state || stateName);
        setCountry(addr.country || country || 'India');
        setPincode(addr.postcode || pincode);
        enqueueSnackbar('Pulled your current location. Please confirm the details.', { variant: 'info' });
      } catch (geoErr) {
        enqueueSnackbar('Could not fetch address from your location. Please fill it manually.', {
          variant: 'error',
        });
      }
    } catch (err) {
      enqueueSnackbar('Location permission was denied. You can fill the address manually.', {
        variant: 'error',
      });
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center px-3 sm:px-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ease-out">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close delivery location popup"
        onClick={handleSkip}
      />
      <div className="relative w-full max-w-md bg-[#fff9f7] rounded-2xl shadow-2xl border border-[var(--lexy-maroon-25)] p-5 sm:p-6 transform transition-all duration-200 ease-out scale-100 translate-y-0">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-primary-darkBlue font-brandSerif">
            Set your delivery location
          </h2>
          <p className="text-xs sm:text-sm text-primary-darkBlue/80">
            Add where you usually receive orders so we can show availability and offers for your area.
          </p>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Address line"
            size="small"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <TextField
              fullWidth
              label="City"
              size="small"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <TextField
              fullWidth
              label="State"
              size="small"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <TextField
              fullWidth
              label="Country"
              size="small"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <TextField
              fullWidth
              label="PIN code"
              size="small"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
            />
          </div>
          <TextField
            fullWidth
            label="Phone for delivery updates (optional)"
            size="small"
            value={phoneNo}
            onChange={(e) => setPhoneNo(e.target.value)}
          />

          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={saving || locating}
              className="text-[11px] sm:text-xs text-primary-darkBlue/80 hover:text-primary-darkBlue underline underline-offset-2 disabled:opacity-60"
            >
              {locating ? 'Detecting current location…' : 'Use my current location'}
            </button>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="text-xs sm:text-sm text-primary-darkBlue/70 hover:text-primary-darkBlue disabled:opacity-60"
            >
              Skip for now
            </button>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-primary-darkBlue hover:bg-black/5 disabled:opacity-60"
              >
                Clear location
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-primary-darkBlue text-white text-xs sm:text-sm font-medium shadow-sm hover:shadow disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save location'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryLocationPopup;
