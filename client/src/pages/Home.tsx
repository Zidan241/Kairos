import DayPlan from "@/components/DayPlan";
import ProductivityDashboard from "@/components/ProductivityDashboard";
import DayScheduleTimeline from "@/components/DayScheduleTimeline";

export default function Home() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Section - Productivity Metrics - Fixed height */}
      <div className="w-full flex-shrink-0 p-6 pb-3" data-testid="section-productivity-metrics">
        <ProductivityDashboard />
      </div>
      
      {/* Bottom Section - Day Plan and Schedule Timeline - Scrollable */}
      <div className="flex flex-row gap-6 flex-1 min-h-0 px-6 pb-6">
        {/* Day Plan */}
        <div className="w-1/2 flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            <DayPlan />
          </div>
        </div>
        
        {/* Day Schedule Timeline */}
        <div className="w-1/2 flex flex-col min-h-0" data-testid="section-day-schedule">
          <div className="flex-1 overflow-hidden">
            <DayScheduleTimeline />
          </div>
        </div>
      </div>
    </div>
  );
}