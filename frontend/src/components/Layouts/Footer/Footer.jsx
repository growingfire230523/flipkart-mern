import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DownloadIcon from '@mui/icons-material/Download';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import YouTubeIcon from '@mui/icons-material/YouTube';
import paymentMethods from '../../../assets/images/payment-methods.svg';

const Footer = () => {

  const location = useLocation();
  const [adminRoute, setAdminRoute] = useState(false);
  const [email, setEmail] = useState('');
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppPromoOptIn, setWhatsAppPromoOptIn] = useState(false);
  const [signupMessage, setSignupMessage] = useState('');
  const [signupBusy, setSignupBusy] = useState(false);

  const footerLinks = useMemo(
    () => [
      {
        title: 'ABOUT',
        links: [
          { name: 'Store Locator', to: '/' },
          { name: 'About MILAARI', to: '/' },
          { name: 'Careers', to: '/' },
          { name: 'Privacy Policy', to: '/' },
          { name: 'Cookies Policy', to: '/' },
        ],
      },
      {
        title: 'SUPPORT',
        links: [
          { name: 'Customer Care', to: '/' },
          { name: 'Shipping', to: '/' },
          { name: 'Returns', to: '/' },
          { name: 'FAQ', to: '/' },
          { name: 'My Account', to: '/' },
          { name: "MILAARI's Loyalty Club", to: '/' },
        ],
      },
      {
        title: 'MORE FROM MILAARI',
        links: [
          { name: 'Certified Cruelty-Free', to: '/' },
          { name: 'Refer a Friend', to: '/' },
          { name: 'Subscribe and Save', to: '/' },
          { name: 'Pro Artist Programme', to: '/' },
          { name: 'Affiliate & Ambassador Programme', to: '/' },
          { name: 'Promotions and Savings', to: '/' },
          { name: "MILAARI's Magic Change", to: '/' },
          { name: 'Accessibility Statement', to: '/' },
        ],
      },
    ],
    []
  );

  const perks = useMemo(
    () => [
      {
        icon: <CardGiftcardIcon fontSize="inherit" />,
        title: 'Gift wrapping & Engraving',
        body: 'Available at checkout.',
      },
      {
        icon: <LocalShippingIcon fontSize="inherit" />,
        title: 'Free Delivery',
        body: 'On orders over the threshold.',
      },
      {
        icon: <LoyaltyIcon fontSize="inherit" />,
        title: 'Unlock rewards and benefits',
        body: "With MILAARI's Loyalty Club.",
      },
      {
        icon: <AccountCircleIcon fontSize="inherit" />,
        title: 'Complete your Beauty Profile',
        body: 'To get personalised recommendations.',
      },
      {
        icon: <DownloadIcon fontSize="inherit" />,
        title: 'Download the App',
        body: 'Easy beauty for you.',
      },
      {
        icon: <EventAvailableIcon fontSize="inherit" />,
        title: 'Book a 1:1 Beauty Consultation',
        body: "With MILAARI's pro artists.",
      },
    ],
    []
  );

  useEffect(() => {
    setAdminRoute(location.pathname.split("/", 2).includes("admin"))
  }, [location]);

  return (
    <>
      {!adminRoute && (
        <footer className="mt-20 w-full">
          {/* perks strip */}
          <div className="w-full bg-primary-grey/10 border-t border-black/10">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-10 py-8">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
                {perks.map((p) => (
                  <div key={p.title} className="flex flex-col items-center text-center gap-2">
                    <div className="text-primary-darkBlue text-3xl">{p.icon}</div>
                    <div className="text-primary-darkBlue text-sm font-medium font-brandSerif">{p.title}</div>
                    <div className="text-primary-darkBlue/80 text-xs font-light">{p.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* link columns + signup */}
          <div className="w-full bg-white border-t border-black/10">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-10 py-12">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-10">
                {footerLinks.map((col) => (
                  <div key={col.title} className="flex flex-col gap-4">
                    <h3 className="text-primary-darkBlue text-sm font-semibold tracking-widest">{col.title}</h3>
                    <div className="flex flex-col gap-3">
                      {col.links.map((l) => (
                        <Link key={l.name} to={l.to} className="text-primary-darkBlue/90 text-sm font-light hover:underline">
                          {l.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex flex-col gap-6 sm:border-l sm:border-black/10 sm:pl-10">
                  <div>
                    <h3 className="text-primary-darkBlue text-sm font-semibold tracking-[0.35em] uppercase font-brandSerif">
                      SIGN UP TO RECEIVE EMAILS
                    </h3>
                    <p className="mt-2 text-primary-darkBlue/80 text-sm font-light">
                      Be the first to know about products, offers and tips.
                    </p>

                    <form
                      className="mt-4 flex flex-col md:flex-row items-stretch gap-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const nextEmail = String(email || '').trim();
                        const nextPhone = String(whatsAppPhone || '').trim();
                        if (!nextEmail) {
                          setSignupMessage('Please enter an email address.');
                          return;
                        }
                        if (whatsAppPromoOptIn && !nextPhone) {
                          setSignupMessage('Please enter a phone number for WhatsApp updates.');
                          return;
                        }
                        setSignupBusy(true);
                        setSignupMessage('');
                        axios.post('/api/v1/mailing-list/subscribe', {
                          email: nextEmail,
                          phone: nextPhone || undefined,
                          whatsappPromoOptIn: whatsAppPromoOptIn ? true : undefined,
                        })
                          .then(() => {
                            setEmail('');
                            setWhatsAppPhone('');
                            setWhatsAppPromoOptIn(false);
                            setSignupMessage('Thanks! You are on the mailing list.');
                          })
                          .catch((err) => {
                            setSignupMessage(err?.response?.data?.message || err.message || 'Failed to subscribe.');
                          })
                          .finally(() => setSignupBusy(false));
                      }}
                    >
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="Email address"
                        className="w-full md:flex-1 h-11 sm:h-12 border border-[#ded6cf] bg-white px-3 text-sm font-light text-primary-darkBlue placeholder:text-primary-grey/70 outline-none focus:ring-1 focus:ring-[var(--lexy-maroon-25)]"
                      />
                      <input
                        value={whatsAppPhone}
                        onChange={(e) => setWhatsAppPhone(e.target.value)}
                        type="tel"
                        placeholder="WhatsApp phone (optional)"
                        className="w-full md:flex-1 h-11 sm:h-12 border border-[#ded6cf] bg-white px-3 text-sm font-light text-primary-darkBlue placeholder:text-primary-grey/70 outline-none focus:ring-1 focus:ring-[var(--lexy-maroon-25)]"
                      />
                      <button
                        type="submit"
                        disabled={signupBusy}
                        className="w-full md:w-auto md:self-stretch px-6 h-11 sm:h-12 border border-[#ded6cf] bg-[#e9e1da] text-primary-darkBlue text-xs font-semibold tracking-[0.25em] uppercase hover:bg-[#ddd0c4] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {signupBusy ? 'SAVING...' : 'SIGN UP'}
                      </button>
                    </form>

                    <label className="mt-3 flex items-center gap-2 text-[12px] text-primary-darkBlue/80 font-light select-none">
                      <input
                        type="checkbox"
                        checked={whatsAppPromoOptIn}
                        onChange={(e) => setWhatsAppPromoOptIn(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Send me offers on WhatsApp
                    </label>

                    {signupMessage && (
                      <p className="mt-3 text-[12px] text-primary-darkBlue/70 font-light">
                        {signupMessage}
                      </p>
                    )}

                    <p className="mt-4 text-[12px] leading-5 text-primary-darkBlue/70 font-light">
                      *T&amp;Cs apply. By submitting your email address, you agree to receive marketing information about MILAARI.
                      You can unsubscribe at any time.
                    </p>
                  </div>

                  <div className="flex items-center gap-5 text-primary-darkBlue">
                    <a href="/" aria-label="Facebook" title="Facebook" className="hover:opacity-80"><FacebookIcon /></a>
                    <a href="/" aria-label="Instagram" title="Instagram" className="hover:opacity-80"><InstagramIcon /></a>
                    <a href="/" aria-label="Twitter" title="Twitter" className="hover:opacity-80"><TwitterIcon /></a>
                    <a href="/" aria-label="YouTube" title="YouTube" className="hover:opacity-80"><YouTubeIcon /></a>
                  </div>

                  <div>
                    <h3 className="text-primary-darkBlue text-sm font-semibold tracking-widest">SHIPPING TO</h3>
                    <div className="mt-2 text-primary-darkBlue/90 text-sm font-light">
                      <Link to="/" className="hover:underline">India</Link> <span className="mx-1">|</span> EN <span className="mx-1">|</span> INR ₹
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* payment methods strip */}
          <div className="w-full bg-white border-t border-black/10">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-10 py-6 flex justify-center">
              <img
                draggable="false"
                src={paymentMethods}
                alt="Payment methods"
                className="h-6 sm:h-7 object-contain"
              />
            </div>
          </div>

          {/* legal / policies */}
          <div className="w-full bg-white border-t border-black/10">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-10 py-8">
              <div className="text-primary-darkBlue/80 text-[12px] leading-5 font-light">
                2013-2025 © Islestarr Holdings Ltd., trading as Charlotte Tilbury Beauty. All rights reserved. Company number 08037372,
                registered in the United Kingdom. Registered Office Address: 8 Surrey Street, London, United Kingdom WC2R 2ND. VAT
                number: GB 144 0736 30. Responsible Person Address: Ormond Building, 31-36 Ormond Quay Upper, Dublin 7, D07 N5YH,
                Ireland. <Link to="/" className="underline underline-offset-2">Contact us</Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-primary-darkBlue text-[12px] font-light">
                <Link to="/" className="hover:underline">Privacy Policy</Link>
                <Link to="/" className="hover:underline">Cookies Policy</Link>
                <Link to="/" className="hover:underline">Terms &amp; Conditions</Link>
                <Link to="/" className="hover:underline">Corporate Policies</Link>
                <Link to="/" className="hover:underline">Manage Cookies</Link>
              </div>

              <div className="mt-4 text-primary-darkBlue/70 text-[12px] leading-5 font-light">
                This site is protected by reCAPTCHA and the Google{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a
                  href="https://policies.google.com/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Terms of Service
                </a>{' '}
                apply.
              </div>
            </div>
          </div>
        </footer>
      )}
    </>
  )
};

export default Footer;
