export interface DetectedAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

interface NominatimResponse {
  address?: {
    house_number?: string;
    road?: string;
    street?: string;
    neighbourhood?: string;
    suburb?: string;
    village?: string;
    town?: string;
    city?: string;
    district?: string;
    state?: string;
    postcode?: string;
  };
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<DetectedAddress> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "en",
      "User-Agent": "UrgentPrinters/1.0 (urgentprinters.in)",
    },
  });
  if (!res.ok) throw new Error("Could not fetch address for your location");

  const data: NominatimResponse = await res.json();
  const a = data.address ?? {};

  const house = a.house_number ? `${a.house_number}, ` : "";
  const road = a.road ?? a.street ?? "";
  const line1 = `${house}${road}`.trim();
  const line2 = a.suburb ?? a.neighbourhood ?? a.village ?? "";
  const city = a.city ?? a.town ?? a.village ?? a.district ?? "";

  return {
    line1,
    line2,
    city,
    state: a.state ?? "",
    postalCode: a.postcode ?? "",
  };
}
