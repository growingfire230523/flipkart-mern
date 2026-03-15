import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import MetaData from '../Layouts/MetaData';
import Loader from '../Layouts/Loader';
import Sidebar from './Sidebar';
import TextField from '@mui/material/TextField';
import { loadUser } from '../../actions/userAction';

const ManageAddresses = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const { user, loading, isAuthenticated } = useSelector((state) => state.user);

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('');
  const [pincode, setPincode] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated === false) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const src = user?.defaultShippingAddress || {};
    setAddress(src.address || '');
    setCity(src.city || '');
    setStateName(src.state || '');
    setCountry(src.country || '');
    setPincode(src.pincode || '');
    setPhoneNo(src.phoneNo || '');
  }, [user?.defaultShippingAddress]);

  const handleSave = async (e) => {
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
      enqueueSnackbar('Address updated.', { variant: 'success' });
      dispatch(loadUser());
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setSaving(true);
      await axios.put('/api/v1/me/delivery-location', {});
      enqueueSnackbar('Address removed.', { variant: 'success' });
      dispatch(loadUser());
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || err.message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <MetaData title="Manage Addresses" />
      {loading ? (
        <Loader />
      ) : (
        <main className="w-full pt-16">
          <div className="flex gap-3.5 sm:w-11/12 sm:mt-6 m-auto mb-7">
            <Sidebar activeTab={"addresses"} />

            <div className="flex-1 overflow-hidden bg-white/70 backdrop-blur border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-6 m-4 sm:mx-8 sm:my-7">
                <div className="flex flex-col gap-1 items-start">
                  <h1 className="text-xl sm:text-2xl font-semibold text-primary-darkBlue">Manage Addresses</h1>
                  <p className="text-sm text-primary-darkBlue/80 max-w-xl">
                    Set your primary delivery address. This will be used to prefill checkout and show availability for your area.
                  </p>
                </div>

                <form onSubmit={handleSave} className="w-full max-w-xl bg-white/80 border border-gray-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
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

                  <div className="flex flex-wrap gap-3 mt-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-primary-darkBlue text-white text-sm font-medium shadow-sm hover:shadow disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : 'Save address'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-primary-darkBlue hover:bg-black/5 disabled:opacity-60"
                    >
                      Remove address
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  );
};

export default ManageAddresses;
