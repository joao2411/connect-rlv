import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ICAL_URL =
  "https://calendar.google.com/calendar/ical/19f330717a76f1f8da42a1c44123c52da4f51da0ddb07dfd61aff43b48d4f62e%40group.calendar.google.com/public/basic.ics";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
}

function unescapeIcal(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\")
    .replace(/\\;/g, ";");
}

function parseIcalDate(value: string): { date: string; allDay: boolean } {
  // VALUE=DATE:20260301
  if (value.includes("VALUE=DATE:")) {
    const d = value.split(":").pop()!;
    return {
      date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
      allDay: true,
    };
  }
  // DTSTART;TZID=America/Sao_Paulo:20260301T100000 or DTSTART:20260301T100000Z
  const raw = value.split(":").pop()!;
  if (raw.length === 8) {
    return {
      date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
      allDay: true,
    };
  }
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const hour = raw.slice(9, 11);
  const min = raw.slice(11, 13);
  const sec = raw.slice(13, 15);
  const isUtc = raw.endsWith("Z");
  const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}${isUtc ? "Z" : ""}`;
  return { date: isoStr, allDay: false };
}

function parseIcal(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  // Unfold lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n");
  const blocks = unfolded.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const lines = block.split("\n");
    let uid = "";
    let summary = "";
    let description = "";
    let location = "";
    let dtstart = "";
    let dtend = "";

    for (const line of lines) {
      if (line.startsWith("UID:")) uid = line.slice(4).trim();
      else if (line.startsWith("SUMMARY:")) summary = unescapeIcal(line.slice(8).trim());
      else if (line.startsWith("DESCRIPTION:")) description = unescapeIcal(line.slice(12).trim());
      else if (line.startsWith("LOCATION:")) location = unescapeIcal(line.slice(9).trim());
      else if (line.startsWith("DTSTART")) dtstart = line.trim();
      else if (line.startsWith("DTEND")) dtend = line.trim();
    }

    if (!summary) continue;

    const startParsed = dtstart ? parseIcalDate(dtstart) : { date: "", allDay: false };
    const endParsed = dtend ? parseIcalDate(dtend) : { date: startParsed.date, allDay: startParsed.allDay };

    events.push({
      id: uid || `event-${i}`,
      summary,
      description: description || undefined,
      location: location || undefined,
      start: startParsed.date,
      end: endParsed.date,
      allDay: startParsed.allDay,
    });
  }

  return events;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const res = await fetch(ICAL_URL);
    if (!res.ok) throw new Error(`Failed to fetch calendar: ${res.status}`);
    const text = await res.text();
    const allEvents = parseIcal(text);

    // Filter future events and sort
    const now = new Date();
    const futureEvents = allEvents
      .filter((e) => new Date(e.start) >= now || e.allDay)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 20);

    return new Response(JSON.stringify({ events: futureEvents }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
