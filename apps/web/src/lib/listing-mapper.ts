import type { MockListing } from '@/lib/mock-data'
import type { Database } from '@/lib/supabase/database.types'

export type SupabaseListingRow = Database['public']['Tables']['listings']['Row']

// Partial rows from SELECT with column subsets are cast to the full row type.
// The mapper handles all nullable/undefined fields with ?? fallbacks.
export function mapSupabaseListingToMock(
  row: SupabaseListingRow | Partial<SupabaseListingRow>,
): MockListing {
  const imageUrls: string[] = Array.isArray(row.image_urls) ? row.image_urls : []

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
  }
}
