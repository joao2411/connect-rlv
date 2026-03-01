import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const CALENDAR_ID = "19f330717a76f1f8da42a1c44123c52da4f51da0ddb07dfd61aff43b48d4f62e@group.calendar.google.com";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay: boolean;
}

const Agenda = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("calendar-events");
        if (fnError) throw new Error(fnError.message);
        setEvents(data.events || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const iframeSrc = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(CALENDAR_ID)}&ctz=America%2FSao_Paulo&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=0&mode=MONTH&bgcolor=%23ffffff`;

  const formatEventDate = (event: CalendarEvent) => {
    if (!event.start) return "";
    const date = parseISO(event.start);
    if (event.allDay) {
      return format(date, "dd 'de' MMMM", { locale: ptBR });
    }
    return format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) return "Dia inteiro";
    const start = parseISO(event.start);
    const end = parseISO(event.end);
    return `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground mt-1 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Eventos e compromissos da igreja
          </p>
        </div>

        {/* Iframe do Google Calendar */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <iframe
              src={iframeSrc}
              className="w-full border-0"
              style={{ height: "600px" }}
              title="Agenda Google Calendar"
            />
          </CardContent>
        </Card>

        {/* Lista de próximos eventos */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Próximos Eventos</h2>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {error}
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && events.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Nenhum evento próximo encontrado.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="space-y-3">
              {events.map((event) => (
                <Card key={event.id} className="glass-card-hover">
                  <CardContent className="p-4">
                    <h3
                      className="font-semibold text-foreground text-sm mb-1"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {event.summary}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-muted-foreground text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatEventDate(event)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatEventTime(event)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-muted-foreground text-xs mt-2 line-clamp-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {event.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Agenda;
