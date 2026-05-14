// India Post PIN code validation — free, no API key needed
// https://api.postalpincode.in/pincode/{pin}

export interface PincodeInfo {
  state: string;
  city: string;   // district level — most reliable for Indian addresses
  valid: true;
}

interface PostOffice {
  State: string;
  District: string;
}

interface PincodeApiResult {
  Status: string;
  PostOffice: PostOffice[] | null;
}

export async function lookupPincode(pin: string): Promise<PincodeInfo | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (!res.ok) return null;
    const data: PincodeApiResult[] = await res.json();
    const result = data[0];
    if (result?.Status !== "Success" || !result.PostOffice?.length) return null;
    const po = result.PostOffice[0];
    return { state: po.State, city: po.District, valid: true };
  } catch {
    return null;
  }
}
