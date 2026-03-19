import FairScope from '@/components/FairScope';

export default function Page() {
  return (
    <>
      <FairScope />
      <footer style={{
        textAlign: 'center',
        padding: '48px 24px 80px',
        borderTop: '1px solid #e5e7eb',
        background: '#fafaf9',
        fontFamily: 'Georgia, serif',
      }}>
        <p style={{
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#9ca3af',
          margin: '0 0 16px',
        }}>Made by</p>

        <p style={{
          fontSize: '26px',
          fontWeight: '700',
          margin: '0 0 4px',
          color: '#111827',
        }}>Rashi</p>

        <p style={{
          fontSize: '13px',
          color: '#6b7280',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 20px',
        }}>Designer</p>

        <p style={{
          fontSize: '15px',
          fontStyle: 'italic',
          color: '#4b5563',
          maxWidth: '320px',
          margin: '0 auto 24px',
          lineHeight: '1.7',
        }}>
          "I love designing products, and breaking them to figure out exactly how to make them better."
        </p>

        <a href="https://rashi.framer.ai/" target="_blank" style={{
          display: 'inline-block',
          fontSize: '13px',
          color: '#ffffff',
          background: '#111827',
          padding: '10px 24px',
          borderRadius: '999px',
          textDecoration: 'none',
          letterSpacing: '0.05em',
        }}>
          View Portfolio ↗
        </a>
      </footer>
    </>
  );
}