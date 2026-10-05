'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { AlertCircle, Crosshair, Loader2, MapPin, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Map, Marker, type MapRef } from 'react-map-gl/mapbox'

import { cn } from '@/lib/utils'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

// Default center: India
const INDIA_CENTER = { longitude: 78.9629, latitude: 20.5937, zoom: 4 }

interface MapLocationPickerProps {
  latitude: number | null
  longitude: number | null
  /** Approximate center to fly to when lat/lng are not yet set (e.g. from geocoding the locality) */
  suggestedCenter?: { lat: number; lng: number } | null
  onLocationChange: (lat: number, lng: number) => void
  onLocationClear?: () => void
  className?: string
}

export function MapLocationPicker({
  latitude,
  longitude,
  suggestedCenter,
  onLocationChange,
  onLocationClear,
  className,
}: MapLocationPickerProps) {
  const mapRef = useRef<MapRef>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const hasPinned = latitude !== null && longitude !== null

  // Fly to suggested center when it first becomes available (locality geocoded)
  // but only if the user hasn't already placed a pin
  const prevSuggested = useRef<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    if (!suggestedCenter) return
    if (hasPinned) return

    const prev = prevSuggested.current
    const changed =
      !prev ||
      Math.abs(prev.lat - suggestedCenter.lat) > 0.001 ||
      Math.abs(prev.lng - suggestedCenter.lng) > 0.001

    if (changed) {
      prevSuggested.current = suggestedCenter
      mapRef.current?.flyTo({
        center: [suggestedCenter.lng, suggestedCenter.lat],
        zoom: 14,
        duration: 800,
      })
    }
  }, [suggestedCenter, hasPinned])

  // Fly to pinned location when it's first set externally (e.g. GPS)
  const prevPin = useRef<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    if (!hasPinned) return
    const prev = prevPin.current
    const changed =
      !prev || Math.abs(prev.lat - latitude) > 0.001 || Math.abs(prev.lng - longitude) > 0.001

    if (changed) {
      prevPin.current = { lat: latitude, lng: longitude }
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: 16,
        duration: 600,
      })
    }
  }, [latitude, longitude, hasPinned])

  const handleMapClick = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      onLocationChange(e.lngLat.lat, e.lngLat.lng)
    },
    [onLocationChange],
  )

  const handleMarkerDragEnd = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      setIsDragging(false)
      onLocationChange(e.lngLat.lat, e.lngLat.lng)
    },
    [onLocationChange],
  )

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Your browser does not support GPS.')
      return
    }
    setGpsStatus('loading')
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus('idle')
        onLocationChange(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setGpsStatus('error')
        setGpsError('Location access denied. Allow location and try again.')
      },
      { timeout: 10000 },
    )
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={cn(
          'border-border flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center',
          className,
        )}
      >
        <AlertCircle className="text-muted-foreground h-5 w-5" />
        <p className="text-muted-foreground text-sm">
          Map unavailable — Mapbox token not configured.
        </p>
      </div>
    )
  }

  const initialView = hasPinned
    ? { longitude: longitude!, latitude: latitude!, zoom: 15 }
    : suggestedCenter
      ? { longitude: suggestedCenter.lng, latitude: suggestedCenter.lat, zoom: 14 }
      : INDIA_CENTER

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="border-border relative overflow-hidden rounded-xl border"
        style={{ height: 280 }}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={initialView}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          style={{ width: '100%', height: '100%' }}
          cursor={isDragging ? 'grabbing' : 'crosshair'}
          onClick={handleMapClick}
          scrollZoom={false}
          touchPitch={false}
          dragRotate={false}
        >
          {hasPinned && (
            <Marker
              longitude={longitude!}
              latitude={latitude!}
              anchor="bottom"
              draggable
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleMarkerDragEnd}
            >
              <div
                className="bg-primary flex h-9 w-9 cursor-grab items-center justify-center rounded-full shadow-lg ring-2 ring-white transition-transform active:scale-110 active:cursor-grabbing"
                title="Drag to adjust location"
              >
                <MapPin className="h-4 w-4 fill-white text-white" aria-hidden="true" />
              </div>
            </Marker>
          )}
        </Map>

        {/* Map hint overlay — shown until user places a pin */}
        {!hasPinned && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
              Optional — tap to pin your exact location
            </span>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDetectGps}
          disabled={gpsStatus === 'loading'}
          className={cn(
            'focus:ring-primary/20 flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2',
            'border-border text-foreground hover:bg-muted bg-white',
          )}
        >
          {gpsStatus === 'loading' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Use GPS
        </button>

        {hasPinned && onLocationClear && (
          <button
            type="button"
            onClick={onLocationClear}
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-primary/20 flex items-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors focus:outline-none focus:ring-2"
            title="Remove pin"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {/* Coordinate display */}
      {hasPinned && (
        <>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <MapPin className="text-primary h-3 w-3 shrink-0" aria-hidden="true" />
            Pinned:{' '}
            <span className="text-foreground font-medium">
              {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
            </span>
            <span className="ml-1 text-green-600">&#10003; Location set</span>
          </p>
          <p className="text-muted-foreground text-xs">
            Buyers will see this pin location — drag it to a nearby entrance for privacy.
          </p>
        </>
      )}

      {gpsError && (
        <p role="alert" className="flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {gpsError}
        </p>
      )}
    </div>
  )
}
