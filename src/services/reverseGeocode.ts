interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  hamlet?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

const resultCache = new Map<string, string>();
const pendingLookups = new Map<string, Promise<string>>();
let lookupQueue = Promise.resolve();
let lastRequestStartedAt = 0;

const addressLabel = (address: NominatimAddress | undefined, displayName: string | undefined) => {
  if (!address) return displayName?.trim() ?? "";

  const street = [address.house_number, address.road].filter(Boolean).join(" ");
  const locality =
    address.neighbourhood ??
    address.suburb ??
    address.village ??
    address.hamlet ??
    address.town ??
    address.city ??
    address.county;
  const city = address.city ?? address.town ?? address.village;
  const parts = [street, locality, city, address.state, address.country]
    .filter((part): part is string => Boolean(part?.trim()))
    .filter((part, index, all) => all.indexOf(part) === index);

  return (parts.length > 0 ? parts.join(", ") : displayName?.trim()) ?? "";
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number,
  language: string,
): Promise<string> => {
  const cacheKey = `${latitude.toFixed(5)},${longitude.toFixed(5)},${language}`;
  const cachedName = resultCache.get(cacheKey);
  if (cachedName) return cachedName;
  const pendingLookup = pendingLookups.get(cacheKey);
  if (pendingLookup) return pendingLookup;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const lookup = lookupQueue.then(async () => {
    const waitMs = Math.max(0, 1000 - (Date.now() - lastRequestStartedAt));
    if (waitMs > 0) await new Promise((resolve) => window.setTimeout(resolve, waitMs));
    lastRequestStartedAt = Date.now();

    const response = await fetch(url, {
      headers: { "Accept-Language": language },
      referrerPolicy: "origin",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`OpenStreetMap location lookup failed with status ${response.status}.`);
    }

    const result = (await response.json()) as NominatimResponse;
    const name = addressLabel(result.address, result.display_name);
    if (!name) throw new Error("OpenStreetMap returned no readable location name.");
    resultCache.set(cacheKey, name);
    return name;
  });
  pendingLookups.set(cacheKey, lookup);
  lookupQueue = lookup.then(() => undefined, () => undefined);
  try {
    return await lookup;
  } finally {
    pendingLookups.delete(cacheKey);
  }
};
