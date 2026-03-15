const express = require('express');
const { transcribeVoice, textToSpeech } = require('../controllers/voiceController');

const router = express.Router();

router.route('/voice/transcribe').post(transcribeVoice);
router.route('/voice/tts').post(textToSpeech);

module.exports = router;
