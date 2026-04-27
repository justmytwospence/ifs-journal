import { ImageResponse } from 'next/og'

export const alt = 'IFS Journal — Discover Your Internal Parts'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fbf6ee 0%, #efe6d4 100%)',
        padding: '80px',
        fontFamily: 'serif',
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 600,
          color: '#1f1b16',
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
        }}
      >
        IFS Journal
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 36,
          color: '#5b554a',
          maxWidth: 900,
          lineHeight: 1.3,
        }}
      >
        Citation-grounded journaling for Internal Family Systems work.
      </div>
    </div>,
    size
  )
}
