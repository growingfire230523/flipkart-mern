import apiClient from '../client';

export const transcribeVoiceApi = (voiceData: FormData) =>
  apiClient.post('/api/v1/voice/transcribe', voiceData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

