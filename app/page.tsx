import FairScope from '@/components/FairScope';

export default function Page() {
  return (
    <>
      <FairScope />
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        borderTop: '1px solid #e5e7eb',
        marginTop: '40px',
        fontFamily: 'sans-serif'
      }}>
        <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px' }}>Rashi</p>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px' }}>Designer</p>
        <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 16px', maxWidth: '400px', marginInline: 'auto' }}>
          I love designing products, and breaking them to figure out exactly how to make them better.
        </p>
        <a href="https://rashi.framer.ai/" target="_blank" style={{ fontSize: '14px', color: '#6366f1' }}>
          rashi.framer.ai ↗
        </a>
      </footer>
    </>
  );
}