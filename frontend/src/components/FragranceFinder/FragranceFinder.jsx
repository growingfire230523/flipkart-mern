import axios from 'axios';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../Layouts/Loader';
import MetaData from '../Layouts/MetaData';

import findMyFragranceHeroImg from '../../assets/images/find_my_fragrance.jpg';

import brightFruityImg from '../../assets/images/BRIGHT_AND_FRUITY_fmf.jpg';
import floralLuminousImg from '../../assets/images/FLORAL_AND_LUMINOUS_fmf.jpg';
import warmSensationalImg from '../../assets/images/WARM_AND_SENSATIONAL_fmf.webp';

import aromaticSensualImg from '../../assets/images/AROMATIC_AND_SENSUAL_fmfm.png';
import freshImg from '../../assets/images/FRESH_fmfm.png';
import warmSpicyImg from '../../assets/images/WARMY_AND_SPICY_fmfm.png';
import woodyImg from '../../assets/images/WOODY_fmfm.png';

import discreetImg from '../../assets/images/DISCREET_fmf.png';
import personalImg from '../../assets/images/PERSONAL_fmf.png';
import outgoingImg from '../../assets/images/OUTGOING_fmf.png';
import boldImg from '../../assets/images/BOLD_fmf.png';

const ProgressBar = ({ currentStep }) => {
  const total = 5;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, idx) => {
          const active = idx < currentStep;
          return (
            <div
              key={idx}
              className={
                `h-2 flex-1 rounded-full transition-colors duration-500 ` +
                (active ? 'bg-primary-blue' : 'bg-primary-orange/30')
              }
            />
          );
        })}
      </div>
    </div>
  );
};

const PrimaryButton = ({ children, onClick, disabled = false }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={
      `w-full max-w-md px-4 py-3 text-white font-medium uppercase rounded-sm shadow ` +
      (disabled
        ? 'bg-primary-grey cursor-not-allowed'
        : 'bg-primary-blue hover:brightness-110')
    }
  >
    {children}
  </button>
);

const OptionButton = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="w-full max-w-md px-4 py-3 text-white font-medium uppercase rounded-sm shadow bg-primary-blue hover:brightness-110"
  >
    {children}
  </button>
);

const TileOption = ({ label, imageSrc, onClick }) => (
  <button
    onClick={onClick}
    className="w-full rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
  >
    <div className="w-full aspect-[3/1] bg-gray-100 rounded-t-md overflow-hidden">
      {!!imageSrc && (
        <img
          src={imageSrc}
          alt={label}
          className="w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />
      )}
    </div>
    <div className="py-2 text-sm tracking-wide text-primary-darkBlue font-medium">
      {label}
    </div>
  </button>
);

const IntensityCard = ({ label, imageSrc, onClick }) => (
  <button
    onClick={onClick}
    className="w-full rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors p-4"
  >
    <div className="w-full h-24 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
      {!!imageSrc ? (
        <img
          src={imageSrc}
          alt={label}
          className="w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 rounded-full border-4 border-primary-blue/30" />
      )}
    </div>
    <div className="mt-3 text-sm tracking-wide text-primary-darkBlue font-medium">
      {label}
    </div>
  </button>
);

const formatPrice = (value) => `₹${Number(value || 0).toLocaleString()}`;

