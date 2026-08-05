import Anthropic from '@anthropic-ai/sdk';

// AI-assisted township research. Uses Claude with the web-search tool to find a township's
// soliciting/peddler-permit requirements, clerk contact, fee, and permit-form URL, and
// returns them as structured data for the user to review. Requires ANTHROPIC_API_KEY.

export function researchEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export type ResearchResult = {
  name: string;
  state: string | null;
  county: string | null;
  clerkOfficeName: string | null;
  clerkName: string | null;
  clerkEmail: string | null;
  clerkPhone: string | null;
  officeAddress: string | null;
  officeCity: string | null;
  officeZip: string | null;
  website: string | null;
  permitFee: number | null;
  processingDays: number | null;
  permitDurationDays: number | null;
  reqFee: boolean;
  reqFingerprints: boolean;
  reqBackgroundCheck: boolean;
  reqPhoto2x2: boolean;
  reqInsurance: boolean;
  reqBond: boolean;
  reqDriverLicense: boolean;
  reqVehicleInfo: boolean;
  reqInPerson: boolean;
  reqNotarized: boolean;
  extraRequirements: string[];
  permitPdfUrl: string | null;
  sourceUrls: string[];
  summary: string;
  confidence: 'high' | 'medium' | 'low';
};

const SYSTEM = `You research municipal door-to-door soliciting / peddler / canvasser permit requirements for a company that applies for these permits. You have a web search tool — use it to find the CURRENT, authoritative requirements from the township's own government website whenever possible.

Rules:
- Only report facts you can support from search results. If something is unknown, use null (or false for a requirement flag) — never guess.
- Prefer the official township/municipal .gov site and its actual application form.
- If you find a direct link to the fillable permit/application PDF, put it in permitPdfUrl.
- Set confidence to "low" if you could not find the official source.

Return ONLY a single JSON object (no prose, no markdown fences) with EXACTLY these keys:
{
  "name": string, "state": string|null, "county": string|null,
  "clerkOfficeName": string|null, "clerkName": string|null, "clerkEmail": string|null, "clerkPhone": string|null,
  "officeAddress": string|null, "officeCity": string|null, "officeZip": string|null, "website": string|null,
  "permitFee": number|null, "processingDays": number|null, "permitDurationDays": number|null,
  "reqFee": boolean, "reqFingerprints": boolean, "reqBackgroundCheck": boolean, "reqPhoto2x2": boolean,
  "reqInsurance": boolean, "reqBond": boolean, "reqDriverLicense": boolean, "reqVehicleInfo": boolean,
  "reqInPerson": boolean, "reqNotarized": boolean,
  "extraRequirements": string[], "permitPdfUrl": string|null, "sourceUrls": string[],
  "summary": string, "confidence": "high"|"medium"|"low"
}`;

export async function researchTownship(input: { name: string; state?: string | null; county?: string | null }): Promise<ResearchResult> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const model = process.env.RESEARCH_MODEL || 'claude-opus-5';
  const where = [input.name, input.county && `${input.county} County`, input.state].filter(Boolean).join(', ');

  const tools = [{ type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: 6 }];
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Research the door-to-door soliciting/peddler permit requirements for ${where}. Find the official township website, the clerk's office contact, the fee and how long the permit is valid, every requirement (fingerprints, background check, 2x2 photo, insurance, bond, notarization, in-person filing, driver's license, vehicle info), any other requirements, and a direct link to the application PDF if one exists. Then return the JSON object.`,
    },
  ];

  // The web-search server loop may pause after 10 iterations; resume until it finishes.
  const baseParams = { model, max_tokens: 8000, system: SYSTEM, tools: tools as unknown as Anthropic.Tool[] };
  let response = await client.messages.create({ ...baseParams, messages });
  let guard = 0;
  while (response.stop_reason === 'pause_turn' && guard++ < 6) {
    messages.push({ role: 'assistant', content: response.content });
    response = await client.messages.create({ ...baseParams, messages });
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('The research request was declined. Try a different township or add it manually.');
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const parsed = extractJson(text);
  if (!parsed) throw new Error('Could not parse the research result. Please add this township manually.');
  return normalize(parsed, input);
}

function extractJson(text: string): Record<string, unknown> | null {
  // Tolerate stray prose or code fences around the JSON object.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'yes';
}
function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && v.trim() !== '' ? n : null;
  }
  return null;
}
function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

function normalize(o: Record<string, unknown>, input: { name: string; state?: string | null; county?: string | null }): ResearchResult {
  const conf = o.confidence;
  return {
    name: strOrNull(o.name) ?? input.name,
    state: strOrNull(o.state) ?? input.state ?? null,
    county: strOrNull(o.county) ?? input.county ?? null,
    clerkOfficeName: strOrNull(o.clerkOfficeName),
    clerkName: strOrNull(o.clerkName),
    clerkEmail: strOrNull(o.clerkEmail),
    clerkPhone: strOrNull(o.clerkPhone),
    officeAddress: strOrNull(o.officeAddress),
    officeCity: strOrNull(o.officeCity),
    officeZip: strOrNull(o.officeZip),
    website: strOrNull(o.website),
    permitFee: numOrNull(o.permitFee),
    processingDays: numOrNull(o.processingDays),
    permitDurationDays: numOrNull(o.permitDurationDays),
    reqFee: bool(o.reqFee),
    reqFingerprints: bool(o.reqFingerprints),
    reqBackgroundCheck: bool(o.reqBackgroundCheck),
    reqPhoto2x2: bool(o.reqPhoto2x2),
    reqInsurance: bool(o.reqInsurance),
    reqBond: bool(o.reqBond),
    reqDriverLicense: bool(o.reqDriverLicense),
    reqVehicleInfo: bool(o.reqVehicleInfo),
    reqInPerson: bool(o.reqInPerson),
    reqNotarized: bool(o.reqNotarized),
    extraRequirements: strArray(o.extraRequirements),
    permitPdfUrl: strOrNull(o.permitPdfUrl),
    sourceUrls: strArray(o.sourceUrls),
    summary: strOrNull(o.summary) ?? '',
    confidence: conf === 'high' || conf === 'low' ? conf : 'medium',
  };
}
