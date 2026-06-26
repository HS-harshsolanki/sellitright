export type BHKType = 'ONE_BHK' | 'TWO_BHK' | 'THREE_BHK' | 'FOUR_BHK' | 'FIVE_PLUS_BHK'

export type PropertyType = 'APARTMENT' | 'VILLA' | 'PLOT' | 'INDEPENDENT_HOUSE' | 'PENTHOUSE'

export type Facing =
  | 'NORTH'
  | 'SOUTH'
  | 'EAST'
  | 'WEST'
  | 'NORTH_EAST'
  | 'NORTH_WEST'
  | 'SOUTH_EAST'
  | 'SOUTH_WEST'

export type Furnishing = 'FURNISHED' | 'SEMI_FURNISHED' | 'UNFURNISHED'

export type Parking = 'COVERED' | 'OPEN' | 'BOTH' | 'NONE'

export type ListingStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SOLD'
  | 'INACTIVE'
  | 'PENDING_REVIEW'
  | 'REJECTED'
  | 'DELETED'

export interface MockSeller {
  id: string
  name: string
  phone: string
  avatarUrl: string | null
  isVerified: boolean
}

export interface MockListingImage {
  id: string
  url: string
  caption: string | null
  order: number
}

export interface MockListing {
  id: string
  title: string
  description: string
  price: number
  propertyType: PropertyType
  bhkType: BHKType
  builtUpArea: number
  carpetArea: number | null
  floor: number | null
  totalFloors: number | null
  facing: Facing | null
  furnishing: Furnishing
  ageOfProperty: number | null
  bathrooms: number
  balconies: number | null
  parking: Parking | null
  address: string
  city: string
  locality: string
  state: string
  pincode: string
  latitude: number | null
  longitude: number | null
  amenities: string[]
  status: ListingStatus
  rejectionReason: string | null
  isVerified: boolean
  viewCount: number
  seller: MockSeller
  images: MockListingImage[]
  createdAt: string
}

