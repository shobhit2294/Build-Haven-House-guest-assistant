const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

function distanceInKilometres(from, to) {
  const earthRadius = 6371;
  const latDelta = ((to.lat - from.lat) * Math.PI) / 180;
  const lonDelta = ((to.lon - from.lon) * Math.PI) / 180;
  const latFrom = (from.lat * Math.PI) / 180;
  const latTo = (to.lat * Math.PI) / 180;
  const value =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lonDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatDistance(kilometres) {
  return kilometres < 1
    ? `${Math.round(kilometres * 1000)} m`
    : `${kilometres.toFixed(1)} km`;
}

function getName(tags) {
  return tags.name || tags["name:en"] || "Unnamed hotel";
}

function getType(tags) {
  if (tags.tourism === "hotel") return "Hotel";
  if (tags.tourism === "motel") return "Motel";
  if (tags.tourism === "guest_house") return "Guest house";
  return "Stay option";
}

async function requestJson(url, options, fetchImpl, timeoutMs, signal) {
  const response = await fetchImpl(url, {
    ...options,
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  });
  if (!response.ok) throw new Error("places_provider_error");
  return response.json();
}

export async function searchNearbyHotels(
  area,
  { fetchImpl = fetch, timeoutMs = 4000, totalTimeoutMs = 10000, position } = {},
) {
  const query = area.trim();
  if (!query && !position) return { location: "", hotels: [] };
  const signal = AbortSignal.timeout(totalTimeoutMs);

  const geocoded = position ? [position] : await requestJson(
    `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "HavenHouseGuestAssistant/1.0",
      },
    },
    fetchImpl,
    timeoutMs,
    signal,
  );

  const place = geocoded[0];
  if (!place) return { location: query, hotels: [] };

  const center = { lat: Number(place.lat), lon: Number(place.lon) };
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lon) ||
      Math.abs(center.lat) > 90 || Math.abs(center.lon) > 180)
    throw new Error("places_provider_error");
  const location = position ? "your current location" : typeof place.display_name === "string" ? place.display_name : query;
  const overpassQuery = `[out:json][timeout:8];(nwr["tourism"~"hotel|motel|guest_house"](around:10000,${center.lat},${center.lon}););out center tags;`;
  let places;
  for (const overpassUrl of OVERPASS_URLS) {
    signal.throwIfAborted();
    try {
      places = await requestJson(
        `${overpassUrl}?data=${encodeURIComponent(overpassQuery)}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "HavenHouseGuestAssistant/1.0",
          },
        },
        fetchImpl,
        timeoutMs,
        signal,
      );
      if (!Array.isArray(places?.elements)) throw new Error("places_provider_error");
      break;
    } catch {
      places = undefined;
      // Try the next public Overpass instance.
    }
  }
  if (!places) throw new Error("places_provider_error");

  const hotels = (places.elements || [])
    .map((element) => {
      const point = element.center || element;
      const coordinates = { lat: Number(point.lat), lon: Number(point.lon) };
      const distance = distanceInKilometres(center, coordinates);
      return {
        name: getName(element.tags || {}),
        distance: formatDistance(distance),
        type: getType(element.tags || {}),
        reason: position ? "From your location · straight-line distance" : `Near ${location.split(",")[0]}`,
        _distance: distance,
      };
    })
    .filter((hotel) => Number.isFinite(hotel._distance) && hotel._distance <= 10)
    .sort((left, right) => left._distance - right._distance)
    .slice(0, 6)
    .map(({ _distance, ...hotel }) => hotel);

  return {
    location,
    hotels,
  };
}
