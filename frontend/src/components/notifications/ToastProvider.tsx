import { Toaster } from 'sonner';
import { useTheme } from '../../theme';

export function ToastProvider() {
  const { isDark } = useTheme();

  return (
    <Toaster
      theme={isDark ? 'dark' : 'light'}
      position="top-center"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'font-sans rounded-xl shadow-lg',
          title: 'font-bold text-base',
          description: 'text-sm',
          success: 'bg-status-approved-bg border-status-approved-border text-status-approved-text',
          error: 'bg-status-overdue-bg border-status-overdue-border text-status-overdue-text',
          warning: 'bg-status-claimed-bg border-status-claimed-border text-status-claimed-text',
          info: 'bg-primary-50 border-primary-200 text-primary-700',
        },
      }}
    />
  );
}

export default ToastProvider;
