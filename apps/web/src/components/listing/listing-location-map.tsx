'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { Map, Marker } from 'react-map-gl/mapbox'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

interface ListingLocationMapProps {
  lat: number
  lng: number
  title: string
}

export function ListingLocationMap({ lat, lng, title }: ListingLocationMapProps) {
  if (!MAPBOX_TOKEN) return null

  return (
    <div className="mt-4 h-[280px] w-full overflow-hidden rounded-xl border border-[var(--color-border)]">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 14 }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
        scrollZoom={false}
      >
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div
            title={title}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] shadow-md ring-2 ring-white"
          >
            {/* map-pin icon */}
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
        </Marker>
      </Map>
    </div>
  )
}
