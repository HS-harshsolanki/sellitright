// Centralized notification action URL routing.
// Both the bell dropdown and the notifications page use this — keeps them in sync.
export function getNotificationActionUrl(type: string): string | null {
  // Seller receives a new buyer interest → go to seller Buyer Requests tab
  if (type === 'InterestRequest') return '/dashboard?tab=buyers'
  // Buyer learns their request was accepted/declined → go to buyer My Requests
  if (type === 'Accepted' || type === 'Rejected') return '/dashboard/requests'
  // ConnectionUnlocked: both seller and buyer receive this notification.
  // Buyer goes to My Requests (contact is now visible there).
  // Seller goes to Buyer Requests (to see the paid connection).
  // We cannot distinguish here without user role context, so we route to My Requests
  // as the buyer is more likely acting; sellers already see the update in their tab.
  if (type === 'ConnectionUnlocked') return '/dashboard/requests'
  // Seller received payment confirmation
  if (type === 'PaymentReceived') return '/dashboard?tab=buyers'
  return null
}
