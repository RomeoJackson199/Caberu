

## Make Homepage Generic Healthcare (Not Dentist-Only)

The homepage currently references "dentists," "dental practices," and "dental" terminology throughout. This plan broadens all copy to address healthcare practices in general (clinics, physiotherapy, dermatology, veterinary, etc.) while keeping the same structure and design.

### Files to Update

**1. `src/components/homepage/PremiumHeroSection.tsx`**
- Change "Patient Summaries" pill sub-text and labels to be generic (already mostly generic)
- Change demo button link from `/demo/dentist` to `/demo/practice` or keep as-is if route doesn't change
- Existing tools list: change "Your practice software" (already generic) -- no change needed there

**2. `src/components/homepage/feature-section.tsx`**
- Feature descriptions already say "patient" not "dental patient" -- mostly fine
- No dentist-specific wording found here

**3. `src/components/homepage/InteractiveBentoGrid.tsx`**
- Line 228: "Plus: Inventory management • Staff scheduling..." -- already generic, no changes

**4. `src/components/homepage/ResultsSection.tsx`**
- Line 6: "No more lost patients" → keep (generic)
- Line 38: "Built With Dentists" → **"Built With Healthcare Professionals"**
- Line 39: "Designed from real practice feedback" -- keep
- Line 2 description: "more lost patients" -- keep
- Line 13 description: "forward-thinking dentists" -- already in Index.tsx CTA

**5. `src/components/homepage/TestimonialsSection.tsx`**
- Line 19-28: Change "General Dentistry Practice" → "Healthcare Practice", "Dentist" → "Practitioner", "Private Dental Practice" → "Private Practice"
- Line 40: "We're working closely with dental practices" → "We're working closely with healthcare practices"
- Line 83: "Currently onboarding dental practices" → "Currently onboarding healthcare practices"

**6. `src/components/homepage/FAQSection.tsx`**
- Line 34: "major dental practice management systems including Dentrix, Eaglesoft, Open Dental, Curve" → "major practice management systems" (remove dental-specific software names)
- Line 43: "pick your preferred dentist" → "pick your preferred provider"
- Line 135: "What should I do in a dental emergency?" → "What should I do in a medical emergency?"

**7. `src/components/homepage/PricingSection.tsx`**
- Line 86: "Perfect for solo practitioners" -- already generic
- Line 90: "The most popular choice for growing practices" -- already generic
- Line 94: "For large practices and multi-location clinics" -- already generic
- No changes needed

**8. `src/pages/Index.tsx`**
- Line 130: "forward-thinking dentists who have switched to Caberu" → **"forward-thinking healthcare professionals who have switched to Caberu"**

### Summary of Text Changes

| Location | Current | New |
|---|---|---|
| ResultsSection | "Built With Dentists" | "Built With Practitioners" |
| TestimonialsSection | "General Dentistry Practice" | "Healthcare Practice" |
| TestimonialsSection | role: "Dentist" | role: "Practitioner" |
| TestimonialsSection | "Private Dental Practice" | "Private Practice" |
| TestimonialsSection | "dental practices" (×2) | "healthcare practices" |
| FAQSection | "dental practice management systems including Dentrix..." | "practice management systems" |
| FAQSection | "preferred dentist" | "preferred provider" |
| FAQSection | "dental emergency" | "medical emergency" |
| Index.tsx CTA | "forward-thinking dentists" | "forward-thinking healthcare professionals" |

All changes are copy-only -- no structural, layout, or logic changes needed.