const FragranceFinder = () => {
  const navigate = useNavigate();

  // step: 0 intro, 1..5 questions, 6 result
  const [step, setStep] = useState(0);

  const [answers, setAnswers] = useState({
    forWhom: '',
    preference: '',
    occasion: '',
    type: '',
    intensity: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendation, setRecommendation] = useState(null);

  const currentProgressStep = useMemo(() => {
    if (step <= 0) return 0;
    if (step >= 1 && step <= 5) return step;
    return 5;
  }, [step]);

  const back = () => {
    if (loading) return;

    if (step === 0) {
      navigate(-1);
      return;
    }

    if (step === 6) {
      setRecommendation(null);
      setError('');
      setStep(5);
      return;
    }

    setStep((s) => Math.max(0, s - 1));
  };

  const restart = () => {
    if (loading) return;

    setAnswers({
      forWhom: '',
      preference: '',
      occasion: '',
      type: '',
      intensity: '',
    });
    setRecommendation(null);
    setError('');
    setStep(0);
  };

  const pick = (key, value, nextStep) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError('');
    setStep(nextStep);
  };

  const submit = async (intensity) => {
    const payload = {
      ...answers,
      intensity,
    };

    setAnswers((prev) => ({ ...prev, intensity }));

    setLoading(true);
    setError('');
    setRecommendation(null);

    try {
      const { data } = await axios.post('/api/v1/fragrance-finder/recommend', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      setRecommendation(data?.recommendation || null);
      setStep(6);
    } catch (e) {
      setError(e?.response?.data?.message || 'Unable to find a fragrance match. Please try again.');
      setStep(6);
    } finally {
      setLoading(false);
    }
  };

  const typeOptions = useMemo(() => {
    if (answers.preference === 'feminine') {
      return [
        { label: 'WARM & SENSUAL', value: 'warmSensual' },
        { label: 'BRIGHT & FRUITY', value: 'brightFruity' },
        { label: 'FLORAL & LUMINOUS', value: 'floralLuminous' },
      ];
    }

    return [
      { label: 'AROMATIC & SENSUAL', value: 'aromaticSensual' },
      { label: 'WOODY', value: 'woody' },
      { label: 'WARM & SPICY', value: 'warmSpicy' },
      { label: 'FRESH', value: 'fresh' },
    ];
  }, [answers.preference]);

  const typeOptionImages = useMemo(
    () => ({
      warmSensual: warmSensationalImg,
      brightFruity: brightFruityImg,
      floralLuminous: floralLuminousImg,
      aromaticSensual: aromaticSensualImg,
      woody: woodyImg,
      warmSpicy: warmSpicyImg,
      fresh: freshImg,
    }),
    []
  );

  const intensityImages = useMemo(
    () => ({
      discreet: discreetImg,
      personal: personalImg,
      outgoing: outgoingImg,
      bold: boldImg,
    }),
    []
  );

  const content = (() => {
    if (loading) {
      return (
        <div className="w-full flex items-center justify-center py-20">
          <Loader />
        </div>
      );
    }

    if (step === 0) {
      return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl font-brandSerif text-primary-darkBlue tracking-wide">FRAGRANCE FINDER</h1>
            <p className="mt-4 text-primary-grey">
              In 5 quick questions, discover the perfect fragrance from our store.
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <PrimaryButton onClick={() => setStep(1)}>Start</PrimaryButton>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="w-full h-96 rounded-md bg-gray-100 overflow-hidden">
              <img
                src={findMyFragranceHeroImg}
                alt="Find My Fragrance"
                className="w-full h-full object-cover"
                draggable={false}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="w-full text-center">
          <h2 className="text-3xl sm:text-4xl font-brandSerif text-primary-darkBlue tracking-wide">I AM LOOKING FOR A FRAGRANCE:</h2>

          <div className="mt-10 flex flex-col items-center gap-4">
            <OptionButton onClick={() => pick('forWhom', 'self', 2)}>FOR MYSELF</OptionButton>
            <OptionButton onClick={() => pick('forWhom', 'gift', 2)}>AS A GIFT</OptionButton>
          </div>

          <div className="mt-6 text-sm text-primary-grey">1 of 5</div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="w-full text-center">
          <h2 className="text-3xl sm:text-4xl font-brandSerif text-primary-darkBlue tracking-wide">I PREFER FRAGRANCES THAT ARE:</h2>

          <div className="mt-10 flex flex-col items-center gap-4">
            <OptionButton onClick={() => pick('preference', 'feminine', 3)}>MORE FEMININE</OptionButton>
            <OptionButton onClick={() => pick('preference', 'masculine', 3)}>MORE MASCULINE</OptionButton>
          </div>

          <div className="mt-6 text-sm text-primary-grey">2 of 5</div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="w-full text-center">
          <h2 className="text-3xl sm:text-4xl font-brandSerif text-primary-darkBlue tracking-wide">WHERE WILL YOU BE WEARING THIS FRAGRANCE:</h2>

          <div className="mt-10 flex flex-col items-center gap-4">
            <OptionButton onClick={() => pick('occasion', 'special', 4)}>SPECIAL OCCASION</OptionButton>
            <OptionButton onClick={() => pick('occasion', 'date', 4)}>DATE NIGHT</OptionButton>
            <OptionButton onClick={() => pick('occasion', 'work', 4)}>DESK TO DRINKS</OptionButton>
            <OptionButton onClick={() => pick('occasion', 'everyday', 4)}>EVERYDAY SIGNATURE</OptionButton>
            <OptionButton onClick={() => pick('occasion', 'vacation', 4)}>VACATION</OptionButton>
          </div>

          <div className="mt-6 text-sm text-primary-grey">3 of 5</div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="w-full text-center">
          <h2 className="text-3xl sm:text-4xl font-brandSerif text-primary-darkBlue tracking-wide">CHOOSE YOUR FAVORITE TYPE OF FRAGRANCE:</h2>

          <div
            className={
              `mt-10 grid gap-6 mx-auto max-w-5xl ` +
              (typeOptions.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')
            }
          >
            {typeOptions.map((o) => (
              <TileOption
                key={o.value}
                label={o.label}
                imageSrc={typeOptionImages[o.value]}
                onClick={() => pick('type', o.value, 5)}
              />
            ))}
          </div>

          <div className="mt-6 text-sm text-primary-grey">4 of 5</div>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="w-full text-center">
          <h2 className="text-3xl sm:text-4xl font-brandSerif text-primary-darkBlue tracking-wide">HOW INTENSE DO YOU LIKE YOUR FRAGRANCE TO BE?</h2>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mx-auto max-w-5xl">
            <IntensityCard label="DISCREET" imageSrc={intensityImages.discreet} onClick={() => submit('discreet')} />
            <IntensityCard label="PERSONAL" imageSrc={intensityImages.personal} onClick={() => submit('personal')} />
            <IntensityCard label="OUTGOING" imageSrc={intensityImages.outgoing} onClick={() => submit('outgoing')} />
            <IntensityCard label="BOLD" imageSrc={intensityImages.bold} onClick={() => submit('bold')} />
          </div>

          <div className="mt-6 text-sm text-primary-grey">5 of 5</div>
        </div>
      );
    }

    // Results
    const product = recommendation?.product;
    const reasons = recommendation?.reasons || [];

    return (
      <div className="w-full max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-brandSerif text-primary-darkBlue tracking-wide">YOUR FRAGRANCE MATCH</h2>

        {error && (
          <div className="mt-6 text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {product && (
          <div className="mt-8 bg-white border border-gray-200 rounded-md shadow-sm p-5 text-left">
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-full sm:w-48 h-48 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                {product?.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="text-primary-grey">No image</div>
                )}
              </div>

              <div className="flex-1">
                <div className="text-lg font-medium text-primary-darkBlue">{product?.name}</div>
                <div className="mt-1 text-sm text-primary-grey">{product?.subCategory || product?.category}</div>

                <div className="mt-3 flex items-baseline gap-3">
                  <div className="text-xl font-semibold text-primary-darkBlue">{formatPrice(product?.price)}</div>
                  {Number(product?.cuttedPrice || 0) > Number(product?.price || 0) && (
                    <div className="text-sm text-primary-grey line-through">{formatPrice(product?.cuttedPrice)}</div>
                  )}
                </div>

                {!!reasons.length && (
                  <div className="mt-4 text-sm text-primary-grey">
                    {reasons.join(' • ')}
                  </div>
                )}

                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/product/${product?._id}`}
                    className="inline-flex justify-center items-center px-4 py-2 rounded-sm bg-primary-blue text-white font-medium hover:brightness-110"
                  >
                    View Product
                  </Link>

                  <button
                    onClick={restart}
                    className="inline-flex justify-center items-center px-4 py-2 rounded-sm border border-gray-300 text-primary-darkBlue font-medium hover:bg-gray-50"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!product && !error && (
          <div className="mt-8 text-primary-grey">No recommendation returned.</div>
        )}
      </div>
    );
  })();

  return (
    <div className="pt-6 min-h-[70vh] bg-white">
      <MetaData title="Find My Fragrance" />

      <div className="w-full sm:w-10/12 px-4 sm:px-0 mx-auto">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={back}
            className="text-primary-darkBlue hover:text-primary-blue font-medium"
          >
            Back
          </button>

          <div className="flex-1 max-w-2xl">
            <ProgressBar currentStep={currentProgressStep} />
          </div>

          <div className="w-[60px]" />
        </div>

        <div className="mt-10">
          {content}
        </div>
      </div>
    </div>
  );
};

export default FragranceFinder;
