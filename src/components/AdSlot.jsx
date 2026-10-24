export default function AdSlot({ className = '' }) {
  return (
    <div className={className} style={{
      background: 'var(--bg-card)',
      border: '1px dashed var(--border)',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 90,
      color: 'var(--text-muted)',
      fontSize: 12,
      letterSpacing: '0.1em',
    }}>
      ADVERTISEMENT
    </div>
  );
}
