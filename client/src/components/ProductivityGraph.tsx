import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";

interface ProductivityPoint {
  time: string;
  timestamp: number; // hour as number (e.g., 12 for 12PM, 13 for 1PM)
  efficiency: number; // percentage (0-100)
}

interface ProductivityGraphProps {
  data: ProductivityPoint[];
  timeRange: { start: number; end: number }; // start and end hours
}

export default function FocusFlowChart({ data, timeRange }: ProductivityGraphProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Focus Flow</CardTitle>
          <CardDescription>No productivity data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No productivity data to display
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for Recharts
  const chartData = data.map(d => ({
    name: d.time,
    value: d.efficiency
  }));

  // Calculate average efficiency
  const averageEfficiency = Math.round(
    data.reduce((sum, point) => sum + point.efficiency, 0) / data.length
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Focus Flow</CardTitle>
        <CardDescription>
          Track your productivity peaks and valleys throughout the workday
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48" data-testid="focus-flow-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="focusFlowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <ReferenceLine 
                y={averageEfficiency} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="2 2"
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                fill="url(#focusFlowGradient)"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 5, stroke: "hsl(var(--chart-2))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Average efficiency: {averageEfficiency}% (dashed line)
        </div>
      </CardContent>
    </Card>
  );
}