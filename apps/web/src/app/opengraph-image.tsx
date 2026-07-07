import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ChapterNew — Find your next place'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#ffffff',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 700, color: '#222222', marginBottom: 24 }}>
        ChapterNew
      </div>
      <div style={{ fontSize: 32, color: '#717171', marginBottom: 48 }}>Find your next place</div>
      <div
        style={{
          background: '#FF385C',
          color: 'white',
          padding: '16px 40px',
          borderRadius: 12,
          fontSize: 28,
          fontWeight: 600,
        }}
      >
        No brokers · Verified owners
      </div>
    </div>,
    { ...size },
  )
}
