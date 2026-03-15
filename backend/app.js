const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const errorMiddleware = require('./middlewares/error');

const app = express();

// config
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: 'backend/config/config.env' });
}

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload());

const user = require('./routes/userRoute');
const product = require('./routes/productRoute');
const order = require('./routes/orderRoute');
const payment = require('./routes/paymentRoute');
const chat = require('./routes/chatRoute');
const voice = require('./routes/voiceRoute');
const imageSearch = require('./routes/imageSearchRoute');
const lexyAnalyzer = require('./routes/lexyAnalyzerRoute');
const lexyRecommendations = require('./routes/lexyRecommendationsRoute');
const testimonial = require('./routes/testimonialRoute');
const communityBanner = require('./routes/communityBannerRoute');
const newInAds = require('./routes/newInAdsRoute');
const homeBanner = require('./routes/homeBannerRoute');
const perfumePromoBanner = require('./routes/perfumePromoBannerRoute');
const makeupPromoBanner = require('./routes/makeupPromoBannerRoute');
const skincarePromoBanner = require('./routes/skincarePromoBannerRoute');
const mailingList = require('./routes/mailingListRoute');
const { startMailingListScheduler } = require('./controllers/mailingListController');
const fragranceFinder = require('./routes/fragranceFinderRoute');
const shiprocketRoute = require('./routes/shiprocketRoute');

app.use('/api/v1', user);
app.use('/api/v1', product);
app.use('/api/v1', order);
app.use('/api/v1', payment);
app.use('/api/v1', chat);
app.use('/api/v1', voice);
app.use('/api/v1', imageSearch);
app.use('/api/v1', lexyAnalyzer);
app.use('/api/v1', lexyRecommendations);
app.use('/api/v1', testimonial);
app.use('/api/v1', communityBanner);
app.use('/api/v1', newInAds);
app.use('/api/v1', homeBanner);
app.use('/api/v1', perfumePromoBanner);
app.use('/api/v1', makeupPromoBanner);
app.use('/api/v1', skincarePromoBanner);
app.use('/api/v1', mailingList);
app.use('/api/v1', fragranceFinder);
app.use('/api/v1', shiprocketRoute);

// Start background scheduler for mailing list campaigns
startMailingListScheduler();

// error middleware
app.use(errorMiddleware);

module.exports = app;