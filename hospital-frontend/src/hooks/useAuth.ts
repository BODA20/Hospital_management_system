import { useAuthContext } from '../app/AuthContext';

export const useAuth = () => {
  return useAuthContext();
};
