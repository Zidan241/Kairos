import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  unit?: string;
  icon?: React.ReactNode;
  trendPeriod?: string;
  /** When true, a positive change is bad (red) and negative is good (green). */
  invertTrend?: boolean;
}

export default function MetricCard({ title, value, change, unit = "", icon, trendPeriod = "yesterday", invertTrend = false }: MetricCardProps) {
  const positiveColor = invertTrend ? "text-chart-5" : "text-chart-2";
  const negativeColor = invertTrend ? "text-chart-2" : "text-chart-5";

  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className={`h-4 w-4 ${positiveColor}`} />;
    if (change < 0) return <TrendingDown className={`h-4 w-4 ${negativeColor}`} />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return "text-muted-foreground";
    if (change > 0) return positiveColor;
    if (change < 0) return negativeColor;
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}{unit}
        </div>
        {change !== undefined && (
          <div className="flex items-center pt-1">
            {getTrendIcon()}
            <span className={`text-xs ml-1 ${getTrendColor()}`}>
              {change > 0 ? '+' : ''}{change}% from {trendPeriod}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}