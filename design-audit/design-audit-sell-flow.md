# Design Audit — ChapterNew Add-a-Property Sell Flow

**Date:** 2026-10-05  
**Branch:** feat/location-geocoding  
**Scope:** Full 6-step sell flow (property-type → location → details → photos → pricing → review)  
**Mode:** Source-code review (auth required for live rendering)

---

## Design System Baseline

**Font:** Satoshi (`--font-sans: var(--font-satoshi), ui-sans-serif, system-ui`) — intentional, not a generic stack. Grade A.

**Color palette:**
| Token | Value | Notes |
|---|---|---|
| primary | #222222 | Near-black — bold, editorial |
| accent | #e63500 | Orange-red — brand anchor |
| muted-foreground | #717171 | Secondary text |
| border | #dddddd | Light grey |

Palette is clean and minimal — only 8 core tokens. No dark mode. The `text-amber-600` and `bg-orange-50` used in a few places are raw Tailwind values not in the design system — minor inconsistency.

**Border radius:** Systematic scale (sm=8px, md=12px, lg=16px, xl=24px). Pill uses `rounded-full`. Consistent.

**Typography:** Satoshi renders at 2xl/3xl headings, sm body. No visible heading hierarchy violations. Line-heights not explicitly set — relies on Tailwind defaults.

**Motion:** Framer Motion for step transitions (0.3s ease-out), stagger on property type cards (0.07s each). Intentional, not ornamental. `prefers-reduced-motion` not respected in `pageVariants` — see FINDING-005.

---

## Phase 1: First Impression

**Site communicates:** A clean, minimal real-estate sell wizard. Airbnb-adjacent aesthetic.

**First 3 things the eye hits:**

1. Step indicator (numbered circles + labels at top) — good orientation
2. Big bold heading ("Tell us about your home.") — clear
3. Property type cards — Apartment + Penthouse — immediately actionable

**Gut verdict:** "Purposeful." The sell flow is focused and uncluttered. The visual density is appropriate for a form-heavy task. The Satoshi typeface gives it a premium feel above the typical real-estate CMS.

**Trunk test:** PARTIAL — step name not shown on mobile first step (just "Step 1 of 6"). Users need to know where they are.

---

## Design Score

| Category           | Grade | Notes                                                                                                   |
| ------------------ | ----- | ------------------------------------------------------------------------------------------------------- |
| Visual Hierarchy   | B     | Clear headings, good step indicator. Step 3 duplicates Step 1's heading.                                |
| Typography         | B     | Satoshi is intentional. No heading hierarchy violations. Counter font is `tabular-nums` ✓               |
| Spacing & Layout   | B     | 8px-based, consistent. Counter touch targets are 36px (< 44px min).                                     |
| Color & Contrast   | B     | Clean palette. Amber/orange used inconsistently with brand.                                             |
| Interaction States | B     | Good focus states throughout. Submit button correctly disabled.                                         |
| Responsive         | B     | Mobile fixed-bottom nav with safe-area ✓. Step name missing on mobile step 1.                           |
| Content Quality    | C     | Step 3 heading duplicates Step 1. "Optional" label undersells title+description. Hollow copy on Step 1. |
| AI Slop            | C     | Emoji icons, tips sidebar as feature-list card, centered 2-option grid.                                 |
| Motion             | B     | Intentional transitions. Missing `prefers-reduced-motion` check.                                        |
| Performance        | —     | Not evaluated (no live render)                                                                          |

**Design Score: B-**  
**AI Slop Score: C** — Avoidable patterns present, not dominant.

---

## Findings (Impact Ordered)

### HIGH IMPACT

---

#### FINDING-001 — Step 3 heading identical to Step 1

