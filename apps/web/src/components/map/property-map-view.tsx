'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import { X } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapRef,
  type ViewState,
} from 'react-map-gl/mapbox'

import { formatPrice } from '@/lib/format'
import type { MockListing } from '@/lib/mock-data'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

const INDIA_CENTER = { longitude: 78.9629, latitude: 20.5937, zoom: 5 }

// Cluster source + layers use Mapbox built-in clustering for performance
const clusterLayer: LayerProps = {
  id: 'clusters',
  type: 'circle',
  source: 'listings',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      '#6366f1',
      10,
      '#4f46e5',
      30,
      '#3730a3',
    ] as unknown as string,
    'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 30, 36] as unknown as number,
    'circle-opacity': 0.9,
  },
}

const clusterCountLayer: LayerProps = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'listings',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-size': 13,
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
  },
  paint: { 'text-color': '#ffffff' },
}

const unclusteredPointLayer: LayerProps = {
  id: 'unclustered-point',
  type: 'circle',
  source: 'listings',
  filter: ['!', ['has', 'point_count']],
  paint: {
    'circle-color': '#ffffff',
    'circle-radius': 0,
    'circle-stroke-width': 0,
  },
}

interface Props {
  listings: MockListing[]
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void
  searchOnMove?: boolean
  onSearchOnMoveToggle?: (value: boolean) => void
}

interface PricePin {
  listing: MockListing
  x: number
  y: number
}

