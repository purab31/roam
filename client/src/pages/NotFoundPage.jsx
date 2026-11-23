import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <EmptyState
        title="404 — Page not found"
        description="The vehicle, page, or destination you were looking for could not be found or has moved."
        actionLabel="Return to Home"
        onAction={() => navigate('/')}
        icon={Compass}
      />
    </div>
  );
}

export default NotFoundPage;
