import { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField'
import Avatar from '@mui/material/Avatar'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import { useSnackbar } from 'notistack';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearErrors, registerUser, sendPhoneRegisterOtp, verifyPhoneRegisterOtp } from '../../actions/userAction';
import BackdropLoader from '../Layouts/BackdropLoader';
import MetaData from '../Layouts/MetaData';
import FormSidebar from './FormSidebar';

const Register = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const { loading, isAuthenticated, error } = useSelector((state) => state.user);

    // ── Phone-OTP registration state ──────────────────────────────
    const [method, setMethod] = useState('phone'); // 'phone' | 'email'

    // Phone flow
    const [phoneName, setPhoneName] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneEmail, setPhoneEmail] = useState('');
    const [otpStep, setOtpStep] = useState(false); // false=form, true=otp
    const [otp, setOtp] = useState('');
    const [registrationToken, setRegistrationToken] = useState('');
    const [otpSending, setOtpSending] = useState(false);

    // Email flow (existing)
    const [user, setUser] = useState({ name: '', email: '', gender: '', password: '', cpassword: '' });
    const { name, email, gender, password, cpassword } = user;
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');

    // ── Phone flow handlers ───────────────────────────────────────
    const handleSendOtp = async (e) => {
        e.preventDefault();
        try {
            setOtpSending(true);
            const result = await dispatch(sendPhoneRegisterOtp({ name: phoneName, phone, email: phoneEmail }));
            setRegistrationToken(result.registrationToken);
            setOtpStep(true);
            enqueueSnackbar('OTP sent to your WhatsApp number.', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || err.message, { variant: 'error' });
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyOtp = (e) => {
        e.preventDefault();
        dispatch(verifyPhoneRegisterOtp(registrationToken, otp));
    };

    const handleResendOtp = async () => {
        try {
            setOtpSending(true);
            const result = await dispatch(sendPhoneRegisterOtp({ name: phoneName, phone, email: phoneEmail }));
            setRegistrationToken(result.registrationToken);
            enqueueSnackbar('OTP resent.', { variant: 'success' });
        } catch (err) {
            enqueueSnackbar(err?.response?.data?.message || err.message, { variant: 'error' });
        } finally {
            setOtpSending(false);
        }
    };

    // ── Email flow handler ────────────────────────────────────────
    const handleRegister = (e) => {
        e.preventDefault();
        if (password.length < 8) {
            enqueueSnackbar("Password length must be at least 8 characters", { variant: "warning" });
            return;
        }
        if (password !== cpassword) {
            enqueueSnackbar("Passwords don't match", { variant: "error" });
            return;
        }
        const formData = new FormData();
        formData.set("name", name);
        formData.set("email", email);
        formData.set("gender", gender);
        formData.set("password", password);
        if (avatar) formData.set("avatar", avatar);
        dispatch(registerUser(formData));
    };

    const handleDataChange = (e) => {
        if (e.target.name === "avatar") {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.readyState === 2) {
                    setAvatarPreview(reader.result);
                    setAvatar(reader.result);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        } else {
            setUser({ ...user, [e.target.name]: e.target.value });
        }
    };

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isAuthenticated) navigate('/');
    }, [dispatch, error, isAuthenticated, navigate, enqueueSnackbar]);

    return (
        <>
            <MetaData title="Create Account" />
            {loading && <BackdropLoader />}
            <main className="w-full mt-6">
                <div className="flex sm:w-4/6 sm:mt-4 m-auto mb-7 bg-white shadow-lg">
                    <FormSidebar
                        title="Looks like you're new here!"
                        tag="Sign up with your WhatsApp number to get started"
                    />

                    <div className="flex-1 overflow-hidden">
                        <div className="p-5 sm:p-10">

                            {/* Method toggle */}
                            <div className="flex items-center justify-between mb-5">
                                <span className="text-xs text-primary-grey">
                                    {method === 'phone' ? 'Sign up with WhatsApp OTP' : 'Sign up with Email'}
                                </span>
                                <button
                                    type="button"
                                    className="text-xs text-primary-blue font-medium"
                                    onClick={() => { setMethod(m => m === 'phone' ? 'email' : 'phone'); setOtpStep(false); }}
                                >
                                    {method === 'phone' ? 'Use Email Instead' : 'Use WhatsApp OTP Instead'}
                                </button>
                            </div>

                            {/* ── Phone OTP flow ── */}
                            {method === 'phone' && (
                                <form onSubmit={otpStep ? handleVerifyOtp : handleSendOtp}>
                                    <div className="flex flex-col gap-4">
                                        {!otpStep ? (
                                            <>
                                                <TextField
                                                    fullWidth
                                                    label="Full Name"
                                                    value={phoneName}
                                                    onChange={(e) => setPhoneName(e.target.value)}
                                                    required
                                                />
                                                <TextField
                                                    fullWidth
                                                    label="WhatsApp Number"
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+91XXXXXXXXXX"
                                                    required
                                                />
                                                <TextField
                                                    fullWidth
                                                    label="Email (optional)"
                                                    type="email"
                                                    value={phoneEmail}
                                                    onChange={(e) => setPhoneEmail(e.target.value)}
                                                />
                                                <p className="text-xs text-primary-grey">
                                                    By continuing, you agree to our Terms of Use and Privacy Policy.
                                                </p>
                                                <button
                                                    type="submit"
                                                    disabled={otpSending}
                                                    className="text-white py-3 w-full bg-[var(--lexy-maroon-75)] shadow hover:shadow-lg rounded-sm font-medium disabled:opacity-60"
                                                >
                                                    {otpSending ? 'Sending OTP…' : 'Send OTP on WhatsApp'}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm text-primary-grey">
                                                    OTP sent to <span className="font-medium text-gray-700">{phone}</span> on WhatsApp.
                                                </p>
                                                <TextField
                                                    fullWidth
                                                    label="Enter OTP"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    required
                                                    autoFocus
                                                />
                                                <button type="submit" className="text-white py-3 w-full bg-[var(--lexy-maroon-75)] shadow hover:shadow-lg rounded-sm font-medium">
                                                    Verify & Create Account
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleResendOtp}
                                                    disabled={otpSending}
                                                    className="hover:bg-gray-50 text-primary-blue text-center py-3 w-full shadow border rounded-sm font-medium disabled:opacity-60"
                                                >
                                                    Resend OTP
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setOtpStep(false)}
                                                    className="text-xs text-primary-grey underline text-center"
                                                >
                                                    ← Change number
                                                </button>
                                            </>
                                        )}
                                        <Link to="/login" className="hover:bg-gray-50 text-primary-blue text-center py-3 w-full shadow border rounded-sm font-medium">
                                            Existing User? Log in
                                        </Link>
                                    </div>
                                </form>
                            )}

                            {/* ── Email flow ── */}
                            {method === 'email' && (
                                <form onSubmit={handleRegister} encType="multipart/form-data">
                                    <div className="flex flex-col gap-4 items-start">
                                        <div className="flex flex-col w-full gap-3">
                                            <TextField fullWidth label="Full Name" name="name" value={name} onChange={handleDataChange} required />
                                            <TextField fullWidth label="Email" type="email" name="email" value={email} onChange={handleDataChange} required />
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <h2 className="text-md">Your Gender :</h2>
                                            <RadioGroup row name="radio-buttons-group">
                                                <FormControlLabel name="gender" value="male" onChange={handleDataChange} control={<Radio required />} label="Male" />
                                                <FormControlLabel name="gender" value="female" onChange={handleDataChange} control={<Radio required />} label="Female" />
                                            </RadioGroup>
                                        </div>
                                        <div className="flex flex-col w-full sm:flex-row gap-3">
                                            <TextField label="Password" type="password" name="password" value={password} onChange={handleDataChange} required />
                                            <TextField label="Confirm Password" type="password" name="cpassword" value={cpassword} onChange={handleDataChange} required />
                                        </div>
                                        <div className="flex w-full gap-3 items-center">
                                            <Avatar alt="Avatar Preview" src={avatarPreview} sx={{ width: 56, height: 56 }} />
                                            <label className="rounded font-medium bg-gray-400 text-center cursor-pointer text-white w-full py-2 px-2.5 shadow hover:shadow-lg">
                                                <input type="file" name="avatar" accept="image/*" onChange={handleDataChange} className="hidden" />
                                                Upload Avatar (optional)
                                            </label>
                                        </div>
                                        <button type="submit" className="text-white py-3 w-full bg-[var(--lexy-maroon-75)] shadow hover:shadow-lg rounded-sm font-medium">Signup</button>
                                        <Link to="/login" className="hover:bg-gray-50 text-primary-blue text-center py-3 w-full shadow border rounded-sm font-medium">Existing User? Log in</Link>
                                    </div>
                                </form>
                            )}

                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default Register;
