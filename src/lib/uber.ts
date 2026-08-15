// Uber's public Rides API is partner-gated; the sanctioned open integration
// is the m.uber.com universal link. It opens the Uber app (or mobile web)
// with the trip pre-filled, and client_id attributes the referral to our
// Uber developer application ("Meguaz Travel").
const UBER_CLIENT_ID = 'MZT6_7tMO9VT4250nLE5urK_8-ZXbDti'

export function uberRideLink(dropoff: { lat: number; lng: number; name: string }) {
  const params = new URLSearchParams({
    action: 'setPickup',
    client_id: UBER_CLIENT_ID,
    pickup: 'my_location',
    'dropoff[latitude]': String(dropoff.lat),
    'dropoff[longitude]': String(dropoff.lng),
    'dropoff[nickname]': dropoff.name,
  })
  return 'https://m.uber.com/ul/?' + params.toString()
}
