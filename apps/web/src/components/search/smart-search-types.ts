// Types shared across all SmartSearchBar segments and the API route.

export type BHKType = '1 BHK' | '2 BHK' | '3 BHK' | '4 BHK' | '5+ BHK'
export type PropertyType = 'Apartment' | 'Penthouse'
export type Furnishing = 'Furnished' | 'Semi-Furnished' | 'Unfurnished'

export interface BudgetRange {
  min: number | null
  max: number | null
  label: string
}

export const BUDGET_PRESETS: BudgetRange[] = [
  { label: 'Under ₹75L', min: null, max: 7_500_000 },
  { label: '₹75L – ₹1.5Cr', min: 7_500_000, max: 15_000_000 },
  { label: '₹1.5Cr – ₹3Cr', min: 15_000_000, max: 30_000_000 },
  { label: '₹3Cr+', min: 30_000_000, max: null },
]

export const SUPPORTED_CITIES = ['Mumbai', 'Bangalore', 'Pune']

export const BHK_OPTIONS: BHKType[] = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK']
export const PROPERTY_TYPE_OPTIONS: PropertyType[] = ['Apartment', 'Penthouse']
export const FURNISHING_OPTIONS: Furnishing[] = ['Furnished', 'Semi-Furnished', 'Unfurnished']

// The canonical state object for a SmartSearchBar session.
export interface SmartSearchState {
  city: string | null
  locality: string | null
  bhkTypes: BHKType[]
  propertyType: PropertyType | null
  furnishing: Furnishing | null
  budget: BudgetRange | null
  /** NL text the user typed in the AI segment */
  aiQuery: string
  /** Whether AI filled the other fields (shows sparkle badges) */
  aiFilledFields: boolean
}

export const EMPTY_SMART_SEARCH_STATE: SmartSearchState = {
  city: null,
  locality: null,
  bhkTypes: [],
  propertyType: null,
  furnishing: null,
  budget: null,
  aiQuery: '',
  aiFilledFields: false,
}

export type SmartSearchSegment = 'where' | 'what' | 'budget' | 'ai'

// Response from the /api/search/ai-parse route
export interface AiParseResponse {
  city: string | null
  locality: string | null
  bhkTypes: BHKType[]
  propertyType: PropertyType | null
  budgetMin: number | null
  budgetMax: number | null
  explanation: string
}
