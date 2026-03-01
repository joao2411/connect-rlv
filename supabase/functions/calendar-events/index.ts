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

function expandRrule(
  rrule: string,
  startDate: Date,
  endDate: Date,
  duration: number,
  limit: Date
): { start: Date; end: Date }[] {
  const parts: Record<string, string> = {};
  rrule.split(";").forEach((p) => {
    const [k, v] = p.split("=");
    parts[k] = v;
  });

  const freq = parts["FREQ"];
  const count = parts["COUNT"] ? parseInt(parts["COUNT"]) : undefined;
  const until = parts["UNTIL"] ? new Date(parseIcalDate("DTSTART:" + parts["UNTIL"]).date) : undefined;
  const interval = parts["INTERVAL"] ? parseInt(parts["INTERVAL"]) : 1;
  const byDay = parts["BYDAY"]?.split(",");

  const occurrences: { start: Date; end: Date }[] = [];
  const maxOccurrences = count || 200;
  const endLimit = until && until < limit ? until : limit;

  let current = new Date(startDate);

  for (let i = 0; i < maxOccurrences && current <= endLimit; i++) {
    if (freq === "WEEKLY" && byDay) {
      const dayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
      const weekStart = new Date(current);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      for (const d of byDay) {
        const target = dayMap[d];
        if (target === undefined) continue;
        const occ = new Date(weekStart);
        occ.setDate(occ.getDate() + target);
        occ.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());
        if (occ >= startDate && occ <= endLimit) {
          occurrences.push({ start: new Date(occ), end: new Date(occ.getTime() + duration) });
        }
      }
      current.setDate(current.getDate() + 7 * interval);
    } else if (freq === "WEEKLY") {
      occurrences.push({ start: new Date(current), end: new Date(current.getTime() + duration) });
      current.setDate(current.getDate() + 7 * interval);
    } else if (freq === "DAILY") {
      occurrences.push({ start: new Date(current), end: new Date(current.getTime() + duration) });
      current.setDate(current.getDate() + interval);
    } else if (freq === "MONTHLY") {
      occurrences.push({ start: new Date(current), end: new Date(current.getTime() + duration) });
      current.setMonth(current.getMonth() + interval);
    } else if (freq === "YEARLY") {
      occurrences.push({ start: new Date(current), end: new Date(current.getTime() + duration) });
      current.setFullYear(current.getFullYear() + interval);
    } else {
      break;
    }
  }

  return occurrences;
}

function parseIcal(text: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n");
  const blocks = unfolded.split("BEGIN:VEVENT");

  const now = new Date();
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() + 3);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const lines = block.split("\n");
    let uid = "";
    let summary = "";
    let description = "";
    let location = "";
    let dtstart = "";
    let dtend = "";
    let rrule = "";
    const exdates: string[] = [];

    for (const line of lines) {
      if (line.startsWith("UID:")) uid = line.slice(4).trim();
      else if (line.startsWith("SUMMARY")) {
        const colonIdx = line.indexOf(":");
        summary = unescapeIcal(line.slice(colonIdx + 1).trim());
      } else if (line.startsWith("DESCRIPTION")) {
        const colonIdx = line.indexOf(":");
        description = unescapeIcal(line.slice(colonIdx + 1).trim());
      } else if (line.startsWith("LOCATION")) {
        const colonIdx = line.indexOf(":");
        location = unescapeIcal(line.slice(colonIdx + 1).trim());
      } else if (line.startsWith("DTSTART")) dtstart = line.trim();
      else if (line.startsWith("DTEND")) dtend = line.trim();
      else if (line.startsWith("RRULE:")) rrule = line.slice(6).trim();
      else if (line.startsWith("EXDATE")) {
        const colonIdx = line.indexOf(":");
        exdates.push(line.slice(colonIdx + 1).trim());
      }
    }

    if (!summary) continue;

    const startParsed = dtstart ? parseIcalDate(dtstart) : { date: "", allDay: false };
    const endParsed = dtend ? parseIcalDate(dtend) : { date: startParsed.date, allDay: startParsed.allDay };

    if (rrule && startParsed.date) {
      const sDate = new Date(startParsed.date);
      const eDate = new Date(endParsed.date);
      const duration = eDate.getTime() - sDate.getTime();
      const exdateSet = new Set(exdates.map((d) => parseIcalDate("DTSTART:" + d).date));

      const occurrences = expandRrule(rrule, sDate, eDate, duration, limit);
      for (const occ of occurrences) {
        const startIso = startParsed.allDay
          ? occ.start.toISOString().split("T")[0]
          : occ.start.toISOString();
        if (exdateSet.has(startIso)) continue;
        events.push({
          id: `${uid || `event-${i}`}_${startIso}`,
          summary,
          description: description || undefined,
          location: location || undefined,
          start: startIso,
          end: startParsed.allDay
            ? occ.end.toISOString().split("T")[0]
            : occ.end.toISOString(),
          allDay: startParsed.allDay,
        });
      }
    } else {
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
    now.setHours(0, 0, 0, 0);
    const futureEvents = allEvents
      .filter((e) => {
        const endDate = new Date(e.end || e.start);
        return endDate >= now;
      })
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
