// Address suggestions from Google Places Autocomplete (New), limited to South Africa.
// The Google key stays on the server so it is never inside the app.
import { serve, json, env, HttpError } from "../_shared/common.ts";

serve(async (req) => {
  const { input, sessionToken } = await req.json().catch(() => ({}));
  const text = String(input ?? "").trim();
  if (text.length < 2) return json({ suggestions: [] });
  if (text.length > 120) throw new HttpError(400, "That address is too long.");

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env("GOOGLE_MAPS_API_KEY"),
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: text,
      includedRegionCodes: ["za"],
      languageCode: "en",
      ...(sessionToken ? { sessionToken: String(sessionToken) } : {}),
    }),
  });

  if (!res.ok) {
    console.error("Google Places error", res.status, await res.text());
    throw new HttpError(502, "Address search is not available right now.");
  }
  const data = await res.json();
  const suggestions = (data.suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId,
      text: p.text?.text ?? "",
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }));
  return json({ suggestions });
});
