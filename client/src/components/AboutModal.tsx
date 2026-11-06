import { useEffect, useState } from 'react';
import { X, Heart, ExternalLink, Sparkles, Bot, Code2, ShieldCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  openSourceCredits?: Array<{ name: string; author: string; desc: string }>;
}

const socialLinks = [
  { name: 'GitHub', handle: '@nasiropintu', url: 'https://github.com/nasiropintu', color: '#24292e' },
  { name: 'X (Twitter)', handle: '@nasiropintu', url: 'https://x.com/nasiropintu', color: '#000000' },
  { name: 'Instagram', handle: '@the_np2', url: 'https://www.instagram.com/the_np2/', color: '#E1306C' },
  { name: 'Facebook', handle: 'mohammadnasiruddin.pintu', url: 'https://www.facebook.com/mohammadnasiruddin.pintu/', color: '#1877F2' },
];

const aiCollaborators = [
  { name: 'Gemini', provider: 'Google DeepMind', role: 'Architecture & Agentic Workflows' },
  { name: 'Manus', provider: 'Manus AI', role: 'Autonomous Planning & Synthesis' },
  { name: 'ChatGPT', provider: 'OpenAI', role: 'Logic Optimization & Reasoning' },
  { name: 'DeepSeek', provider: 'DeepSeek', role: 'Algorithmic Engineering & Core Logic' },
  { name: 'Claude', provider: 'Anthropic', role: 'Systems Architecture & Clean Design' },
  { name: 'Vibe by Mistral', provider: 'Mistral AI', role: 'Fast Generation & Execution' },
];

export default function AboutModal({ isOpen, onClose, openSourceCredits = [] }: AboutModalProps) {
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="about-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="about-modal-close" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>

        {/* Creator Hero */}
        <div className="creator-hero">
          <div className="creator-avatar-wrap">
            {!photoError ? (
              <img
                src="./nasirpintu.jpg"
                alt="NasirPintu"
                className="creator-avatar-img"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <div className="creator-avatar-fallback"><span>NP</span></div>
            )}
            <div className="creator-avatar-badge" title="Creator Verified">
              <Sparkles size={11} />
            </div>
          </div>

          <div className="creator-meta">
            <div className="creator-tagline-pill">
              <Heart size={11} style={{ fill: 'currentColor', color: '#e54b24' }} />
              <span>Crafted with Love · v1.1.0</span>
            </div>
            <h2 className="creator-name">NasirPintu</h2>
            <p className="creator-subtitle">Mohammad Nasiruddin Pintu · Creator & Architect</p>
            <p className="creator-bio">
              Dedicated to building free, private-by-design, serverless tools that empower people without paywalls, subscriptions, or data tracking.
            </p>
          </div>
        </div>

        {/* Social Links */}
        <div className="about-section">
          <div className="about-section-label">CONNECT WITH NASIRPINTU</div>
          <div className="social-links-grid">
            {socialLinks.map((s) => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="social-pill">
                <span className="social-info">
                  <strong>{s.name}</strong>
                  <small>{s.handle}</small>
                </span>
                <ExternalLink size={12} className="social-arrow" />
              </a>
            ))}
          </div>
        </div>

        {/* AI Agent Collaboration Credits */}
        <div className="about-section">
          <div className="about-section-head">
            <div className="about-section-label">
              <Bot size={13} style={{ display: 'inline', marginRight: 6 }} />
              AI AGENT COLLABORATION CREDITS
            </div>
            <span className="ai-sublabel">Human-Directed · Agent-Assisted</span>
          </div>
          <p className="about-narrative">
            Conceived and architected by <strong>NasirPintu</strong>, engineered in active synergy with frontier artificial intelligence models and autonomous coding agents.
          </p>
          <div className="ai-agents-grid">
            {aiCollaborators.map((ai) => (
              <div key={ai.name} className="ai-agent-chip">
                <div className="ai-agent-dot" />
                <div className="ai-agent-text">
                  <strong>{ai.name}</strong>
                  <span className="ai-agent-provider">{ai.provider}</span>
                  <span className="ai-agent-role">{ai.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open-Source Community Credits */}
        {openSourceCredits.length > 0 && (
          <div className="about-section">
            <div className="about-section-label">
              <Code2 size={13} style={{ display: 'inline', marginRight: 6 }} />
              OPEN-SOURCE COMMUNITY CREDITS
            </div>
            <div className="oss-grid">
              {openSourceCredits.map((oss) => (
                <div key={oss.name} className="oss-card">
                  <div className="oss-head">
                    <strong>{oss.name}</strong>
                    <span>by {oss.author}</span>
                  </div>
                  <p>{oss.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="about-modal-footer">
          <ShieldCheck size={15} style={{ color: '#24755f', flexShrink: 0 }} />
          <span><strong>Privacy Guarantee:</strong> All processing stays strictly on your device. Zero telemetry. Zero server uploads.</span>
        </div>
      </div>
    </div>
  );
}
