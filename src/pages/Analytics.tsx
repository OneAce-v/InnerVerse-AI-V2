import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Activity, Flame } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { useAuth } from "../AuthContext";
import { PageHeader } from "../components/ui/page-header.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { PageLoader } from "../components/ui/skeleton.tsx";

export default function Analytics() {
  const { getToken } = useAuth();
  const [data, setData] = useState({ food: [], exercise: [] });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.food && json.exercise) {
          setData(json);
          processChartData(json.food, json.exercise);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoaded(true);
      }
    };
    fetchAnalytics();
  }, [getToken]);

  const processChartData = (foods: any[], exercises: any[]) => {
    // Generate last 7 days including today
    const map = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString([], { weekday: "short" });
      map.set(d.toISOString().split("T")[0], {
        name: dateStr,
        caloriesIn: 0,
        caloriesOut: 0,
      });
    }

    foods.forEach((f) => {
      const key = new Date(f.createdAt).toISOString().split("T")[0];
      if (map.has(key)) {
        const entry = map.get(key);
        entry.caloriesIn += f.calories || 0;
        map.set(key, entry);
      }
    });

    exercises.forEach((e) => {
      const key = new Date(e.createdAt).toISOString().split("T")[0];
      if (map.has(key)) {
        const entry = map.get(key);
        entry.caloriesOut += e.caloriesBurned || 0;
        map.set(key, entry);
      }
    });

    setChartData(Array.from(map.values()));
  };

  if (!loaded) return <PageLoader rows={2} />;

  const hasData = data.food.length > 0 || data.exercise.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12 max-w-6xl mx-auto"
    >
      <PageHeader
        icon={TrendingUp}
        title="Analytics & Trends"
        description="Visualize your progress over the last 7 days."
      />

      {!hasData ? (
        <EmptyState icon={TrendingUp} title="Nothing to chart yet" description="Log a few meals and workouts on Smart Track to see your calorie trends here." />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-bold mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Calories In vs Out
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#333"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="caloriesIn"
                    name="In (Consumed)"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="caloriesOut"
                    name="Out (Burned)"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-bold mb-2">
              <Activity className="w-5 h-5 text-secondary" />
              Net Caloric Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData.map((d) => ({
                    ...d,
                    net: d.caloriesIn - d.caloriesOut,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#333"
                    opacity={0.2}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#888"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Balance"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(var(--secondary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      )}
    </motion.div>
  );
}
