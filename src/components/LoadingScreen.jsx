import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function LoadingScreen({ onDone }) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const bg = theme === 'light' ? '#F4F4FA' : '#0D0D12';
  const textColor = theme === 'light' ? '#0D0D2A' : '#F0F0FF';

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1400);
    const t4 = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onDone, 500);
    }, 2500);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  const leftLetters = ['A', 'N', 'I'];
  const rightLetters = ['J', 'E', 'L', 'I', 'A'];

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: bg,
        width: '100vw',
        height: '100vh',
        opacity: fadeOut ? 0 : 1,
        transform: fadeOut ? 'scale(0.97)' : 'scale(1)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* Animated background blobs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: 500, height: 500,
          borderRadius: '50%', filter: 'blur(80px)',
          background: '#6C63FF22',
          top: '-10%', left: '-10%',
          animation: 'bgBlob 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%', filter: 'blur(80px)',
          background: '#FF6B9D15',
          bottom: '0%', right: '-5%',
          animation: 'bgBlob 10s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%', filter: 'blur(60px)',
          background: '#FFD16615',
          top: '50%', left: '60%',
          animation: 'bgBlob 12s ease-in-out infinite 2s',
        }} />
      </div>

      {/* Logo animation */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
        {/* Orbit ring */}
        <div style={{
          position: 'absolute', inset: -40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}>
          <svg width="200" height="200" viewBox="0 0 200 200" style={{ animation: 'spin 4s linear infinite' }}>
            <circle
              cx="100" cy="100" r="90"
              fill="none"
              stroke="url(#orbitGrad)"
              strokeWidth="1.5"
              strokeDasharray="12 8"
              opacity="0.5"
            />
            <defs>
              <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6C63FF" />
                <stop offset="100%" stopColor="#FF6B9D" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Letters */}
        <div style={{
          display: 'flex', gap: 0, alignItems: 'center',
          maxWidth: '90vw', justifyContent: 'center',
        }}>
          {leftLetters.map((letter, i) => (
            <span
              key={letter + i}
              style={{
                fontFamily: 'Cinzel, serif',
                fontWeight: 900,
                fontSize: 'clamp(2.5rem, 10vw, 5rem)',
                background: 'linear-gradient(135deg, #6C63FF, #FF6B9D)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                opacity: phase >= 1 ? 1 : 0,
                transform: phase >= 1 ? 'translateX(0)' : 'translateX(-40px)',
                transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
                lineHeight: 1,
              }}
            >
              {letter}
            </span>
          ))}
          {rightLetters.map((letter, i) => (
            <span
              key={letter + i + 'r'}
              style={{
                fontFamily: 'Cinzel, serif',
                fontWeight: 900,
                fontSize: 'clamp(2.5rem, 10vw, 5rem)',
                background: 'linear-gradient(135deg, #6C63FF, #FF6B9D)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                opacity: phase >= 1 ? 1 : 0,
                transform: phase >= 1 ? 'translateX(0)' : 'translateX(40px)',
                transition: `opacity 0.5s ease ${(i + 3) * 0.1}s, transform 0.5s ease ${(i + 3) * 0.1}s`,
                lineHeight: 1,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p style={{
          marginTop: '1rem',
          fontSize: 'clamp(0.75rem, 2vw, 1rem)',
          color: theme === 'light' ? '#55556A' : '#8888AA',
          letterSpacing: '0.15em',
          fontWeight: 400,
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          Your World of Anime & Cinema.
        </p>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 2, background: 'rgba(255,255,255,0.08)',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #6C63FF, #FF6B9D)',
          width: fadeOut ? '100%' : `${(phase / 3) * 100}%`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}
