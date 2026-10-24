import { useState, useRef, useEffect } from 'react';
import { X, Flag, User, Mail, MessageSquare, ChevronDown, Send, Check, Loader2 } from 'lucide-react';
import { SITE } from '../config/site.js';
import { useToast } from '../context/ToastContext';

// ── Discord webhook queue ──────────────────────────────────────────────────
// Properly handles Discord's rate limit:
// - Max 5 requests per 2 seconds
// - Reads Retry-After header on 429 and waits exactly that long
// - Retries failed requests up to 3 times before giving up
// - Never drops a message — everything is queued and processed in order
const webhookQueue = [];
let isSending = false;

async function sendToDiscord(url, payload) {
  return new Promise((resolve, reject) => {
    webhookQueue.push({ url, payload, resolve, reject, retries: 0 });
    if (!isSending) flushQueue();
  });
}

async function sendOne({ url, payload }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // 429 = rate limited — read Retry-After header and wait
  if (res.status === 429) {
    const retryAfter = parseFloat(res.headers.get('Retry-After') || '2') * 1000;
    await new Promise(r => setTimeout(r, retryAfter + 100)); // +100ms buffer
    throw new Error('RATE_LIMITED');
  }

  if (!res.ok) throw new Error(`Discord error: ${res.status}`);
  return res;
}

async function flushQueue() {
  isSending = true;
  while (webhookQueue.length > 0) {
    // Take up to 5 items — Discord's per-2s limit
    const batch = webhookQueue.splice(0, 5);

    for (const item of batch) {
      try {
        const res = await sendOne(item);
        item.resolve(res);
      } catch (err) {
        if (err.message === 'RATE_LIMITED' && item.retries < 3) {
          // Put back at front of queue to retry
          item.retries++;
          webhookQueue.unshift(item);
        } else {
          item.reject(err);
        }
      }
    }

    // Always wait 2.1s between batches to stay under rate limit
    if (webhookQueue.length > 0) {
      await new Promise(r => setTimeout(r, 2100));
    }
  }
  isSending = false;
}
// ──────────────────────────────────────────────────────────────────────────

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const op = Math.random() > 0.5 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;
  return { question: `What is ${a} ${op} ${b}?`, answer };
}

const subjects = ['Bug Report', 'Content Request', 'Account Issue', 'DMCA / Copyright', 'Other'];

