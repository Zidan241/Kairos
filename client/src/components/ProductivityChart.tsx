import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";

interface ProductivityChartProps {
  title: string;
  description?: string;
  data: Array<{
    name: string;
    value: number;
  }>;
  average?: number;
  color?: string;
}

export default function ProductivityChart({ 
  title, 
  description, 
  data, 
  average,
  color = "hsl(var(--chart-1))" 
}: ProductivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-32" data-testid={`chart-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              {average && (
                <ReferenceLine 
                  y={average} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="2 2"
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {average && (
          <div className="text-xs text-muted-foreground mt-2">
            Average: {average} (dashed line)
          </div>
        )}
      </CardContent>
    </Card>
  );
}