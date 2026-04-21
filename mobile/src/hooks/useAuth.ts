import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const useAuth = () => {
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.user);
  return { user, isAuthenticated, loading };
};