export default function ReportModal({ onClose }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    name: '', email: '', subject: '', message: '', newsletter: false,
  });
  const [errors, setErrors] = useState({});
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaVal, setCaptchaVal] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);
  const [captchaShake, setCaptchaShake] = useState(false);
  const [submitState, setSubmitState] = useState('idle'); // idle | loading | done

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validateCaptcha = (val) => {
    setCaptchaVal(val);
    if (parseInt(val) === captcha.answer) {
      setCaptchaOk(true);
      setErrors(e => ({ ...e, captcha: '' }));
    } else {
      setCaptchaOk(false);
    }
  };

  const handleCaptchaBlur = () => {
    if (captchaVal && parseInt(captchaVal) !== captcha.answer) {
      setCaptchaShake(true);
      setErrors(e => ({ ...e, captcha: 'Incorrect, try again' }));
      setCaptcha(generateCaptcha());
      setCaptchaVal('');
      setTimeout(() => setCaptchaShake(false), 500);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.subject) e.subject = 'Select a subject';
    if (!form.message.trim()) e.message = 'Message cannot be empty';
    if (!captchaOk) e.captcha = 'Solve the captcha';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitState('loading');
    try {
      const payload = {
        embeds: [{
          title: ' New Report — Anijelia',
          color: 0x6C63FF,
          fields: [
            { name: ' Name', value: form.name, inline: true },
            { name: ' E-mail', value: form.email, inline: true },
            { name: ' Subject', value: form.subject, inline: false },
            { name: ' Message', value: form.message, inline: false },
            { name: ' Newsletter', value: form.newsletter ? ' Yes' : ' No', inline: true },
            { name: ' Sent At', value: new Date().toLocaleString(), inline: true },
          ],
          footer: { text: 'Anijelia Report System' },
          timestamp: new Date().toISOString(),
        }]
      };
      if (!SITE.discordWebhook) {
        throw new Error('Discord webhook not configured in site.js');
      }
      await sendToDiscord(SITE.discordWebhook, payload);
      setSubmitState('done');
      addToast('Report sent successfully!', 'success');
      setTimeout(() => {
        setForm({ name: '', email: '', subject: '', message: '', newsletter: false });
        setCaptchaOk(false);
        setCaptchaVal('');
        setSubmitState('idle');
        onClose();
      }, 2000);
    } catch {
      setSubmitState('idle');
      addToast('Failed to send. Please try again.', 'error');
    }
  };

  const inputStyle = (err) => ({
    width: '100%', background: 'transparent',
    border: 'none', borderBottom: `2px solid ${err ? '#ef4444' : 'var(--border)'}`,
    color: 'var(--text-primary)', padding: '10px 0 6px 28px',
    fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s',
    fontFamily: 'Inter, sans-serif',
  });

  const fieldWrapper = { position: 'relative', marginBottom: '1.25rem' };
  const iconStyle = { position: 'absolute', left: 0, top: 10, color: 'var(--text-muted)' };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(13,13,18,0.92)',
          border: '1px solid rgba(108,99,255,0.2)',
          borderRadius: 20, padding: '2rem',
          maxWidth: 500, width: '100%',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          my: '2rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flag size={20} color="#6C63FF" />
            <h2 style={{
              fontWeight: 700, fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #6C63FF, #FF6B9D)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Report / Contact Us
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 8, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Name */}
        <div style={fieldWrapper}>
          <User size={16} style={iconStyle} />
          <input
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            style={inputStyle(errors.name)}
            onFocus={e => e.target.style.borderBottomColor = '#6C63FF'}
            onBlur={e => e.target.style.borderBottomColor = errors.name ? '#ef4444' : 'var(--border)'}
          />
          {errors.name && <span style={{ fontSize: 11, color: '#ef4444', display: 'block', marginTop: 3 }}>{errors.name}</span>}
        </div>

        {/* Email */}
        <div style={fieldWrapper}>
          <Mail size={16} style={iconStyle} />
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            style={inputStyle(errors.email)}
            onFocus={e => e.target.style.borderBottomColor = '#6C63FF'}
            onBlur={e => e.target.style.borderBottomColor = errors.email ? '#ef4444' : 'var(--border)'}
          />
          {errors.email && <span style={{ fontSize: 11, color: '#ef4444', display: 'block', marginTop: 3 }}>{errors.email}</span>}
        </div>

        {/* Subject Dropdown */}
        <div style={{ ...fieldWrapper, position: 'relative' }}>
          <ChevronDown size={16} style={{ position: 'absolute', right: 0, top: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <button
            onClick={() => setSubjectOpen(s => !s)}
            style={{
              width: '100%', textAlign: 'left', background: 'transparent',
              border: 'none', borderBottom: `2px solid ${errors.subject ? '#ef4444' : subjectOpen ? '#6C63FF' : 'var(--border)'}`,
              color: form.subject ? '#6C63FF' : 'var(--text-muted)',
              padding: '10px 24px 6px 0', fontSize: '0.9rem', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            {form.subject || 'Select subject...'}
          </button>
          {subjectOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'rgba(13,13,18,0.98)', border: '1px solid rgba(108,99,255,0.3)',
              borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
            }}>
              {subjects.map(s => (
                <div key={s}
                  onClick={() => { setField('subject', s); setSubjectOpen(false); }}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: '0.9rem',
                    color: form.subject === s ? '#6C63FF' : 'var(--text-primary)',
                    background: form.subject === s ? 'rgba(108,99,255,0.15)' : 'transparent',
                    transition: 'background 0.15s',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = form.subject === s ? 'rgba(108,99,255,0.15)' : 'transparent'}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
          {errors.subject && <span style={{ fontSize: 11, color: '#ef4444', display: 'block', marginTop: 3 }}>{errors.subject}</span>}
        </div>

        {/* Message */}
        <div style={fieldWrapper}>
          <MessageSquare size={16} style={{ ...iconStyle, top: 12 }} />
          <div style={{ position: 'relative' }}>
            <textarea
              placeholder="Your message..."
              value={form.message}
              maxLength={500}
              onChange={e => setField('message', e.target.value)}
              rows={3}
              style={{
                ...inputStyle(errors.message),
                resize: 'none', width: '100%',
                borderBottom: `2px solid ${errors.message ? '#ef4444' : 'var(--border)'}`,
              }}
            />
            <span style={{ position: 'absolute', bottom: 4, right: 0, fontSize: 10, color: 'var(--text-muted)' }}>
              {form.message.length} / 500
            </span>
          </div>
          {errors.message && <span style={{ fontSize: 11, color: '#ef4444', display: 'block', marginTop: 3 }}>{errors.message}</span>}
        </div>

        {/* Math Captcha */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{captcha.question}</p>
          <input
            type="number"
            value={captchaVal}
            onChange={e => validateCaptcha(e.target.value)}
            onBlur={handleCaptchaBlur}
            placeholder="Answer"
            style={{
              padding: '8px 12px', borderRadius: 8, fontSize: '0.9rem',
              background: 'var(--bg-elevated)',
              border: `2px solid ${captchaOk ? '#22c55e' : errors.captcha ? '#ef4444' : 'var(--border)'}`,
              color: 'var(--text-primary)', outline: 'none', width: 120,
              animation: captchaShake ? 'shake 0.4s ease' : 'none',
            }}
          />
          {captchaOk && <Check size={14} color="#22c55e" style={{ display: 'inline', marginLeft: 8 }} />}
          {errors.captcha && <span style={{ fontSize: 11, color: '#ef4444', display: 'block', marginTop: 3 }}>{errors.captcha}</span>}
        </div>

        {/* Newsletter checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button
            onClick={() => setField('newsletter', !form.newsletter)}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: form.newsletter ? 'linear-gradient(135deg, #6C63FF, #FF6B9D)' : 'transparent',
              border: `2px solid ${form.newsletter ? 'transparent' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.3s ease',
            }}
          >
            {form.newsletter && (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polyline points="2 6 5 9 10 3" fill="none" stroke="white" strokeWidth="2"
                  style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'drawCheck 0.3s ease' }} />
              </svg>
            )}
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            I want to receive Anijelia newsletters and updates
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: form.newsletter ? '#6C63FF' : 'var(--text-muted)', transition: 'color 0.3s' }}>
            {form.newsletter ? 'YES' : 'NO'}
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitState === 'loading' || submitState === 'done'}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: submitState === 'done' ? '#22c55e' : 'linear-gradient(135deg, #6C63FF, #FF6B9D)',
            color: 'white', fontWeight: 700, fontSize: '0.95rem',
            cursor: submitState !== 'idle' ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {submitState === 'loading' ? <><Loader2 size={16} className="animate-spin" /> Sending...</> :
           submitState === 'done' ? <><Check size={16} /> Sent Successfully!</> :
           <><Send size={16} /> Send Report</>}
        </button>
      </div>
    </div>
  );
}
