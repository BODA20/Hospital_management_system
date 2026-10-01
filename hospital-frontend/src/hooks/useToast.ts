import { useToastContext } from '../app/ToastContext';

export const useToast = () => {
  const { showToast } = useToastContext();
  
  return {
    success: (title: string, message?: string) => showToast(title, message, 'success'),
    error: (title: string, message?: string) => showToast(title, message, 'error'),
    warning: (title: string, message?: string) => showToast(title, message, 'warning'),
    info: (title: string, message?: string) => showToast(title, message, 'info'),
  };
};