export const MOCK_LISTINGS: MockListing[] = [
  {
    id: 'listing-001',
    title: '3 BHK Apartment in Koramangala',
    description:
      'Spacious and well-maintained 3 BHK apartment in the heart of Koramangala. The apartment features a modern open kitchen, large living room with ample natural light, and a private balcony with a garden view. Located in a gated community with 24/7 security. Walking distance to restaurants, cafes, and tech parks. Ideal for families or working professionals looking for a premium lifestyle.',
    price: 12500000,
    propertyType: 'APARTMENT',
    bhkType: 'THREE_BHK',
    builtUpArea: 1450,
    carpetArea: 1200,
    floor: 7,
    totalFloors: 14,
    facing: 'EAST',
    furnishing: 'SEMI_FURNISHED',
    ageOfProperty: 3,
    bathrooms: 3,
    balconies: 2,
    parking: 'COVERED',
    address: 'Brigade Cosmopolis, 5th Cross, 7th Block, Koramangala',
    city: 'Bengaluru',
    locality: 'Koramangala',
    state: 'Karnataka',
    pincode: '560095',
    latitude: 12.9352,
    longitude: 77.6245,
    amenities: [
      'Swimming Pool',
      'Gym',
      'Clubhouse',
      'Children Play Area',
      '24/7 Security',
      'Power Backup',
      'Lift',
      'Visitor Parking',
      'CCTV',
      'Intercom',
      'Jogging Track',
      'Landscaped Garden',
    ],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: true,
    viewCount: 284,
    seller: {
      id: 'user-001',
      name: 'Rajesh Kumar',
      phone: '+919876543210',
      avatarUrl: null,
      isVerified: true,
    },
    images: [
      {
        id: 'img-001',
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
        caption: 'Living Room',
        order: 0,
      },
      {
        id: 'img-002',
        url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
        caption: 'Kitchen',
        order: 1,
      },
      {
        id: 'img-003',
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
        caption: 'Master Bedroom',
        order: 2,
      },
      {
        id: 'img-004',
        url: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80',
        caption: 'Bathroom',
        order: 3,
      },
      {
        id: 'img-005',
        url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
        caption: 'Building Exterior',
        order: 4,
      },
    ],
    createdAt: '2024-11-15T10:30:00Z',
  },
  {
    id: 'listing-002',
    title: '2 BHK Apartment in HSR Layout',
    description:
      'Well-maintained 2 BHK apartment in HSR Layout Sector 2. The apartment is located on a high floor with excellent ventilation. Kitchen comes with modular fittings. Society has good amenities and is in close proximity to schools and hospitals.',
    price: 7800000,
    propertyType: 'APARTMENT',
    bhkType: 'TWO_BHK',
    builtUpArea: 1050,
    carpetArea: 870,
    floor: 5,
    totalFloors: 10,
    facing: 'NORTH',
    furnishing: 'UNFURNISHED',
    ageOfProperty: 5,
    bathrooms: 2,
    balconies: 1,
    parking: 'COVERED',
    address: 'Salarpuria Serenity, Sector 2, HSR Layout',
    city: 'Bengaluru',
    locality: 'HSR Layout',
    state: 'Karnataka',
    pincode: '560102',
    latitude: 12.9116,
    longitude: 77.6474,
    amenities: [
      'Gym',
      'Swimming Pool',
      '24/7 Security',
      'Power Backup',
      'Lift',
      'CCTV',
      'Children Play Area',
    ],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: false,
    viewCount: 142,
    seller: {
      id: 'user-002',
      name: 'Priya Sharma',
      phone: '+919845678901',
      avatarUrl: null,
      isVerified: false,
    },
    images: [
      {
        id: 'img-006',
        url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=80',
        caption: 'Living Room',
        order: 0,
      },
      {
        id: 'img-007',
        url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
        caption: 'Kitchen',
        order: 1,
      },
      {
        id: 'img-008',
        url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80',
        caption: 'Bedroom',
        order: 2,
      },
    ],
    createdAt: '2024-11-20T14:00:00Z',
  },
  {
    id: 'listing-003',
    title: '4 BHK Villa in Whitefield',
    description:
      'Stunning 4 BHK independent villa in a premium gated community in Whitefield. Features a private garden, double-height living room, modular kitchen, and a rooftop terrace. Perfect for a large family seeking privacy and luxury.',
    price: 32000000,
    propertyType: 'VILLA',
    bhkType: 'FOUR_BHK',
    builtUpArea: 3200,
    carpetArea: 2800,
    floor: 1,
    totalFloors: 2,
    facing: 'NORTH_EAST',
    furnishing: 'FURNISHED',
    ageOfProperty: 2,
    bathrooms: 4,
    balconies: 3,
    parking: 'BOTH',
    address: 'Prestige Shantiniketan, ITPL Main Road, Whitefield',
    city: 'Bengaluru',
    locality: 'Whitefield',
    state: 'Karnataka',
    pincode: '560066',
    latitude: 12.9698,
    longitude: 77.7499,
    amenities: [
      'Private Garden',
      'Swimming Pool',
      'Gym',
      'Clubhouse',
      '24/7 Security',
      'Power Backup',
      'Home Automation',
      'Servant Quarters',
      'Visitor Parking',
      'CCTV',
      'Intercom',
      'Rainwater Harvesting',
    ],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: true,
    viewCount: 521,
    seller: {
      id: 'user-003',
      name: 'Arjun Mehta',
      phone: '+919900112233',
      avatarUrl: null,
      isVerified: true,
    },
    images: [
      {
        id: 'img-009',
        url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
        caption: 'Front View',
        order: 0,
      },
      {
        id: 'img-010',
        url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
        caption: 'Living Room',
        order: 1,
      },
      {
        id: 'img-011',
        url: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1200&q=80',
        caption: 'Kitchen',
        order: 2,
      },
    ],
    createdAt: '2024-10-05T09:00:00Z',
  },
  {
    id: 'listing-004',
    title: '2 BHK in Andheri West',
    description:
      'Modern 2 BHK apartment in Andheri West, close to metro station and DN Nagar. Well-connected to Western Express Highway. Society has excellent amenities.',
    price: 15000000,
    propertyType: 'APARTMENT',
    bhkType: 'TWO_BHK',
    builtUpArea: 950,
    carpetArea: 780,
    floor: 12,
    totalFloors: 22,
    facing: 'WEST',
    furnishing: 'FURNISHED',
    ageOfProperty: 4,
    bathrooms: 2,
    balconies: 1,
    parking: 'COVERED',
    address: 'Oberoi Splendor, JP Road, Andheri West',
    city: 'Mumbai',
    locality: 'Andheri West',
    state: 'Maharashtra',
    pincode: '400053',
    latitude: 19.1364,
    longitude: 72.8296,
    amenities: [
      'Swimming Pool',
      'Gym',
      'Clubhouse',
      '24/7 Security',
      'Power Backup',
      'Lift',
      'CCTV',
      'Jogging Track',
    ],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: true,
    viewCount: 456,
    seller: {
      id: 'user-004',
      name: 'Sneha Patil',
      phone: '+919822334455',
      avatarUrl: null,
      isVerified: true,
    },
    images: [
      {
        id: 'img-012',
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
        caption: 'Living Room',
        order: 0,
      },
      {
        id: 'img-013',
        url: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200&q=80',
        caption: 'Bedroom',
        order: 1,
      },
      {
        id: 'img-014',
        url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
        caption: 'Kitchen',
        order: 2,
      },
    ],
    createdAt: '2024-12-01T08:00:00Z',
  },
  {
    id: 'listing-005',
    title: '3 BHK in Baner, Pune',
    description:
      'Premium 3 BHK in a gated township in Baner. East-facing with panoramic hills view. Modular kitchen, Italian marble flooring, and premium fittings throughout.',
    price: 9500000,
    propertyType: 'APARTMENT',
    bhkType: 'THREE_BHK',
    builtUpArea: 1350,
    carpetArea: 1100,
    floor: 9,
    totalFloors: 16,
    facing: 'EAST',
    furnishing: 'SEMI_FURNISHED',
    ageOfProperty: 2,
    bathrooms: 2,
    balconies: 2,
    parking: 'COVERED',
    address: 'Blue Ridge Township, Baner-Hinjewadi Road',
    city: 'Pune',
    locality: 'Baner',
    state: 'Maharashtra',
    pincode: '411045',
    latitude: 18.5596,
    longitude: 73.7786,
    amenities: [
      'Swimming Pool',
      'Gym',
      'Clubhouse',
      'Children Play Area',
      '24/7 Security',
      'Power Backup',
      'Lift',
      'Garden',
      'Jogging Track',
      'Indoor Games',
    ],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: true,
    viewCount: 312,
    seller: {
      id: 'user-005',
      name: 'Vikram Joshi',
      phone: '+919881122334',
      avatarUrl: null,
      isVerified: true,
    },
    images: [
      {
        id: 'img-015',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
        caption: 'Living Room',
        order: 0,
      },
      {
        id: 'img-016',
        url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
        caption: 'Bedroom',
        order: 1,
      },
      {
        id: 'img-017',
        url: 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=1200&q=80',
        caption: 'View from Balcony',
        order: 2,
      },
      {
        id: 'img-018',
        url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
        caption: 'Kitchen',
        order: 3,
      },
    ],
    createdAt: '2024-11-28T11:00:00Z',
  },
  {
    id: 'listing-006',
    title: '1 BHK in Powai',
    description:
      'Compact and well-designed 1 BHK in Powai Lake view complex. Perfect for young professionals or couples. Close to Hiranandani Gardens and IIT Bombay.',
    price: 9800000,
    propertyType: 'APARTMENT',
    bhkType: 'ONE_BHK',
    builtUpArea: 650,
    carpetArea: 520,
    floor: 18,
    totalFloors: 30,
    facing: 'NORTH',
    furnishing: 'FURNISHED',
    ageOfProperty: 1,
    bathrooms: 1,
    balconies: 1,
    parking: 'COVERED',
    address: 'Hiranandani Rodas Enclave, Powai',
    city: 'Mumbai',
    locality: 'Powai',
    state: 'Maharashtra',
    pincode: '400076',
    latitude: 19.1176,
    longitude: 72.906,
    amenities: [
      'Swimming Pool',
      'Gym',
      '24/7 Security',
      'Power Backup',
      'Lift',
      'CCTV',
      'Landscaped Garden',
    ],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: false,
    viewCount: 189,
    seller: {
      id: 'user-006',
      name: 'Aditya Rao',
      phone: '+919900556677',
      avatarUrl: null,
      isVerified: false,
    },
    images: [
      {
        id: 'img-019',
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
        caption: 'Living Area',
        order: 0,
      },
      {
        id: 'img-020',
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
        caption: 'Bedroom',
        order: 1,
      },
      {
        id: 'img-021',
        url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
        caption: 'Kitchen',
        order: 2,
      },
    ],
    createdAt: '2024-12-05T15:30:00Z',
  },
  {
    id: 'listing-007',
    title: '5 BHK Penthouse in Worli',
    description:
      'Ultra-luxury penthouse with sea view in Worli. Spanning two floors with private terrace, home theater, and designer interiors. One of the finest addresses in Mumbai.',
    price: 250000000,
    propertyType: 'PENTHOUSE',
    bhkType: 'FIVE_PLUS_BHK',
    builtUpArea: 5500,
    carpetArea: 4800,
    floor: 45,
    totalFloors: 46,
    facing: 'SOUTH_WEST',
    furnishing: 'FURNISHED',
    ageOfProperty: 1,
    bathrooms: 6,
    balconies: 4,
    parking: 'BOTH',
    address: 'Lodha World One, Worli',
    city: 'Mumbai',
    locality: 'Worli',
    state: 'Maharashtra',
    pincode: '400018',
    latitude: 19.0096,
    longitude: 72.8179,
    amenities: [
      'Private Pool',
      'Home Theater',
      'Smart Home',
      'Private Lift',
      'Terrace Garden',
      'Concierge',
      '24/7 Security',
      'Valet Parking',
      'Spa',
      'Wine Cellar',
    ],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: true,
    viewCount: 892,
    seller: {
      id: 'user-007',
      name: 'Rahul Ambani',
      phone: '+919876001122',
      avatarUrl: null,
      isVerified: true,
    },
    images: [
      {
        id: 'img-022',
        url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
        caption: 'Living Room',
        order: 0,
      },
      {
        id: 'img-023',
        url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
        caption: 'Exterior',
        order: 1,
      },
      {
        id: 'img-024',
        url: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1200&q=80',
        caption: 'Kitchen',
        order: 2,
      },
      {
        id: 'img-025',
        url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
        caption: 'View',
        order: 3,
      },
    ],
    createdAt: '2024-09-20T09:00:00Z',
  },
  {
    id: 'listing-008',
    title: '3 BHK Independent House in Indiranagar',
    description:
      'Beautiful independent house in the heart of Indiranagar. Private garden, car parking, and modern interiors. Walking distance to 100 Feet Road restaurants and boutiques.',
    price: 45000000,
    propertyType: 'INDEPENDENT_HOUSE',
    bhkType: 'THREE_BHK',
    builtUpArea: 2200,
    carpetArea: 1900,
    floor: 1,
    totalFloors: 2,
    facing: 'SOUTH',
    furnishing: 'SEMI_FURNISHED',
    ageOfProperty: 8,
    bathrooms: 3,
    balconies: 2,
    parking: 'OPEN',
    address: '12th Main, HAL 2nd Stage, Indiranagar',
    city: 'Bengaluru',
    locality: 'Indiranagar',
    state: 'Karnataka',
    pincode: '560038',
    latitude: 12.9784,
    longitude: 77.6408,
    amenities: ['Private Garden', 'Car Parking', 'Terrace', 'Borewell', 'Solar Panels'],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: true,
    viewCount: 634,
    seller: {
      id: 'user-008',
      name: 'Karthik Nair',
      phone: '+919845112233',
      avatarUrl: null,
      isVerified: true,
    },
    images: [
      {
        id: 'img-026',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
        caption: 'Front View',
        order: 0,
      },
      {
        id: 'img-027',
        url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
        caption: 'Garden',
        order: 1,
      },
      {
        id: 'img-028',
        url: 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=1200&q=80',
        caption: 'Living Room',
        order: 2,
      },
    ],
    createdAt: '2024-11-10T07:30:00Z',
  },
  {
    id: 'listing-009',
    title: '2 BHK in Hinjewadi Phase 2',
    description:
      'Affordable 2 BHK near IT parks in Hinjewadi Phase 2. Ideal for working professionals. Good connectivity to Mumbai-Pune Expressway.',
    price: 5200000,
    propertyType: 'APARTMENT',
    bhkType: 'TWO_BHK',
    builtUpArea: 900,
    carpetArea: 720,
    floor: 3,
    totalFloors: 7,
    facing: 'NORTH_EAST',
    furnishing: 'UNFURNISHED',
    ageOfProperty: 6,
    bathrooms: 2,
    balconies: 1,
    parking: 'OPEN',
    address: 'Megapolis, Hinjewadi Phase 2',
    city: 'Pune',
    locality: 'Hinjewadi',
    state: 'Maharashtra',
    pincode: '411057',
    latitude: 18.5912,
    longitude: 73.738,
    amenities: ['Gym', '24/7 Security', 'Power Backup', 'Lift', 'Children Play Area'],
    status: 'ACTIVE',
    rejectionReason: null,
    isVerified: false,
    viewCount: 98,
    seller: {
      id: 'user-009',
      name: 'Manoj Deshmukh',
      phone: '+919823445566',
      avatarUrl: null,
      isVerified: false,
    },
    images: [
      {
        id: 'img-029',
        url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=80',
        caption: 'Living Room',
        order: 0,
      },
      {
        id: 'img-030',
        url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80',
        caption: 'Bedroom',
        order: 1,
      },
      {
        id: 'img-031',
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
        caption: 'Hall',
        order: 2,
      },
    ],
    createdAt: '2024-12-08T16:00:00Z',
  },
  {
    id: 'listing-010',
    title: '2 BHK Apartment in Sarjapur Road',
    description:
      'Newly constructed 2 BHK in a premium society near Sarjapur Road. Close to major IT parks. Modern fittings, large balcony with green view. Ready to move in.',
    price: 6800000,
    propertyType: 'APARTMENT',
    bhkType: 'TWO_BHK',
    builtUpArea: 1050,
    carpetArea: 860,
    floor: 4,
    totalFloors: 12,
    facing: 'EAST',
    furnishing: 'SEMI_FURNISHED',
    ageOfProperty: 0,
    bathrooms: 2,
    balconies: 1,
    parking: 'COVERED',
    address: 'Prestige Ferns Residency, Sarjapur Road',
    city: 'Bengaluru',
    locality: 'Sarjapur Road',
    state: 'Karnataka',
    pincode: '560035',
    latitude: 12.8972,
    longitude: 77.6789,
    amenities: [
      'Gym',
      'Swimming Pool',
      '24/7 Security',
      'Power Backup',
      'Lift',
      'Children Play Area',
    ],
    status: 'PENDING_REVIEW',
    rejectionReason: null,
    isVerified: false,
    viewCount: 0,
    seller: {
      id: 'user-010',
      name: 'Nisha Reddy',
      phone: '+919876123456',
      avatarUrl: null,
      isVerified: false,
    },
    images: [
      {
        id: 'img-032',
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
        caption: 'Living Room',
        order: 0,
      },
      {
        id: 'img-033',
        url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80',
        caption: 'Kitchen',
        order: 1,
      },
    ],
    createdAt: '2025-01-10T09:00:00Z',
  },
  {
    id: 'listing-011',
    title: '3 BHK Independent House in Banjara Hills',
    description:
      'Spacious 3 BHK independent house in the upscale Banjara Hills locality. Private terrace, car porch, and landscaped garden. Excellent connectivity to HITEC City.',
    price: 28000000,
    propertyType: 'INDEPENDENT_HOUSE',
    bhkType: 'THREE_BHK',
    builtUpArea: 2400,
    carpetArea: 2000,
    floor: 1,
    totalFloors: 2,
    facing: 'NORTH',
    furnishing: 'UNFURNISHED',
    ageOfProperty: 10,
    bathrooms: 3,
    balconies: 2,
    parking: 'OPEN',
    address: 'Road No 12, Banjara Hills',
    city: 'Hyderabad',
    locality: 'Banjara Hills',
    state: 'Telangana',
    pincode: '500034',
    latitude: 17.4126,
    longitude: 78.4481,
    amenities: ['Private Garden', 'Car Parking', 'Terrace', 'Solar Panels'],
    status: 'PENDING_REVIEW',
    rejectionReason: null,
    isVerified: false,
    viewCount: 0,
    seller: {
      id: 'user-011',
      name: 'Suresh Babu',
      phone: '+919912334455',
      avatarUrl: null,
      isVerified: false,
    },
    images: [
      {
        id: 'img-034',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
        caption: 'Front View',
        order: 0,
      },
      {
        id: 'img-035',
        url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
        caption: 'Garden',
        order: 1,
      },
    ],
    createdAt: '2025-01-12T11:30:00Z',
  },
  {
    id: 'listing-012',
    title: '1 BHK Studio in Electronic City',
    description:
      'Compact studio apartment near Electronic City Phase 1. Very close to infosys campus. Ideal for a single working professional. Society is well-maintained.',
    price: 3200000,
    propertyType: 'APARTMENT',
    bhkType: 'ONE_BHK',
    builtUpArea: 550,
    carpetArea: 440,
    floor: 6,
    totalFloors: 10,
    facing: 'WEST',
    furnishing: 'FURNISHED',
    ageOfProperty: 7,
    bathrooms: 1,
    balconies: 0,
    parking: 'NONE',
    address: 'Electronic City Phase 1, Bengaluru',
    city: 'Bengaluru',
    locality: 'Electronic City',
    state: 'Karnataka',
    pincode: '560100',
    latitude: 12.8399,
    longitude: 77.677,
    amenities: ['Gym', '24/7 Security', 'Lift', 'Power Backup'],
    status: 'REJECTED',
    rejectionReason:
      'Images are blurry and do not meet quality standards. Please re-upload clear photos.',
    isVerified: false,
    viewCount: 0,
    seller: {
      id: 'user-012',
      name: 'Kavya Singh',
      phone: '+919856789012',
      avatarUrl: null,
      isVerified: false,
    },
    images: [
      {
        id: 'img-036',
        url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&q=80',
        caption: 'Room',
        order: 0,
      },
    ],
    createdAt: '2025-01-08T14:00:00Z',
  },
]

export function getListingById(id: string): MockListing | undefined {
  return MOCK_LISTINGS.find((l) => l.id === id)
}
