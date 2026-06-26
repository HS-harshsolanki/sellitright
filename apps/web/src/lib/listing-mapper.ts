import type { MockListing } from '@/lib/mock-data'

/**
 * Maps a Supabase listings row (snake_case, flat image_urls array)
 * to the MockListing shape used throughout the UI.
 *
 * The `seller` block is synthetic — Supabase auth.users is not joined here.
 * We fill in what we can from the row; phone/name come from a separate profile
 * table if available, otherwise defaults are used.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSupabaseListingToMock(row: Record<string, any>): MockListing {
  const imageUrls: string[] = Array.isArray(row.image_urls) ? row.image_urls : []

  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    price: Number(row.price),
    propertyType: row.property_type as MockListing['propertyType'],
    bhkType: row.bhk_type as MockListing['bhkType'],
    builtUpArea: row.built_up_area as number,
    carpetArea: row.carpet_area as number | null,
    floor: row.floor as number | null,
    totalFloors: row.total_floors as number | null,
    facing: (row.facing as MockListing['facing']) ?? null,
    furnishing: row.furnishing as MockListing['furnishing'],
    ageOfProperty: row.age_of_property as number | null,
    bathrooms: row.bathrooms as number,
    balconies: row.balconies as number | null,
    parking: (row.parking as MockListing['parking']) ?? null,
    address: row.address as string,
    city: row.city as string,
    locality: row.locality as string,
    state: row.state as string,
    pincode: row.pincode as string,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    status: row.status as MockListing['status'],
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    isVerified: Boolean(row.is_verified),
    viewCount: Number(row.view_count ?? 0),
    seller: {
      id: row.seller_id as string,
      name: (row.seller_name as string | null) ?? 'Owner',
      phone: (row.seller_phone as string | null) ?? '',
      avatarUrl: (row.seller_avatar as string | null) ?? null,
      isVerified: Boolean(row.seller_verified ?? false),
    },
    images: imageUrls.map((url, index) => ({
      id: `${row.id}-img-${index}`,
      url,
      caption: null,
      order: index,
    })),
    createdAt: row.created_at as string,
  }
}
