import { useSidebar } from "@/components/ui/sidebar";
import { useActiveSubtask } from "@/hooks/useTasks";

/**
 * Morphing blob animation in sidebar footer.
 * Lively organic shape when focusing, calm slow drift when idle.
 */
export default function SidebarStatusAnimation() {
  const { data: activeSubtask } = useActiveSubtask();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = !!activeSubtask;

  const size = collapsed ? 24 : 44;

  return (
    <div className={`flex flex-col items-center select-none ${collapsed ? "" : "gap-1.5 px-2 py-1"}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer glow */}
        <div
          className={`absolute inset-0 blur-md rounded-full transition-colors duration-1000 ${
            isActive ? "bg-status-active/25" : "bg-muted-foreground/8"
          }`}
          style={{
            animation: isActive
              ? 'blob-morph 4s ease-in-out infinite, blob-rotate 8s linear infinite'
              : 'blob-morph-idle 8s ease-in-out infinite',
          }}
        />
        {/* Main blob */}
        <div
          className={`absolute inset-[2px] transition-all duration-1000 ${
            isActive
              ? "bg-status-active shadow-[0_0_12px_hsl(var(--active)/0.3)]"
              : "bg-gradient-to-br from-muted-foreground/15 to-muted-foreground/8"
          }`}
          style={{
            animation: isActive
              ? 'blob-morph 4s ease-in-out infinite, blob-rotate 8s linear infinite'
              : 'blob-morph-idle 8s ease-in-out infinite',
          }}
        />
        {/* Inner highlight */}
        <div
          className={`absolute transition-opacity duration-1000 ${
            collapsed ? "inset-[6px]" : "inset-[10px]"
          } ${
            isActive ? "bg-status-active/40" : "bg-muted-foreground/5"
          }`}
          style={{
            animation: isActive
              ? 'blob-morph 4s ease-in-out 1s infinite'
              : 'blob-morph-idle 8s ease-in-out 2s infinite',
          }}
        />
      </div>

      {!collapsed && (
        <span className={`text-[10px] font-medium tracking-wider uppercase transition-colors duration-1000 ${
          isActive ? "text-status-active/70" : "text-muted-foreground/30"
        }`}/>
      )}
    </div>
  );
}