export function PropertyMapView({
  listings,
  onBoundsChange,
  searchOnMove = false,
  onSearchOnMoveToggle,
}: Props) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState<Partial<ViewState>>(INDIA_CENTER)
  const [selectedListing, setSelectedListing] = useState<MockListing | null>(null)
  const [pricePins, setPricePins] = useState<PricePin[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Build GeoJSON from listings that have coordinates
  const geojson = {
    type: 'FeatureCollection' as const,
    features: listings
      .filter((l) => l.latitude !== null && l.longitude !== null)
      .map((l) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [l.longitude!, l.latitude!],
        },
        properties: {
          id: l.id,
          price: l.price,
          title: l.title,
        },
      })),
  }

  // Reproject price pins to screen coordinates on render
  const updatePricePins = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !mapLoaded) return

    const zoom = map.getZoom()
    if (zoom < 10) {
      setPricePins([])
      return
    }

    const visible: PricePin[] = []
    for (const listing of listings) {
      if (listing.latitude === null || listing.longitude === null) continue
      const pt = map.project([listing.longitude, listing.latitude])
      visible.push({ listing, x: pt.x, y: pt.y })
    }
    setPricePins(visible)
  }, [listings, mapLoaded])

  useEffect(() => {
    updatePricePins()
  }, [updatePricePins, viewState])

  const handleMoveEnd = useCallback(() => {
    updatePricePins()
    if (!searchOnMove || !onBoundsChange) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const bounds = map.getBounds()
    if (!bounds) return
    onBoundsChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    })
  }, [searchOnMove, onBoundsChange, updatePricePins])

  const handleMapClick = useCallback(
    (e: { features?: Array<{ properties: { id?: string; cluster_id?: number } }> }) => {
      const features = e.features ?? []
      if (!features.length) {
        setSelectedListing(null)
        return
      }

      const feature = features[0]
      if (!feature?.properties) return

      // Cluster click — zoom in
      if (feature.properties.cluster_id !== undefined) {
        const map = mapRef.current?.getMap()
        if (!map) return
        const source = map.getSource('listings') as {
          getClusterExpansionZoom: (id: number, cb: (err: unknown, zoom: number) => void) => void
        }
        source.getClusterExpansionZoom(feature.properties.cluster_id, (err, zoom) => {
          if (err) return
          const coords = (e as unknown as { lngLat: { lng: number; lat: number } }).lngLat
          map.easeTo({ center: [coords.lng, coords.lat], zoom })
        })
        return
      }

      // Single listing click
      const id = feature.properties.id
      const listing = listings.find((l) => l.id === id)
      if (listing) setSelectedListing(listing)
    },
    [listings],
  )

  // Auto-fit map to listings with coordinates
  useEffect(() => {
    if (!mapLoaded || !listings.length) return
    const withCoords = listings.filter((l) => l.latitude !== null && l.longitude !== null)
    if (!withCoords.length) return

    const lngs = withCoords.map((l) => l.longitude!)
    const lats = withCoords.map((l) => l.latitude!)
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs) - 0.05, Math.min(...lats) - 0.05],
      [Math.max(...lngs) + 0.05, Math.max(...lats) + 0.05],
    ]
    mapRef.current?.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 14 })
  }, [mapLoaded, listings])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)]">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Map unavailable — set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable.
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onMoveEnd={handleMoveEnd}
        onLoad={() => setMapLoaded(true)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactiveLayerIds={['clusters', 'unclustered-point']}
        onClick={handleMapClick as unknown as (e: unknown) => void}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        <Source
          id="listings"
          type="geojson"
          data={geojson}
          cluster
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>

        {/* Price pins — HTML overlay, only at zoom ≥ 10 */}
        {pricePins.map(({ listing, x, y }) => (
          <div
            key={listing.id}
            onClick={() => setSelectedListing(listing)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setSelectedListing(listing)}
            aria-label={`${listing.title} — ${formatPrice(listing.price)}`}
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer"
            style={{ left: x, top: y, pointerEvents: 'auto' }}
          >
            <span
              className={`flex items-center gap-0.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md transition-all duration-150 ${
                selectedListing?.id === listing.id
                  ? 'scale-110 bg-[var(--color-primary)] text-white'
                  : 'bg-white text-[var(--color-foreground)] hover:bg-[var(--color-primary)] hover:text-white'
              }`}
            >
              {formatPrice(listing.price)}
            </span>
            <span
              className={`mx-auto block h-2 w-0.5 ${selectedListing?.id === listing.id ? 'bg-[var(--color-primary)]' : 'bg-gray-700'}`}
              aria-hidden="true"
            />
          </div>
        ))}

        {/* Popup for selected listing — coordinates */}
        {selectedListing && selectedListing.latitude !== null && (
          <Popup
            longitude={selectedListing.longitude!}
            latitude={selectedListing.latitude!}
            anchor="bottom"
            offset={[0, -8] as [number, number]}
            closeButton={false}
            closeOnClick={false}
            style={{ padding: 0 }}
          >
            <div className="w-56" />
          </Popup>
        )}
      </Map>

      {/* Search-as-I-move toggle */}
      {onSearchOnMoveToggle && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2">
          <button
            type="button"
            onClick={() => onSearchOnMoveToggle(!searchOnMove)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-md transition-colors ${
              searchOnMove
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white text-[var(--color-foreground)]'
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full border-2 ${searchOnMove ? 'border-white bg-white/30' : 'border-gray-400'}`}
              aria-hidden="true"
            />
            Search as map moves
          </button>
        </div>
      )}

      {/* Side panel for selected listing */}
      {selectedListing && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-2xl bg-white p-4 shadow-2xl sm:left-auto sm:right-4 sm:w-80">
          <button
            type="button"
            onClick={() => setSelectedListing(null)}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="pr-6">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {selectedListing.locality}, {selectedListing.city}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-[var(--color-foreground)]">
              {selectedListing.title}
            </p>
            <p className="mt-1 text-xl font-bold text-[var(--color-foreground)]">
              {formatPrice(selectedListing.price)}
            </p>

            {selectedListing.societyName && (
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {selectedListing.societyName}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5">
                {selectedListing.bhkType?.replace(/_/g, ' ')}
              </span>
              <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5">
                {selectedListing.builtUpArea} sq ft
              </span>
              <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 capitalize">
                {selectedListing.furnishing?.toLowerCase().replace(/_/g, ' ')}
              </span>
            </div>

            <Link
              href={`/listing/${selectedListing.id}`}
              className="mt-3 block rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View details
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
