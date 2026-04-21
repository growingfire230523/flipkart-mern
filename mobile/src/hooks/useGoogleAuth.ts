import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { loadUser } from '../store/slices/userSlice';
import { googleLoginApi } from '../api/endpoints/auth';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

export default function useGoogleAuth() {
  const dispatch = useDispatch<AppDispatch>();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: String(GOOGLE_CLIENT_ID || ''),
    // Keep iOS/Android client IDs aligned with the backend's GOOGLE_CLIENT_ID
    // (backend verifies the token "aud" against that value).
    iosClientId: String(GOOGLE_CLIENT_ID || ''),
    androidClientId: String(GOOGLE_CLIENT_ID || ''),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const params = response.params as any;
      const auth = (response as any).authentication as any;

      // Expo's response shape can vary slightly between SDK versions.
      const idToken: string | undefined =
        params?.id_token ||
        params?.idToken ||
        auth?.id_token ||
        auth?.idToken ||
        auth?.idToken;

      if (!idToken) {
        Toast.show({
          type: 'error',
          text1: 'Google sign-in failed: token not returned',
        });
        return;
      }

      handleGoogleLogin(idToken);
    }

    if (response?.type === 'error') {
      const errMsg =
        (response as any)?.error?.message ||
        (response as any)?.error ||
        'Google sign-in failed';
      Toast.show({ type: 'error', text1: String(errMsg) });
    }
  }, [response]);

  const handleGoogleLogin = async (credential: string) => {
    try {
      const { data } = await googleLoginApi(credential);
      if (data.token) {
        await SecureStore.setItemAsync('authToken', data.token);
      }
      await dispatch(loadUser()).unwrap();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.response?.data?.message || 'Google sign-in failed' });
    }
  };

  return {
    promptAsync,
    isReady: !!request && !!GOOGLE_CLIENT_ID,
  };
}
