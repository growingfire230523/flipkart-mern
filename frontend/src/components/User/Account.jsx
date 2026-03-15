import { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../Layouts/Loader';
import MetaData from '../Layouts/MetaData';
import TextField from '@mui/material/TextField';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { loadUser } from '../../actions/userAction';

const Account = () => {

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();

    const { user, loading, isAuthenticated } = useSelector(state => state.user)

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [saving, setSaving] = useState(false);

    const phoneLabel = useMemo(() => {
        if (!user?.phone) return 'Not added';
        return user.phone;
    }, [user?.phone]);

    useEffect(() => {
        if (isAuthenticated === false) {
            navigate("/login")
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (user?.phone) setPhone(user.phone);
    }, [user?.phone]);

    const sendPhoneOtp = async () => {
        try {
            setSaving(true);
            await axios.post('/api/v1/phone/link/otp', { phone });
            setOtpSent(true);
            enqueueSnackbar('OTP sent to phone number.', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const verifyPhoneOtp = async () => {
        try {
            setSaving(true);
            await axios.post('/api/v1/phone/link/verify', { otp });
            enqueueSnackbar('Phone number verified.', { variant: 'success' });
            setOtp('');
            setOtpSent(false);
            dispatch(loadUser());
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message, { variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const getLastName = () => {
        const nameArray = user.name.split(" ");
        return nameArray[nameArray.length - 1];
    }

    return (
        <>
            <MetaData title="My Profile" />

            {loading ? <Loader /> :
                <>
                    <main className="w-full pt-16">

                        {/* <!-- row --> */}
                        <div className="flex gap-3.5 sm:w-11/12 sm:mt-6 m-auto mb-7">

                            <Sidebar activeTab={"profile"} />

                            {/* <!-- details column --> */}
                            <div className="flex-1 overflow-hidden bg-white/70 backdrop-blur border border-gray-200 rounded-2xl shadow-sm">
                                {/* <!-- edit info container --> */}
                                <div className="flex flex-col gap-10 m-4 sm:mx-8 sm:my-7">
                                    {/* <!-- personal info --> */}
                                    <div className="flex flex-col gap-5 items-start">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-xl sm:text-2xl font-semibold text-primary-darkBlue">Personal Information</h2>
                                            <Link to="/account/update" className="text-sm text-primary-blue font-medium hover:underline">Edit</Link>
                                        </div>

                                        <div className="w-full bg-white/80 border border-gray-200 rounded-2xl p-4 sm:p-5" id="personalInputs">
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                <div className="flex flex-col gap-0.5 w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-200 cursor-not-allowed bg-white/60 focus-within:border-primary-blue">
                                                    <label className="text-xs text-primary-grey">First Name</label>
                                                    <input type="text" value={user.name.split(" ", 1)} className="text-sm outline-none border-none cursor-not-allowed text-primary-darkBlue/70 bg-transparent" disabled />
                                                </div>
                                                <div className="flex flex-col gap-0.5 w-full sm:w-64 px-3 py-2 rounded-xl border border-gray-200 cursor-not-allowed bg-white/60 focus-within:border-primary-blue">
                                                    <label className="text-xs text-primary-grey">Last Name</label>
                                                    <input type="text" value={getLastName()} className="text-sm outline-none border-none cursor-not-allowed text-primary-darkBlue/70 bg-transparent" disabled />
                                                </div>
                                            </div>

                                            {/* <!-- gender --> */}
                                            <div className="flex flex-col gap-2 mt-4">
                                                <h3 className="text-sm font-medium text-primary-darkBlue">Your Gender</h3>
                                                <div className="flex items-center gap-8" id="radioInput">
                                                    <div className="flex items-center gap-3 inputs text-primary-grey cursor-not-allowed">
                                                        <input type="radio" name="gender" checked={user.gender === "male"} id="male" className="h-4 w-4 cursor-not-allowed" disabled />
                                                        <label htmlFor="male" className="cursor-not-allowed">Male</label>
                                                    </div>
                                                    <div className="flex items-center gap-3 inputs text-primary-grey cursor-not-allowed">
                                                        <input type="radio" name="gender" checked={user.gender === "female"} id="female" className="h-4 w-4 cursor-not-allowed" disabled />
                                                        <label htmlFor="female" className="cursor-not-allowed">Female</label>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* <!-- gender --> */}
                                        </div>
                                    </div>
                                    {/* <!-- personal info --> */}

                                    {/* <!-- email address info --> */}
                                    <div className="flex flex-col gap-5 items-start">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                            <h2 className="text-xl sm:text-2xl font-semibold text-primary-darkBlue">Email Address</h2>
                                            <Link to="/account/update" className="text-sm text-primary-blue font-medium hover:underline">Edit</Link>
                                            <Link to="/password/update" className="text-sm text-primary-blue font-medium hover:underline">Change Password</Link>
                                        </div>

                                        <div className="w-full bg-white/80 border border-gray-200 rounded-2xl p-4 sm:p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col gap-0.5 w-full sm:w-80 px-3 py-2 rounded-xl border border-gray-200 bg-white/60 cursor-not-allowed focus-within:border-primary-blue">
                                                    <label className="text-xs text-primary-grey">Email Address</label>
                                                    <input type="email" value={user.email} className="text-sm outline-none border-none cursor-not-allowed text-primary-darkBlue/70 bg-transparent" disabled />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                    {/* <!-- email address info --> */}

                                    {/* <!-- mobile number info --> */}
                                    <div className="flex flex-col gap-5 items-start">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <h2 className="text-xl sm:text-2xl font-semibold text-primary-darkBlue">Mobile Number</h2>
                                            <span className="text-xs text-primary-grey">
                                                {user?.phoneVerified ? 'Verified' : (user?.phone ? 'Not verified' : '')}
                                            </span>
                                        </div>

                                        <div className="w-full bg-white/80 border border-gray-200 rounded-2xl p-4 sm:p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col gap-0.5 w-full sm:w-80 px-3 py-2 rounded-xl border border-gray-200 bg-white/60 cursor-not-allowed focus-within:border-primary-blue">
                                                    <label className="text-xs text-primary-grey">Mobile Number</label>
                                                    <input type="tel" value={phoneLabel} className="text-sm outline-none border-none text-primary-darkBlue/70 cursor-not-allowed bg-transparent" disabled />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 w-full max-w-md mt-4">
                                                <TextField
                                                    fullWidth
                                                    label="Add / Update Phone Number"
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    size="small"
                                                />

                                                {otpSent ? (
                                                    <TextField
                                                        fullWidth
                                                        label="Enter OTP"
                                                        value={otp}
                                                        onChange={(e) => setOtp(e.target.value)}
                                                        size="small"
                                                    />
                                                ) : null}

                                                <div className="flex flex-wrap gap-3">
                                                    {!otpSent ? (
                                                        <button
                                                            type="button"
                                                            onClick={sendPhoneOtp}
                                                            disabled={saving || !phone}
                                                            className="text-white py-2.5 px-4 bg-primary-blue shadow-sm hover:shadow rounded-xl font-medium disabled:opacity-60"
                                                        >
                                                            {saving ? 'Sending…' : 'Send OTP'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={verifyPhoneOtp}
                                                            disabled={saving || !otp}
                                                            className="text-white py-2.5 px-4 bg-primary-blue shadow-sm hover:shadow rounded-xl font-medium disabled:opacity-60"
                                                        >
                                                            {saving ? 'Verifying…' : 'Verify'}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={sendPhoneOtp}
                                                        disabled={saving || !phone}
                                                        className="hover:bg-black/5 text-primary-blue text-center py-2.5 px-4 border border-gray-200 rounded-xl font-medium disabled:opacity-60"
                                                    >
                                                        Resend OTP
                                                    </button>
                                                </div>

                                                <p className="text-xs text-primary-grey">
                                                    You can sign in using password, Google, or OTP once verified.
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                    {/* <!-- mobile number info --> */}

                                    {/* <!-- faqs --> */}
                                    <div className="flex flex-col gap-4 mt-2">
                                        <h2 className="text-xl sm:text-2xl font-semibold text-primary-darkBlue">FAQs</h2>
                                        <div className="bg-white/80 border border-gray-200 rounded-2xl p-4 sm:p-5">
                                            <h4 className="text-sm font-semibold text-primary-darkBlue">What happens when I update my email address (or mobile number)?</h4>
                                            <p className="text-sm text-primary-darkBlue/90 mt-1">Your login email (or mobile number) updates, and future account communication will be sent to the updated contact details.</p>

                                            <h4 className="text-sm font-semibold text-primary-darkBlue mt-4">When will my account be updated with the new email address (or mobile number)?</h4>
                                            <p className="text-sm text-primary-darkBlue/90 mt-1">As soon as you verify the code sent to your email (or phone) and save the changes.</p>

                                            <h4 className="text-sm font-semibold text-primary-darkBlue mt-4">Will updating my email address invalidate my account?</h4>
                                            <p className="text-sm text-primary-darkBlue/90 mt-1">No. Your account remains fully functional and your order history and saved details stay intact.</p>
                                        </div>
                                    </div>
                                    {/* <!-- faqs --> */}

                                    {/* <!-- deactivate account --> */}
                                    <Link className="text-sm text-primary-blue font-medium hover:underline" to="/">Deactivate Account</Link>
                                    {/* <!-- deactivate account --> */}
                                </div>
                                {/* <!-- edit info container --> */}
                            </div>
                            {/* <!-- details column --> */}
                        </div>
                    </main>
                </>
            }
        </>
    );
};

export default Account;
