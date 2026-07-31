import { computeQualityScore } from '@/lib/quality-score'
import type { MockListing } from '@/lib/mock-data'
import type { Database } from '@/lib/supabase/database.types'

export type SupabaseListingRow = Database['public']['Tables']['listings']['Row']

// Partial rows from SELECT with column subsets are cast to the full row type.
// The mapper handles all nullable/undefined fields with ?? fallbacks.
export function mapSupabaseListingToMock(
  row: SupabaseListingRow | Partial<SupabaseListingRow>,
): MockListing {
  const imageUrls: string[] = Array.isArray(row.image_urls) ? row.image_urls : []

  // When the stored score is 0 (or absent), compute it on-the-fly from available fields
  // so listing cards always reflect the true quality rather than the un-scored default.
  let resolvedScore: number | undefined =
    typeof row.quality_score === 'number' && row.quality_score > 0 ? row.quality_score : undefined

  if (resolvedScore === undefined && row.property_type) {
    try {
      const result = computeQualityScore({
        propertyType: row.property_type ?? '',
        imageUrls,
        description: row.description ?? '',
        bhkType: row.bhk_type ?? null,
        builtUpArea: row.built_up_area ?? null,
        carpetArea: row.carpet_area ?? null,
        floor: row.floor ?? null,
        totalFloors: row.total_floors ?? null,
        facing: row.facing ?? null,
        furnishing: row.furnishing ?? null,
        bathrooms: row.bathrooms ?? null,
        balconies: row.balconies ?? null,
        parking: row.parking ?? null,
        ageOfProperty: row.age_of_property ?? null,
        amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
        price: Number(row.price ?? 0),
        locality: row.locality ?? '',
        city: row.city ?? '',
        address: row.address ?? null,
        pincode: row.pincode ?? null,
        isVerified: Boolean(row.is_verified),
      })
      resolvedScore = result.score
    } catch {
      // score unavailable — chip won't show
    }
  }

  return {
    id: row.id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    price: Number(row.price),
    propertyType: row.property_type as MockListing['propertyType'],
    bhkType: row.bhk_type as MockListing['bhkType'],
    builtUpArea: row.built_up_area ?? 0,
    carpetArea: row.carpet_area ?? null,
    floor: row.floor ?? null,
    totalFloors: row.total_floors ?? null,
    facing: (row.facing as MockListing['facing']) ?? null,
    furnishing: row.furnishing as MockListing['furnishing'],
    ageOfProperty: row.age_of_property ?? null,
    bathrooms: row.bathrooms ?? 0,
    balconies: row.balconies ?? null,
    parking: (row.parking as MockListing['parking']) ?? null,
    address: row.address ?? '',
    city: row.city ?? '',
    locality: row.locality ?? '',
    state: row.state ?? '',
    pincode: row.pincode ?? '',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    status: row.status as MockListing['status'],
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    isVerified: Boolean(row.is_verified),
    viewCount: Number(row.view_count ?? 0),
    seller: {
      id: row.seller_id ?? '',
      name: (row as unknown as { seller_name?: string | null }).seller_name ?? 'Owner',
      phone: (row as unknown as { seller_phone?: string | null }).seller_phone ?? '',
      avatarUrl: (row as unknown as { seller_avatar?: string | null }).seller_avatar ?? null,
      isVerified: Boolean(
        (row as unknown as { seller_verified?: boolean }).seller_verified ?? false,
      ),
    },
    images: imageUrls.map((url, index) => ({
      id: `${row.id}-img-${index}`,
      url,
      caption: null,
      order: index,
    })),
    createdAt: row.created_at ?? new Date().toISOString(),
    qualityScore: resolvedScore,
    qualityBreakdown: (row.quality_breakdown as Record<string, unknown> | null) ?? null,
  }
}
