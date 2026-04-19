import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearErrors, loginUser, loginWithGoogle, loginWithPhoneOtp } from '../../actions/userAction';
import { useSnackbar } from 'notistack';
import BackdropLoader from '../Layouts/BackdropLoader';
import MetaData from '../Layouts/MetaData';
import axios from 'axios';
import FormSidebar from './FormSidebar';

const Login = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const location = useLocation();

    const { loading, isAuthenticated, error } = useSelector((state) => state.user);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [googleReady, setGoogleReady] = useState(false);
    const [useOtp, setUseOtp] = useState(true);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpSending, setOtpSending] = useState(false);

    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    const handleLogin = (e) => {
        e.preventDefault();
        dispatch(loginUser(email, password));
    }

    const handleSendOtp = async () => {
        try {
            setOtpSending(true);
            await axios.post('/api/v1/phone/login/otp', { phone });
            setOtpSent(true);
            enqueueSnackbar('OTP sent (if the phone is registered).', { variant: 'success' });
        } catch (e) {
            enqueueSnackbar(e?.response?.data?.message || e.message, { variant: 'error' });
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyOtp = (e) => {
        e.preventDefault();
        dispatch(loginWithPhoneOtp(phone, otp));
    };

    useEffect(() => {
        if (!googleClientId) return;

        const scriptId = 'google-identity-script';
        const existing = document.getElementById(scriptId);

        const init = () => {
            try {
                if (!window.google?.accounts?.id) return;
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: (resp) => {
                        const cred = resp?.credential;
                        if (cred) dispatch(loginWithGoogle(cred));
                    },
                });
                window.google.accounts.id.renderButton(
                    document.getElementById('googleSignInButton'),
                    { theme: 'outline', size: 'large', width: 320 }
                );
                setGoogleReady(true);
            } catch {
                // ignore
            }
        };

        if (existing) {
            init();
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = init;
        document.body.appendChild(script);
    }, [dispatch, googleClientId]);

    const redirectParam = new URLSearchParams(location.search).get('redirect');
    const redirect = redirectParam
        ? String(redirectParam).replace(/^\//, '')
        : '';

    useEffect(() => {
        if (error) {
            enqueueSnackbar(error, { variant: "error" });
            dispatch(clearErrors());
        }
        if (isAuthenticated) {
            navigate(redirect ? `/${redirect}` : '/')
        }
    }, [dispatch, error, isAuthenticated, redirect, navigate, enqueueSnackbar]);

    return (
        <>
            <MetaData title="Login" />

            {loading && <BackdropLoader />}
            <main className="w-full mt-6">

                {/* <!-- row --> */}
                <div className="flex sm:w-4/6 sm:mt-4 m-auto mb-7 bg-white shadow-lg">
                    <FormSidebar
                        title="Login"
                        tag="Get access to your Orders, Wishlist and Recommendations"
                    />

                    {/* <!-- login column --> */}
                    <div className="flex-1 overflow-hidden">

                        {/* <!-- edit info container --> */}
                        <div className="text-center py-10 px-4 sm:px-14">

                            {/* <!-- input container --> */}
                            <form onSubmit={useOtp ? handleVerifyOtp : handleLogin}>
                                <div className="flex flex-col w-full gap-4">

                                    {googleClientId ? (
                                        <div className="flex flex-col gap-3">
                                            <div id="googleSignInButton" className="flex justify-center" />
                                            {!googleReady ? (
                                                <span className="text-xs text-primary-grey text-center">Loading Google sign-in…</span>
                                            ) : null}
                                            <div className="flex items-center gap-3">
                                                <span className="flex-1 h-px bg-gray-200" />
                                                <span className="text-xs text-primary-grey">OR</span>
                                                <span className="flex-1 h-px bg-gray-200" />
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-primary-grey">{useOtp ? 'Login with OTP' : 'Login with password'}</span>
                                        <button
                                            type="button"
                                            className="text-xs text-primary-blue font-medium"
                                            onClick={() => {
                                                setUseOtp((v) => !v);
                                                setOtpSent(false);
                                                setOtp('');
                                            }}
                                        >
                                            {useOtp ? 'Use Password Instead' : 'Use OTP Instead'}
                                        </button>
                                    </div>

                                    {useOtp ? (
                                        <>
                                            <TextField
                                                fullWidth
                                                id="phone"
                                                label="Phone Number"
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                required
                                            />

                                            {otpSent ? (
                                                <TextField
                                                    fullWidth
                                                    id="otp"
                                                    label="OTP"
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    required
                                                />
                                            ) : null}
                                        </>
                                    ) : (
                                        <>
                                            <TextField
                                                fullWidth
                                                id="email"
                                                label="Email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                            <TextField
                                                fullWidth
                                                id="password"
                                                label="Password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </>
                                    )}
                                    {/* <span className="text-xxs text-red-500 font-medium text-left mt-0.5">Please enter valid Email ID/Mobile number</span> */}

                                    {/* <!-- button container --> */}
                                    <div className="flex flex-col gap-2.5 mt-2 mb-32">
                                        <p className="text-xs text-primary-grey text-left">By continuing, you agree to our Terms of Use and Privacy Policy.</p>
                                        {useOtp ? (
                                            <>
                                                {!otpSent ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleSendOtp}
                                                        disabled={otpSending || !phone}
                                                        className="text-white py-3 w-full bg-[var(--lexy-maroon-75)] shadow hover:shadow-lg rounded-sm font-medium disabled:opacity-60"
                                                    >
                                                        {otpSending ? 'Sending…' : 'Send OTP'}
                                                    </button>
                                                ) : (
                                                    <button type="submit" className="text-white py-3 w-full bg-[var(--lexy-maroon-75)] shadow hover:shadow-lg rounded-sm font-medium">Verify & Login</button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    disabled={otpSending || !phone}
                                                    className="hover:bg-gray-50 text-primary-blue text-center py-3 w-full shadow border rounded-sm font-medium disabled:opacity-60"
                                                >
                                                    Resend OTP
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="submit" className="text-white py-3 w-full bg-[var(--lexy-maroon-75)] shadow hover:shadow-lg rounded-sm font-medium">Login</button>
                                                <Link to="/password/forgot" className="hover:bg-gray-50 text-primary-blue text-center py-3 w-full shadow border rounded-sm font-medium">Forgot Password?</Link>
                                            </>
                                        )}
                                    </div>
                                    {/* <!-- button container --> */}

                                </div>
                            </form>
                            {/* <!-- input container --> */}

                            <Link to="/register" className="font-medium text-sm text-primary-blue">New here? Create an account</Link>
                        </div>
                        {/* <!-- edit info container --> */}

                    </div>
                    {/* <!-- login column --> */}
                </div>
                {/* <!-- row --> */}

            </main>
        </>
    );
};

export default Login;
