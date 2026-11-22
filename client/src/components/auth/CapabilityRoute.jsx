import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export function CapabilityRoute({ capability, children, fallbackTitle, fallbackMessage }) {
  const { hasCapability, addCapability } = useAuth();

  if (!hasCapability(capability)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-lg mx-auto">
        <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-[24px] bg-[rgba(220,38,38,0.12)] text-danger">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-light text-text mb-2">
          {fallbackTitle || `${capability.toUpperCase()} Capability Required`}
        </h2>

        <p className="text-[13px] text-muted leading-relaxed mb-6">
          {fallbackMessage ||
            `This section requires the "${capability}" capability. You can enable it on your Roam profile with one click.`}
        </p>

        {['seller', 'dealer'].includes(capability) && (
          <Button
            variant="primary"
            size="lg"
            onClick={async () => {
              try {
                await addCapability(capability);
              } catch (err) {
                console.error('Failed to enable capability', err);
              }
            }}
          >
            <span>Enable {capability} capability</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    );
  }

  return children;
}

export default CapabilityRoute;
