import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Cake, Gift, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
};

interface Person {
  name: string;
  birth_date: string;
  admin_region: string | null;
}

const getNextBirthday = (birthDate: string): Date => {
  const today = new Date();
  const birth = parseDate(birthDate);

  const next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());

  if (next < today) {
    next.setFullYear(today.getFullYear() + 1);
  }

  if (
    today.getMonth() === birth.getMonth() &&
    today.getDate() === birth.getDate()
  ) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  return next;
};

const calcAge = (birthDate: string) => {
  const today = new Date();
  const birth = parseDate(birthDate);

  let age = today.getFullYear() - birth.getFullYear();

  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  return age;
};

const daysUntilBirthday = (birthDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = getNextBirthday(birthDate);
  next.setHours(0, 0, 0, 0);

  return Math.round(
    (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
};

const formatDate = (birthDate: string): string => {
  const birth = parseDate(birthDate);

  return birth.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
};

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const Birthdays = () => {
  const navigate = useNavigate();

  const [people, setPeople] = useState<Person[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("discipleship")
        .select(
          "disciple_name, discipler_name, birth_date, admin_region"
        );

      if (!data) {
        setLoading(false);
        return;
      }

      const map = new Map<string, Person>();

      // Registrar discípulos (fonte confiável)
      data.forEach((r) => {
        if (r.disciple_name && r.birth_date) {
          map.set(r.disciple_name, {
            name: r.disciple_name,
            birth_date: r.birth_date,
            admin_region: r.admin_region,
          });
        }
      });

      // Garantir discipuladores com seus próprios dados
      data.forEach((r) => {
        if (r.discipler_name) {
          const disciplerRecord = data.find(
            (d) => d.disciple_name === r.discipler_name
          );

          if (disciplerRecord?.birth_date) {
            map.set(r.discipler_name, {
              name: r.discipler_name,
              birth_date: disciplerRecord.birth_date,
              admin_region: disciplerRecord.admin_region,
            });
          }
        }
      });

      setPeople(Array.from(map.values()));

      setLoading(false);
    };

    fetchData();
  }, []);

  const sorted = useMemo(() => {
    return [...people].sort(
      (a, b) =>
        daysUntilBirthday(a.birth_date) -
        daysUntilBirthday(b.birth_date)
    );
  }, [people]);

  const grouped = useMemo(() => {
    const groups = new Map<number, Person[]>();

    people.forEach((p) => {
      const birth = parseDate(p.birth_date);

      const month = birth.getMonth();

      if (!groups.has(month)) groups.set(month, []);

      groups.get(month)!.push(p);
    });

    groups.forEach((list) =>
      list.sort(
        (a, b) =>
          parseDate(a.birth_date).getDate() -
          parseDate(b.birth_date).getDate()
      )
    );

    const monthOrder = Array.from({ length: 12 }, (_, i) => i);

    return monthOrder
      .filter((m) => groups.has(m))
      .map((m) => ({
        month: m,
        people: groups.get(m)!,
      }));
  }, [people]);

  const todayBirthdays = useMemo(
    () =>
      sorted.filter(
        (p) => daysUntilBirthday(p.birth_date) === 0
      ),
    [sorted]
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          Carregando...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-3 mb-6">

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/estatisticas")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>

            <h1 className="text-3xl font-bold">
              🎂 Aniversários
            </h1>

            <p className="text-sm">
              {people.length} pessoa(s)
            </p>

          </div>

        </div>

        {todayBirthdays.length > 0 && (

          <Card className="mb-6">

            <CardContent>

              <div className="flex gap-3">

                <Gift />

                <div>

                  Hoje:

                  {todayBirthdays.map((p) =>

                    `${p.name} (${calcAge(p.birth_date)})`

                  ).join(", ")}

                </div>

              </div>

            </CardContent>

          </Card>

        )}

        {grouped.map(({ month, people }) => (

          <div key={month}>

            <h2 className="font-bold mt-6">

              {MONTHS_PT[month]}

            </h2>

            {people.map((p) => {

              const days = daysUntilBirthday(p.birth_date);

              return (

                <div key={p.name}>

                  {p.name}

                  {formatDate(p.birth_date)}

                  em {days} dias

                </div>

              );

            })}

          </div>

        ))}

      </div>
    </Layout>
  );
};

export default Birthdays;
