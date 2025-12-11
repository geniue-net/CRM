import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const MetaOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // The backend handles the OAuth callback and redirects here with success/error
    // We'll just redirect to dashboard which will show the message
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success || error) {
      navigate(`/dashboard?${searchParams.toString()}`);
    } else {
      navigate('/dashboard');
    }
  }, [navigate, searchParams]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Completing Meta account connection...</p>
      </div>
    </div>
  );
};

export default MetaOAuthCallback;