**File:** [step-details.tsx:162-163](apps/web/src/components/forms/step-details.tsx#L162)  
**Impact:** HIGH  
**Category:** Content Quality

Step 1 heading: "Tell us about your home."  
Step 3 heading: "Tell us about your home." ← identical

A user landing on Step 3 after completing Step 1 sees the same heading. No orientation signal that they're on a different step. Violates "What page am I on?" trunk-test requirement.

**Fix:** Change Step 3 heading to "Details about your home." and subtitle to "Specifics help buyers filter — the more you fill in, the better."

---

#### FINDING-002 — Counter touch targets 36px (below 44px min)

**File:** [step-details.tsx:92-116](apps/web/src/components/forms/step-details.tsx#L92)  
**Impact:** HIGH  
**Category:** Responsive / Touch

`h-9 w-9` = 36px. iOS Human Interface Guidelines and WCAG 2.5.5 require 44px minimum touch targets. Both Bathrooms and Balconies counter buttons fail on mobile.

**Fix:** Change `h-9 w-9` to `h-11 w-11` (44px) in the Counter component.

---

#### FINDING-003 — Review step doesn't confirm society name or map pin

**File:** [step-review.tsx:421-429](apps/web/src/components/forms/step-review.tsx#L421)  
**Impact:** HIGH  
**Category:** Content Quality / Trust

The location section in review shows: City, State, Locality, Pincode, Address (optional). It does NOT show:

- Society/Building name (collected in Step 2)
- Map pin confirmation ("Location pinned" or the coordinates)

Users who filled in their society name and placed a map pin get no confirmation it was saved. On a 6-step flow with autosave, this erodes trust. The map pin in particular (a brand-new UX from PR #21) should be surfaced in review to confirm it worked.

**Fix:** Add `ReviewRow` for `societyName` and a pin-confirmed chip below pincode.

---

#### FINDING-004 — Photos empty state uses X icon (wrong semantic)

**File:** [step-photos.tsx:551-563](apps/web/src/components/forms/step-photos.tsx#L551)  
**Impact:** HIGH (first impression of the photos step)  
**Category:** Content Quality / Interaction

The empty state when no photos are added shows `<X className="text-muted-foreground" />` inside a circle. X means "close", "cancel", "error" — never "nothing here yet." It's the wrong emotional signal. First-time sellers see an X and worry something is wrong.

**Fix:** Replace with `<ImageIcon />` or a camera icon.

---

### MEDIUM IMPACT

---

#### FINDING-005 — No `prefers-reduced-motion` guard on step transitions

**File:** [sell/page.tsx:28-43](<apps/web/src/app/(sell)/sell/page.tsx#L28>)  
**Impact:** MEDIUM  
**Category:** Motion / Accessibility

The `pageVariants` animate x±32 across step changes. This is a full-panel slide animation affecting users with vestibular disorders who have requested reduced motion. The `scrollBehavior: smooth` in globals.css is already gated on `prefers-reduced-motion` — the Framer variants should follow the same pattern.

**Fix:** Check `useReducedMotion()` from framer-motion and set `x: 0` if true.

---

#### FINDING-006 — AI Generate button is undersized and visually weak

**File:** [step-pricing.tsx:335-363](apps/web/src/components/forms/step-pricing.tsx#L335)  
**Impact:** MEDIUM  
**Category:** Visual Hierarchy

The "Generate" (AI description) button is styled as `text-xs font-semibold px-3 py-1.5` — roughly 28px tall, same visual weight as the tone pills. This is a primary differentiator for ChapterNew (AI-assisted listing creation) buried in the noise.

The generate button should be a first-class primary action on this step — at least as prominent as the "Continue" navigation button.

**Fix:** Move the generate button above the description textarea as a standalone CTA (not inline with tone pills). Give it primary styling: `bg-primary text-white px-4 py-2.5 text-sm rounded-xl` with Sparkles icon.

---

#### FINDING-007 — "Optional — Listing Details" label undersells title+description

**File:** [step-pricing.tsx:257-264](apps/web/src/components/forms/step-pricing.tsx#L257)  
**Impact:** MEDIUM  
**Category:** Content Quality

"Optional — Listing Details" is accurate but misses the point. A title and description dramatically improve listing click-through and buyer confidence. Calling them "optional" discourages sellers from filling them in.

**Fix:** Change label to "Listing Title & Description" with subtitle "Add these to get more buyer enquiries — AI can write them for you."

---

#### FINDING-008 — "Age of property" is an orphaned single-field section

**File:** [step-details.tsx:453-469](apps/web/src/components/forms/step-details.tsx#L453)  
**Impact:** MEDIUM  
**Category:** Spacing & Layout

"Property age" gets its own `SectionHeading` with one input field beneath it. This creates an awkward section boundary: the previous section ("Living experience") ends, then a new heading for one field. It reads as incomplete or an afterthought.

**Fix:** Move age-of-property into "More home details" section alongside floor and carpet area.

---

#### FINDING-009 — Mobile step indicator loses step name on Step 1

**File:** [sell/page.tsx:556-571](<apps/web/src/app/(sell)/sell/page.tsx#L556>)  
**Impact:** MEDIUM  
**Category:** Responsive

On mobile, the step indicator shows "Step 1 of 6" with the current step name — BUT the current step name only appears as a `<button>` (with back arrow) on `!isFirstStep`. On Step 1, the code shows `<span className="text-foreground font-medium">{STEP_LABELS[currentStep]}</span>` — so actually it IS shown. Wait, re-reading: line 571 shows the step name on first step as plain text too. Actually this is fine — both paths render the step name.

However: the "step name" shown is the CURRENT step label which on step 1 is "Property Type" and the back button appears on steps 2+. This is correct. CANCEL — this finding is not a real issue.

**Re-file:** The mobile progress bar is fine. Step name always shown.

---

#### FINDING-009 (revised) — Step 1 has only 2 types — misleading copy

**File:** [step-property-type.tsx:56-59](apps/web/src/components/forms/step-property-type.tsx#L56)  
**Impact:** MEDIUM  
**Category:** Content Quality

Subtitle: "We'll tailor the listing experience based on your property." With only Apartment and Penthouse available (and Penthouse being a premium variant of apartment), there's essentially no tailoring happening. Sellers of villas, independent houses, plots, or builder floors are also being excluded — they'll pick "Apartment" and submit inaccurate data.

This is likely a business constraint (MVP scope), not a UI bug. But the copy should be honest about the current limitation: "Currently supporting apartments and penthouses."

**Fix (low-effort):** Change subtitle to remove the "tailor" promise. Simply: "Tell us your property type." Or add a note: "More property types coming soon."

---

### POLISH

---

#### FINDING-010 — Tips sidebar matches AI-slop "feature list" pattern

**File:** [step-photos.tsx:426-445](apps/web/src/components/forms/step-photos.tsx#L426)  
**Impact:** POLISH  
**Category:** AI Slop

The "Photo Tips" card is: green CheckCircle2 icon + bold title + description text, repeated 5 times. This is structurally identical to the AI-slop "3-column feature grid" rotated 90°. The card reads like boilerplate.

**Fix:** Remove the CheckCircle2 icons. Make it a simple numbered list `1. Use natural light — open curtains...` or use bullet `·`. The content is good; the presentation just looks like a template.

---

#### FINDING-011 — Privacy card orange doesn't match brand accent

**File:** [step-photos.tsx:449-457](apps/web/src/components/forms/step-photos.tsx#L449)  
**Impact:** POLISH  
**Category:** Color

`bg-orange-50/50` + `text-orange-500` is close to but not the same as brand accent `#e63500`. Tailwind orange-500 is `#f97316` — noticeably more yellow-orange. In brand-aware design, secondary trust elements should use the actual accent.

**Fix:** Replace with `bg-[#e63500]/5` and `text-[#e63500]` or use a CSS variable once `--color-accent` is accessible in this context.

---

#### FINDING-012 — Step 1 emoji icons hit AI slop pattern

**File:** [step-property-type.tsx:15-27](apps/web/src/components/forms/step-property-type.tsx#L15)  
**Impact:** POLISH  
**Category:** AI Slop

🏢 and ✨ are emoji used as design elements. The skill's AI slop rule: "Emoji as design elements (rockets in headings, emoji as bullet points)". The building emoji is plausible for a property type picker, but ✨ (sparkles) is generic. Consider an SVG or lucide icon for visual consistency.

**Fix:** Replace with Lucide `Building2` (apartment) and `Building` or `Crown` (penthouse). Wrap in the same rounded bg container.

---

## Quick Wins (< 30 min each)

1. **Fix Step 3 heading** — 1 string change (FINDING-001)
2. **Fix counter touch targets** — 2 class changes: `h-9 w-9` → `h-11 w-11` (FINDING-002)
3. **Add society + map pin to review** — ~15 lines JSX (FINDING-003)
4. **Fix photos empty-state icon** — swap `<X>` for `<ImageIcon>` (FINDING-004)
5. **Fix "Optional" label in pricing** — 2 string changes (FINDING-007)

---

## Goodwill Reservoir

Starting: 70/100

```
Goodwill: 70 ████████████████████░░░░░░░░░░░
  Step 1: Property type      70 → 72  (+2 clear cards, animation feels considered)
  Step 2: Location           72 → 78  (+6 map picker auto-geocodes, smart UX)
  Step 3: Details            78 → 68  (-5 duplicate heading confusion, -5 counter too small on mobile)
  Step 4: Photos             68 → 63  (-5 X icon in empty state, -0 sidebar tips OK)
  Step 5: Pricing            63 → 68  (+5 live lakh/crore conversion is delightful, AI description available)
  Step 6: Review             68 → 63  (-5 society name/pin not confirmed in review)
FINAL: 63/100 ✅ HEALTHY but improvable
```

---

## PR Summary

Design review of 6-step sell flow: 9 findings (4 high, 5 medium, 3 polish). Implementing 5 quick wins. Design score: B-. Goodwill: 63/100 — healthy but FINDING-001 (duplicate heading), FINDING-002 (touch targets), and FINDING-003 (review not confirming society+map) are the priority fixes.
