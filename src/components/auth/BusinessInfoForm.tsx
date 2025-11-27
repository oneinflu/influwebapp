import { useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Alert from "../ui/alert/Alert";
import Button from "../ui/button/Button";
import Select from "../form/Select";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

type IndiaPostOffice = {
  Name: string;
  Description?: string;
  BranchType?: string;
  DeliveryStatus?: string;
  Circle?: string;
  District?: string;
  Division?: string;
  Region?: string;
  State?: string;
  Country?: string;
};

type IndiaPostalApiResponseItem = {
  Message: string;
  Status: string;
  PostOffice: IndiaPostOffice[];
};

export default function BusinessInfoForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Top-level fields
  const [businessName, setBusinessName] = useState("");
  const [teamSize, setTeamSize] = useState<number | "">("");
  const [website, setWebsite] = useState("");
  const [isGstRegistered, setIsGstRegistered] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [businessPAN, setBusinessPAN] = useState("");
  const [gstError, setGstError] = useState<string | null>(null);
  const [panError, setPanError] = useState<string | null>(null);
  // Individual PAN removed for now (can be added later)

  // Address fields
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  // Pincode lookup state
  const [pincodeOptions, setPincodeOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [pincodeData, setPincodeData] = useState<IndiaPostOffice[]>([]);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  // Patterns
  const GSTIN_PATTERN = /^[0-9A-Z]{15}$/;
  const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const PAN_TYPES = new Set(["P","C","H","A","B","G","L","F","T","J"]);

  function toBase36Value(ch: string) {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48; // 0-9
    if (code >= 65 && code <= 90) return code - 55; // A-Z -> 10-35
    return -1;
  }

  function fromBase36Value(val: number) {
    if (val >= 0 && val <= 9) return String(val);
    if (val >= 10 && val <= 35) return String.fromCharCode(val + 55);
    return "";
  }

  function validateGSTIN(gstinRaw: string) {
    const gstin = gstinRaw.trim().toUpperCase();
    if (!GSTIN_PATTERN.test(gstin)) return false;
    // Validate state code (01-37 or 97)
    const state = Number(gstin.slice(0, 2));
    const validStates = new Set([
      1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,
      27,28,29,30,31,32,33,34,35,36,37,97
    ]);
    if (!validStates.has(state)) return false;
    // Validate PAN segment (3-12)
    const panSegment = gstin.slice(2, 12);
    if (!PAN_PATTERN.test(panSegment)) return false;
    // 13th: entity code [0-9A-Z]
    const entity = gstin[12];
    if (!/[0-9A-Z]/.test(entity)) return false;
    // 14th: usually 'Z'
    if (gstin[13] !== 'Z') return false;
    // 15th: checksum (mod 36)
    const factors = [1, 2];
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      const val = toBase36Value(gstin[i]);
      if (val < 0) return false;
      const product = val * factors[i % 2];
      sum += Math.floor(product / 36) + (product % 36);
    }
    const checkVal = (36 - (sum % 36)) % 36;
    const expectedCheckChar = fromBase36Value(checkVal);
    return expectedCheckChar === gstin[14];
  }


  function validatePAN(panRaw: string) {
    const pan = panRaw.trim().toUpperCase();
    if (!PAN_PATTERN.test(pan)) return false;
    // 4th character should be valid PAN type
    if (!PAN_TYPES.has(pan[3])) return false;
    return true;
  }

  function isURL(value: string) {
    try {
      const u = new URL(value);
      return !!u.protocol && !!u.host;
    } catch {
      return false;
    }
  }

  const handleSubmit = async () => {
    setErrorMessage(null);
    // Client-side validations aligned with backend constraints
    if (website && !isURL(website)) {
      setErrorMessage("Invalid website URL");
      return;
    }
    // Live validation relies on field-level errors; enforce requirements here
    if (!businessPAN) {
      setPanError("Business PAN is required");
      return;
    }
    if (!validatePAN(businessPAN)) {
      setPanError("Invalid PAN");
      return;
    }
    if (isGstRegistered) {
      if (!gstNumber) {
        setGstError("GST number is required");
        return;
      }
      if (!validateGSTIN(gstNumber)) {
        setGstError("Invalid GST number");
        return;
      }
    }

    const businessInformation = {
      businessName: businessName || undefined,
      teamSize: teamSize === "" ? undefined : Number(teamSize),
      website: website || undefined,
      isGstRegistered,
      gstNumber: gstNumber || undefined,
      businessPAN: businessPAN || undefined,
      businessAddress: {
        line1: line1 || undefined,
        line2: line2 || undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
      },
    };

    if (!user || !user._id) {
      setErrorMessage("User session not initialized. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      await api.put(`/users/${user._id}`, { businessInformation });
      navigate("/profile-setup");
    } catch (err: unknown) {
      let msg = "Unable to save business information";
      if (typeof err === "object" && err !== null) {
        const maybe = err as { response?: { data?: { message?: string } }; message?: string };
        msg = maybe.response?.data?.message ?? (typeof maybe.message === "string" ? maybe.message : msg);
      }
      setErrorMessage(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {errorMessage && (
        <Alert variant="error" title="Error" message={errorMessage} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Business Name</Label>
          <Input placeholder="Acme Corp" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
        <div>
          <Label>Team Size</Label>
          <Input type="number" placeholder="0" value={String(teamSize)} onChange={(e) => setTeamSize(e.target.value ? Number(e.target.value) : "")} />
        </div>
        <div className="sm:col-span-2">
          <Label>Website</Label>
          <Input placeholder="https://example.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <Checkbox className="w-5 h-5" checked={isGstRegistered} onChange={setIsGstRegistered} />
            <p className="text-sm text-gray-700 dark:text-gray-400">GST Registered</p>
          </div>
        </div>
        {isGstRegistered && (
          <div>
            <Label>GST Number</Label>
            <Input
              placeholder="15-character GSTIN"
              value={gstNumber}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setGstNumber(v);
                setGstError(v.length ? (validateGSTIN(v) ? null : "Invalid GST number") : null);
              }}
            />
            {gstError && <p className="text-red-500 text-xs mt-1">{gstError}</p>}
          </div>
        )}
        <div>
          <Label>Business PAN</Label>
          <Input
            placeholder="ABCDE1234F"
            value={businessPAN}
            onChange={(e) => {
              const v = e.target.value.toUpperCase();
              setBusinessPAN(v);
              setPanError(v.length ? (validatePAN(v) ? null : "Invalid PAN") : null);
            }}
          />
          {panError && <p className="text-red-500 text-xs mt-1">{panError}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label>Address Line 1</Label>
          <Input placeholder="Street, Building" value={line1} onChange={(e) => setLine1(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Address Line 2</Label>
          <Input placeholder="Area, Landmark (optional)" value={line2} onChange={(e) => setLine2(e.target.value)} />
        </div>
        <div>
          <Label>PIN Code</Label>
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Enter 6-digit PIN code" />
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setPincodeError(null);
                setPincodeOptions([]);
                const code = (postalCode || "").trim();
                if (!/^\d{6}$/.test(code)) {
                  setPincodeError("Please enter a valid 6-digit PIN code");
                  return;
                }
                setPincodeLoading(true);
                try {
                  const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
                  const json: IndiaPostalApiResponseItem[] = await res.json();
                  const entry = Array.isArray(json) ? json[0] : null;
                  if (!entry || entry.Status !== "Success" || !Array.isArray(entry.PostOffice)) {
                    setPincodeError("No results found for this PIN code");
                    return;
                  }
                  const opts = entry.PostOffice.map((po: IndiaPostOffice, idx: number) => ({
                    label: `${po.Name} — ${po.District}, ${po.State}`,
                    value: String(idx),
                  }));
                  setPincodeOptions(opts);
                  // Store the raw PostOffice array for later selection
                  setPincodeData(entry.PostOffice);
                } catch (e) {
                  setPincodeError("Failed to fetch PIN code details");
                  console.error(e);
                } finally {
                  setPincodeLoading(false);
                }
              }}
            >
              {pincodeLoading ? "Searching…" : "Find address by PIN code"}
            </Button>
            {pincodeError && (
              <div className="mt-2">
                <Alert variant="error" title="Lookup failed" message={pincodeError} />
              </div>
            )}
            {pincodeOptions.length > 0 && (
              <div className="mt-3">
                <Label>Select address match</Label>
                <Select
                  placeholder="Choose a match"
                  options={pincodeOptions}
                  onChange={(val) => {
                    const idx = Number(val);
                    const po: IndiaPostOffice | null = Number.isFinite(idx) ? pincodeData[idx] : null;
                    if (po) {
                      setCity(po.District || "");
                      setState(po.State || "");
                      setCountry(po.Country || "India");
                      setPostalCode((postalCode || "").trim());
                      if (!line1) setLine1(po.Name || "");
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <div>
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label>State</Label>
          <Input value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div>
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Continue"}</Button>
      </div>
    </form>
  );
}
