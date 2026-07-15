/**
 * Where the kitchen delivers.
 *
 * Browser geolocation may *suggest* a ZIP — it's one tap versus typing five
 * digits — but the answer is always shown back to the user and always editable.
 * A VPN, a stale permission, or a phone that resolves to the wrong side of a
 * street would otherwise hard-block someone from a service they can order from.
 */
export const serviceableZips: Record<string, string> = {
  "94105": "Financial District",
  "94103": "SoMa",
  "94107": "Potrero Hill",
  "94110": "Mission",
  "94111": "Embarcadero",
  "94158": "Mission Bay",
};

/**
 * Rough centroid of each delivery ZIP. Stands in for a reverse-geocoding call:
 * the browser hands us a coordinate, and the nearest centroid within
 * `MAX_SNAP_KM` is the ZIP we suggest. In production this is one request to a
 * geocoder, and the same "suggest, don't decide" rule applies to its answer.
 */
const zipCentroids: Record<string, [lat: number, lng: number]> = {
  "94105": [37.7897, -122.3942],
  "94103": [37.7726, -122.4108],
  "94107": [37.7621, -122.3971],
  "94110": [37.7485, -122.4157],
  "94111": [37.7986, -122.3999],
  "94158": [37.7702, -122.3893],
};

/** Past this, the coordinate isn't in any delivery ZIP — don't guess one. */
const MAX_SNAP_KM = 4;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * The delivery ZIP a coordinate falls in, or `null` when it falls in none —
 * which is the honest answer for "somewhere outside our zone", not a reason to
 * snap them to the closest edge of it.
 */
export function zipForCoords(lat: number, lng: number): string | null {
  let best: { zip: string; km: number } | null = null;
  for (const [zip, [zLat, zLng]] of Object.entries(zipCentroids)) {
    const km = haversineKm(lat, lng, zLat, zLng);
    if (!best || km < best.km) best = { zip, km };
  }
  return best && best.km <= MAX_SNAP_KM ? best.zip : null;
}

export type ZipStatus = "serviceable" | "unserviceable";

/** `null` = not a well-formed 5-digit ZIP, so we can't say either way yet. */
export function checkZip(zip: string): ZipStatus | null {
  const trimmed = zip.trim();
  if (!/^\d{5}$/.test(trimmed)) return null;
  return trimmed in serviceableZips ? "serviceable" : "unserviceable";
}

export function neighborhoodFor(zip: string): string | undefined {
  return serviceableZips[zip.trim()];
}

/**
 * Flat delivery / pickup fee by ZIP — the admin-configured ZIP-based fee logic.
 * Central SF ZIPs are cheaper; anywhere else falls back to the standard fee.
 * Reused for a reusable-packaging pickup requested outside the included windows.
 */
const zipFees: Record<string, number> = {
  "94105": 4, // Financial District
  "94103": 4, // SoMa
  "94111": 5, // Embarcadero
  "94107": 6, // Potrero Hill
  "94110": 6, // Mission
  "94158": 7, // Mission Bay
};

const STANDARD_ZIP_FEE = 8;

export function deliveryFeeForZip(zip: string): number {
  return zipFees[zip.trim()] ?? STANDARD_ZIP_FEE;
}
