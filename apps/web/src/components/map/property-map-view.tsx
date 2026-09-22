'use client'

import 'mapbox-gl/dist/mapbox-gl.css'

import {
  Bath,
  BedDouble,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sofa,
  Star,
  X,
  Zap,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import Map, {
  Layer,
  NavigationControl,
  Source,
  type LayerProps,
  type MapRef,
  type ViewState,
} from 'react-map-gl/mapbox'

import { formatBHK, formatFurnishing, formatParking, formatPrice } from '@/lib/format'
import type { MockListing } from '@/lib/mock-data'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
const INDIA_CENTER = { longitude: 78.9629, latitude: 20.5937, zoom: 5 }

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
  activeBhkFilter?: string | null
}

interface PricePin {
  listing: MockListing
  x: number
  y: number
}

function PriceSqft({ price, area }: { price: number; area: number }) {
  const perSqft = Math.round(price / area)
  return (
    <span className="text-xs text-[var(--color-muted-foreground)]">
      ₹{Math.round(perSqft / 1000)}k/sqft
    </span>
  )
}

function postedRecently(createdAt: string): string | null {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days <= 6) return `Posted ${days} days ago`
  return null
}

function formatAge(ageOfProperty: number | null): string | null {
  if (ageOfProperty === null) return null
  if (ageOfProperty === 0) return 'New construction'
  if (ageOfProperty === 1) return '1 yr old'
  if (ageOfProperty < 10) return `${ageOfProperty} yr old`
  return '10+ yr old'
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-[var(--color-muted)]'
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${color}`}
    >
      <Zap className="h-2.5 w-2.5" />
      {score}
    </span>
  )
}

export function PropertyMapView({
  listings,
  onBoundsChange,
  searchOnMove = false,
  onSearchOnMoveToggle,
  activeBhkFilter = null,
}: Props) {
  const mapRef = useRef<MapRef>(null)
  const [viewState, setViewState] = useState<Partial<ViewState>>(INDIA_CENTER)
  const [selectedListing, setSelectedListing] = useState<MockListing | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number>(0)
  const [pricePins, setPricePins] = useState<PricePin[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [visibleListings, setVisibleListings] = useState<MockListing[]>([])

  const geojson = {
    type: 'FeatureCollection' as const,
    features: listings
      .filter((l) => l.latitude !== null && l.longitude !== null)
      .map((l) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [l.longitude!, l.latitude!] },
        properties: { id: l.id, price: l.price, title: l.title },
      })),
  }

  const updatePricePins = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !mapLoaded) return

    const zoom = map.getZoom()
    if (zoom < 10) {
      setPricePins([])
      return
    }

    const bounds = map.getBounds()
    if (!bounds) return

    const visible: PricePin[] = []
    const visibleList: MockListing[] = []
    for (const listing of listings) {
      if (listing.latitude === null || listing.longitude === null) continue
      if (
        listing.longitude < bounds.getWest() ||
        listing.longitude > bounds.getEast() ||
        listing.latitude < bounds.getSouth() ||
        listing.latitude > bounds.getNorth()
      )
        continue
      const pt = map.project([listing.longitude, listing.latitude])
      visible.push({ listing, x: pt.x, y: pt.y })
      visibleList.push(listing)
    }
    setPricePins(visible)
    setVisibleListings(visibleList)
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

  const selectListing = useCallback(
    (listing: MockListing) => {
      setSelectedListing(listing)
      const idx = visibleListings.findIndex((l) => l.id === listing.id)
      setSelectedIdx(idx >= 0 ? idx : 0)
    },
    [visibleListings],
  )

  const navigateListing = useCallback(
    (dir: 1 | -1) => {
      if (!visibleListings.length) return
      const next = (selectedIdx + dir + visibleListings.length) % visibleListings.length
      setSelectedIdx(next)
      setSelectedListing(visibleListings[next] ?? null)
    },
    [selectedIdx, visibleListings],
  )

  const handleMapClick = useCallback(
    (e: { features?: Array<{ properties: { id?: string; cluster_id?: number } }> }) => {
      const features = e.features ?? []
      if (!features.length) {
        setSelectedListing(null)
        return
      }

      const feature = features[0]
      if (!feature?.properties) return

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

      const id = feature.properties.id
      const listing = listings.find((l) => l.id === id)
      if (listing) selectListing(listing)
    },
    [listings, selectListing],
  )

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

  const heroImage = selectedListing?.images?.[0]?.url ?? null
  const pricePerSqft =
    selectedListing && selectedListing.builtUpArea > 0
      ? Math.round(selectedListing.price / selectedListing.builtUpArea)
      : null
  const recency = selectedListing ? postedRecently(selectedListing.createdAt) : null
  const ageLabel = selectedListing ? formatAge(selectedListing.ageOfProperty) : null

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        onMoveEnd={handleMoveEnd}
        onLoad={() => setMapLoaded(true)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
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

        {/* Price pins — HTML overlay at zoom ≥ 10 */}
        {pricePins.map(({ listing, x, y }) => {
          const isSelected = selectedListing?.id === listing.id
          return (
            <div
              key={listing.id}
              onClick={() => selectListing(listing)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && selectListing(listing)}
              aria-label={`${listing.title} — ${formatPrice(listing.price)}`}
              className="absolute cursor-pointer"
              style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -100%)',
                zIndex: isSelected ? 20 : 10,
                pointerEvents: 'auto',
              }}
            >
              {/* Pill */}
              <div
                className={`flex flex-col items-center whitespace-nowrap rounded-full px-2.5 py-1 shadow-md transition-all duration-150 ${
                  isSelected
                    ? 'scale-110 bg-[var(--color-primary)] text-white shadow-lg'
                    : 'bg-white text-[var(--color-foreground)] hover:bg-[var(--color-primary)] hover:text-white hover:shadow-lg'
                }`}
              >
                <span className="text-[11px] font-bold leading-tight">
                  {formatPrice(listing.price)}
                </span>
                {!activeBhkFilter && listing.bhkType && (
                  <span className="text-[9px] font-medium leading-tight opacity-70">
                    {formatBHK(listing.bhkType)}
                  </span>
                )}
              </div>
              {/* Triangle pointer */}
              <div
                className="mx-auto"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: isSelected ? '6px solid var(--color-primary)' : '6px solid white',
                }}
              />
            </div>
          )
        })}
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

      {/* Rich side panel */}
      {selectedListing && (
        <div className="absolute bottom-3 right-3 z-20 flex w-[320px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Prev/Next nav + close */}
          <div className="flex items-center justify-between px-3 pb-1 pt-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateListing(-1)}
                disabled={visibleListings.length <= 1}
                aria-label="Previous listing"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[52px] text-center text-[11px] font-medium text-[var(--color-muted-foreground)]">
                {visibleListings.length > 0
                  ? `${selectedIdx + 1} of ${visibleListings.length}`
                  : '1 of 1'}
              </span>
              <button
                type="button"
                onClick={() => navigateListing(1)}
                disabled={visibleListings.length <= 1}
                aria-label="Next listing"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)] disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedListing(null)}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-border)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Photo / gradient hero */}
          <div className="relative mx-3 h-40 overflow-hidden rounded-xl">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={selectedListing.title}
                fill
                className="object-cover"
                sizes="320px"
                unoptimized
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-indigo-100 via-violet-50 to-purple-100" />
            )}

            {/* Score + verified badges on photo */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
              {selectedListing.qualityScore !== undefined && selectedListing.qualityScore > 0 && (
                <ScoreBadge score={selectedListing.qualityScore} />
              )}
              {selectedListing.isVerified && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star className="h-2.5 w-2.5" />
                  Verified
                </span>
              )}
            </div>

            {/* Image count */}
            {selectedListing.images.length > 1 && (
              <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                {selectedListing.images.length} photos
              </span>
            )}
          </div>

          {/* Content */}
          <div className="px-3 pb-3 pt-2.5">
            {/* Location + recency */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                {selectedListing.locality}, {selectedListing.city}
              </p>
              {recency && (
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-emerald-600">
                  <Clock className="h-2.5 w-2.5" />
                  {recency}
                </span>
              )}
            </div>

            {/* Price row */}
            <div className="mt-0.5 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[var(--color-foreground)]">
                {formatPrice(selectedListing.price)}
              </p>
              {pricePerSqft && (
                <PriceSqft price={selectedListing.price} area={selectedListing.builtUpArea} />
              )}
            </div>

            {/* Title */}
            <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[var(--color-foreground)]">
              {selectedListing.title}
            </p>

            {/* Key specs grid */}
            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {/* BHK */}
              <div className="flex flex-col items-center rounded-lg bg-[var(--color-muted)] px-2 py-1.5">
                <BedDouble className="mb-0.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {selectedListing.bhkType ? formatBHK(selectedListing.bhkType) : '—'}
                </span>
              </div>

              {/* Area */}
              <div className="flex flex-col items-center rounded-lg bg-[var(--color-muted)] px-2 py-1.5">
                <Building2 className="mb-0.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {selectedListing.builtUpArea.toLocaleString('en-IN')} ft²
                </span>
              </div>

              {/* Floor */}
              <div className="flex flex-col items-center rounded-lg bg-[var(--color-muted)] px-2 py-1.5">
                <span className="mb-0.5 text-[10px] font-bold text-[var(--color-muted-foreground)]">
                  FL
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {selectedListing.floor !== null
                    ? `${selectedListing.floor}${selectedListing.totalFloors ? `/${selectedListing.totalFloors}` : ''}`
                    : '—'}
                </span>
              </div>

              {/* Bathrooms */}
              <div className="flex flex-col items-center rounded-lg bg-[var(--color-muted)] px-2 py-1.5">
                <Bath className="mb-0.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {selectedListing.bathrooms} Bath
                </span>
              </div>

              {/* Furnishing */}
              <div className="flex flex-col items-center rounded-lg bg-[var(--color-muted)] px-2 py-1.5">
                <Sofa className="mb-0.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {selectedListing.furnishing
                    ? formatFurnishing(selectedListing.furnishing).split(' ')[0]
                    : '—'}
                </span>
              </div>

              {/* Parking */}
              <div className="flex flex-col items-center rounded-lg bg-[var(--color-muted)] px-2 py-1.5">
                <Car className="mb-0.5 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                <span className="text-[11px] font-semibold text-[var(--color-foreground)]">
                  {selectedListing.parking ? formatParking(selectedListing.parking) : '—'}
                </span>
              </div>
            </div>

            {/* Amenities */}
            {selectedListing.amenities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedListing.amenities.slice(0, 4).map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-muted-foreground)]"
                  >
                    {a}
                  </span>
                ))}
                {selectedListing.amenities.length > 4 && (
                  <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                    +{selectedListing.amenities.length - 4} more
                  </span>
                )}
              </div>
            )}

            {/* Society name + age of property */}
            {(selectedListing.societyName || ageLabel) && (
              <div className="mt-1.5 flex items-center justify-between gap-2">
                {selectedListing.societyName ? (
                  <p className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {selectedListing.societyName}
                  </p>
                ) : (
                  <span />
                )}
                {ageLabel && (
                  <span className="shrink-0 text-[10px] font-medium text-[var(--color-muted-foreground)]">
                    {ageLabel}
                  </span>
                )}
              </div>
            )}

            {/* CTA */}
            <Link
              href={`/listing/${selectedListing.id}`}
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View full listing
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
