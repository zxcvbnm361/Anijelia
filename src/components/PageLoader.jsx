import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '50vh', color: '#6C63FF',
    }}>
      <Loader2 size={36} className="animate-spin" />
    </div>
  );
}
