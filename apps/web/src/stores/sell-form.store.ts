import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MockListing } from '@/lib/mock-data'

export type PropertyType = 'APARTMENT' | 'VILLA' | 'INDEPENDENT_HOUSE' | 'PLOT' | 'PENTHOUSE'
export type BHKType = 'ONE_BHK' | 'TWO_BHK' | 'THREE_BHK' | 'FOUR_BHK' | 'FIVE_PLUS_BHK'
export type Furnishing = 'FURNISHED' | 'SEMI_FURNISHED' | 'UNFURNISHED'
export type Parking = 'COVERED' | 'OPEN' | 'BOTH' | 'NONE'
export type Facing =
  | 'NORTH'
  | 'SOUTH'
  | 'EAST'
  | 'WEST'
  | 'NORTH_EAST'
  | 'NORTH_WEST'
  | 'SOUTH_EAST'
  | 'SOUTH_WEST'

export interface LocationData {
  city: string
  state: string
  locality: string
  address: string
  pincode: string
}

export interface DetailsData {
  bhkType: BHKType | null
  builtUpArea: string
  carpetArea: string
  floor: string
  totalFloors: string
  facing: Facing | null
  furnishing: Furnishing | null
  bathrooms: number
  balconies: number
  parking: Parking | null
  ageOfProperty: string
  amenities: string[]
}

export interface PricingData {
  price: string
  negotiable: boolean
  title: string
  description: string
}

export type SellStep = 'property-type' | 'location' | 'details' | 'photos' | 'pricing' | 'review'

export const SELL_STEPS: SellStep[] = [
  'property-type',
  'location',
  'details',
  'photos',
  'pricing',
  'review',
]

export const STEP_LABELS: Record<SellStep, string> = {
  'property-type': 'What type?',
  location: 'Where is it?',
  details: 'Tell us more',
  photos: 'Add photos',
  pricing: 'Set your price',
  review: 'Review & publish',
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SellFormState {
  currentStep: SellStep
  propertyType: PropertyType | null
  location: LocationData
  details: DetailsData
  /** Array of image URLs (strings). Serializable — safe for zustand/persist. */
  photos: string[]
  pricing: PricingData

  /** Supabase listing id once a draft has been saved server-side */
  draftId: string | null
  /** Last autosave status — shown in the UI */
  saveStatus: SaveStatus

  // Actions
  setStep: (step: SellStep) => void
  goToStep: (index: number) => void
  nextStep: () => void
  prevStep: () => void
  setPropertyType: (type: PropertyType) => void
  setLocation: (data: Partial<LocationData>) => void
  setDetails: (data: Partial<DetailsData>) => void
  setPhotos: (photos: string[]) => void
  setPricing: (data: Partial<PricingData>) => void
  setDraftId: (id: string) => void
  setSaveStatus: (status: SaveStatus) => void
  reset: () => void
  hydrateFromListing: (listing: MockListing) => void
}

const DEFAULT_LOCATION: LocationData = {
  city: '',
  state: '',
  locality: '',
  address: '',
  pincode: '',
}

const DEFAULT_DETAILS: DetailsData = {
  bhkType: null,
  builtUpArea: '',
  carpetArea: '',
  floor: '',
  totalFloors: '',
  facing: null,
  furnishing: null,
  bathrooms: 2,
  balconies: 1,
  parking: null,
  ageOfProperty: '',
  amenities: [],
}

const DEFAULT_PRICING: PricingData = {
  price: '',
  negotiable: false,
  title: '',
  description: '',
}

export const useSellFormStore = create<SellFormState>()(
  persist(
    (set, get) => ({
      currentStep: 'property-type',
      propertyType: null,
      location: DEFAULT_LOCATION,
      details: DEFAULT_DETAILS,
      photos: [],
      pricing: DEFAULT_PRICING,
      draftId: null,
      saveStatus: 'idle',

      setStep: (step) => set({ currentStep: step }),

      goToStep: (index) => {
        const step = SELL_STEPS[index]
        if (step) set({ currentStep: step })
      },

      nextStep: () => {
        const { currentStep } = get()
        const idx = SELL_STEPS.indexOf(currentStep)
        const next = SELL_STEPS[idx + 1]
        if (idx < SELL_STEPS.length - 1 && next) {
          set({ currentStep: next })
        }
      },

      prevStep: () => {
        const { currentStep } = get()
        const idx = SELL_STEPS.indexOf(currentStep)
        const prev = SELL_STEPS[idx - 1]
        if (idx > 0 && prev) {
          set({ currentStep: prev })
        }
      },

      setPropertyType: (type) => set({ propertyType: type }),

      setLocation: (data) => set((state) => ({ location: { ...state.location, ...data } })),

      setDetails: (data) => set((state) => ({ details: { ...state.details, ...data } })),

      setPhotos: (photos) => set({ photos }),

      setPricing: (data) => set((state) => ({ pricing: { ...state.pricing, ...data } })),

      setDraftId: (id) => set({ draftId: id }),

      setSaveStatus: (status) => set({ saveStatus: status }),

      reset: () =>
        set({
          currentStep: 'property-type',
          propertyType: null,
          location: DEFAULT_LOCATION,
          details: DEFAULT_DETAILS,
          photos: [],
          pricing: DEFAULT_PRICING,
          draftId: null,
          saveStatus: 'idle',
        }),

      hydrateFromListing: (listing) =>
        set({
          currentStep: 'property-type',
          draftId: listing.id,
          propertyType: listing.propertyType,
          location: {
            city: listing.city,
            state: listing.state,
            locality: listing.locality,
            address: listing.address,
            pincode: listing.pincode,
          },
          details: {
            bhkType: listing.bhkType,
            builtUpArea: String(listing.builtUpArea),
            carpetArea: listing.carpetArea !== null ? String(listing.carpetArea) : '',
            floor: listing.floor !== null ? String(listing.floor) : '',
            totalFloors: listing.totalFloors !== null ? String(listing.totalFloors) : '',
            facing: listing.facing,
            furnishing: listing.furnishing,
            bathrooms: listing.bathrooms,
            balconies: listing.balconies ?? 0,
            parking: listing.parking,
            ageOfProperty: listing.ageOfProperty !== null ? String(listing.ageOfProperty) : '',
            amenities: listing.amenities,
          },
          photos: listing.images.map((img) => img.url),
          pricing: {
            price: listing.price.toLocaleString('en-IN'),
            title: listing.title,
            description: listing.description,
            negotiable: false,
          },
          saveStatus: 'idle',
        }),
    }),
    {
      name: 'sell-form-draft',
      // All fields are now serializable — photos are plain URL strings.
      partialize: (state) => ({
        currentStep: state.currentStep,
        propertyType: state.propertyType,
        location: state.location,
        details: state.details,
        photos: state.photos,
        pricing: state.pricing,
        draftId: state.draftId,
      }),
    },
  ),
)
