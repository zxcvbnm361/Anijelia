export default function SkeletonCard() {
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div className="skeleton" style={{ aspectRatio: '2/3', width: '100%' }} />
      <div style={{ padding: '0.6rem' }}>
        <div className="skeleton" style={{ height: 14, borderRadius: 6, marginBottom: 8, width: '80%' }} />
        <div className="skeleton" style={{ height: 12, borderRadius: 6, width: '50%' }} />
      </div>
    </div>
  );
}
