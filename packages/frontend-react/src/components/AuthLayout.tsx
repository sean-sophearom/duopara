import { ReactNode } from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';

interface AuthLayoutProps {
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Kontexi</h1>
          <p className="text-gray-600 mt-2">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ErrorAlertProps {
  error: string;
  onDismiss: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{error}</span>
      <button onClick={onDismiss} className="ml-auto text-red-500 hover:text-red-700">
        &times;
      </button>
    </div>
  );
}
