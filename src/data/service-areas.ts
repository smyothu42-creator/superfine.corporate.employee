/**
 * Where the kitchen delivers. Serviceability is asked for — never inferred from
 * IP geolocation, which a VPN or a stale browser-location permission gets wrong
 * often enough to hard-block users from a service they can actually order from.
 */
export const serviceableZips: Record<string, string> = {
  "94105": "Financial District",
  "94103": "SoMa",
  "94107": "Potrero Hill",
  "94110": "Mission",
  "94111": "Embarcadero",
  "94158": "Mission Bay",
};

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
