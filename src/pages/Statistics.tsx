import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Users,
  MapPin,
  Cake,
  UserCheck,
  Gift,
} from "lucide-react";

const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
};

interface DiscipleshipRow {
  id: string;
  disciple_name: string;
  discipler_name: string;
  birth_date: string | null;
  admin_region: string | null;
  gender: string | null;
  status: string | null;
}

const COLORS = [
  "hsl(225, 60%, 25%)",
  "hsl(225, 45%, 40%)",
  "hsl(225, 35%, 55%)",
  "hsl(225, 25%, 65%)",
  "hsl(152, 55%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 50%, 45%)",
  "hsl(180, 50%, 40%)",
  "hsl(330, 50%, 45%)",
  "hsl(60, 50%, 45%)",
  "hsl(200, 50%, 45%)",
];

const calcAge = (birthDate: string) => {
  const today = new Date();
  const birth = parseDate(birthDate);

  let age = today.getFullYear() - birth.getFullYear();

  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate()))
    age--;

  return age;
};

const Statistics = () => {

  const navigate = useNavigate();

  const [rows, setRows] = useState<DiscipleshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRA, setExpandedRA] = useState<string | null>(null);

  useEffect(() => {

    const fetch = async () => {

      const { data } = await supabase
        .from("discipleship")
        .select(
          "id, disciple_name, discipler_name, birth_date, admin_region, gender, status"
        );

      setRows((data as DiscipleshipRow[]) ?? []);

      setLoading(false);

    };

    fetch();

  }, []);

  // UNIQUE PEOPLE CORRIGIDO
  const uniquePeople = useMemo(() => {

    const map = new Map<string, DiscipleshipRow>();

    // Registrar discípulos corretamente
    rows.forEach((r) => {

      if (r.disciple_name && r.birth_date) {

        map.set(r.disciple_name, {
          ...r,
          disciple_name: r.disciple_name,
        });

      }

    });

    // Registrar discipuladores com seus próprios dados
    rows.forEach((r) => {

      if (r.discipler_name) {

        const disciplerRecord = rows.find(
          (d) =>
            d.disciple_name === r.discipler_name &&
            d.birth_date
        );

        if (disciplerRecord) {

          map.set(r.discipler_name, {
            ...disciplerRecord,
            disciple_name: r.discipler_name,
          });

        }

      }

    });

    return Array.from(map.values());

  }, [rows]);

  const raData = useMemo(() => {

    const map = new Map<string, string[]>();

    uniquePeople.forEach((p) => {

      const ra = p.admin_region || "Não informado";

      if (!map.has(ra)) map.set(ra, []);

      map.get(ra)!.push(p.disciple_name);

    });

    return Array.from(map.entries())
      .map(([name, people]) => ({
        name,
        count: people.length,
        people,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
      );

  }, [uniquePeople]);

  const ageData = useMemo(() => {

    const ages: number[] = [];

    uniquePeople.forEach((p) => {

      if (p.birth_date)
        ages.push(calcAge(p.birth_date));

    });

    if (!ages.length)
      return { bars: [], average: 0, total: 0 };

    const avg = Math.round(
      ages.reduce((a, b) => a + b, 0) / ages.length
    );

    const countMap = new Map<number, number>();

    ages.forEach((age) => {

      countMap.set(
        age,
        (countMap.get(age) || 0) + 1
      );

    });

    const bars = Array.from(countMap.entries())
      .map(([age, count]) => ({
        name: String(age),
        count,
      }))
      .sort(
        (a, b) =>
          Number(a.name) - Number(b.name)
      );

    return {

      bars,
      average: avg,
      total: ages.length,

    };

  }, [uniquePeople]);

  const nextBirthday = useMemo(() => {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    let closest = null as any;

    uniquePeople.forEach((p) => {

      if (!p.birth_date) return;

      const birth = parseDate(p.birth_date);

      const next = new Date(
        today.getFullYear(),
        birth.getMonth(),
        birth.getDate()
      );

      if (next < today)
        next.setFullYear(today.getFullYear() + 1);

      const days = Math.round(
        (next.getTime() - today.getTime()) /
          86400000
      );

      if (!closest || days < closest.days) {

        closest = {

          name: p.disciple_name,
          date: next,
          days,

        };

      }

    });

    return closest;

  }, [uniquePeople]);

  if (loading) {

    return (

      <Layout>

        Carregando...

      </Layout>

    );

  }

  return (

    <Layout>

      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl font-bold">

          Estatísticas

        </h1>

        <button

          onClick={() => navigate("/aniversarios")}

        >

          {nextBirthday?.name}

          {nextBirthday?.date.toLocaleDateString(
            "pt-BR"
          )}

        </button>

      </div>

    </Layout>

  );

};

export default Statistics;
