

## Fix: Business Creation After Stripe Payment

### The Problem

The `/create-business` payment flow is broken because no one actually creates the business after payment:

- The **webhook** (`stripe-subscription-webhook`) skips `checkout.session.completed` events that have no `business_id` in metadata (which is correct for new businesses since they don't exist yet)
- The **PaymentSuccess page** just polls `business_members` hoping a business will magically appear, but never calls the `complete-business-subscription` edge function
- The **`complete-business-subscription`** edge function has all the correct business creation logic but is orphaned -- nothing invokes it

### The Fix

Move the business creation logic INTO the webhook so it happens automatically and reliably when Stripe confirms payment. This is the standard pattern -- webhooks are guaranteed by Stripe, while frontend calls can fail if the user closes the tab.

### Changes

#### 1. Update `stripe-subscription-webhook` (the webhook handler)

In the `checkout.session.completed` case, instead of skipping when there's no `business_id`, check for `business_data` in the metadata and create the business:

- Parse `business_data` JSON from metadata
- Generate a unique slug (with collision handling)
- Insert the business into the `businesses` table with subscription fields set (`subscription_status: 'active'`, `subscription_plan`, `subscription_started_at`, `subscription_ends_at`)
- Insert the owner into `business_members`
- Assign `admin` and `provider` roles in `user_roles`
- Set the session business in `session_business`
- Remove the legacy `subscriptions` table insert (table was already dropped)
- Remove the `business_usage` insert (table may not exist)

#### 2. Update `PaymentSuccess.tsx`

No logic change needed -- the polling approach is correct. Once the webhook creates the business and inserts into `business_members`, the poll will detect it and redirect the user.

#### 3. Delete `complete-business-subscription` edge function

Since the webhook now handles business creation, this orphaned function can be removed:
- Delete `supabase/functions/complete-business-subscription/index.ts`
- Remove the entry from `supabase/config.toml`

### Technical Details

The webhook's `checkout.session.completed` handler will be updated from:

```text
if (!businessId) {
  console.log('New-business checkout, skipping');
  break;
}
```

To:

```text
if (!businessId && metadata.business_data) {
  // Parse business_data, create business, add member, assign roles
  // Set subscription fields directly on the new business row
}
```

Key fields set on the new business:
- `name`, `slug`, `owner_profile_id`, `tagline`, `primary_color`, `secondary_color`
- `subscription_status: 'active'`
- `subscription_plan` (from metadata)
- `subscription_started_at` / `subscription_ends_at` (from Stripe subscription object)
- `template_type: 'healthcare'`

