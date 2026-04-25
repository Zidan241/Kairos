import { CircleDot, SlidersHorizontal, LayoutList, Sparkles, FileText, Repeat, Target } from "lucide-react";
import { Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import SidebarStatusAnimation from "./SidebarStatusAnimation";

const coreItems = [
  { title: "Focus", url: "/", icon: CircleDot },
  { title: "Plan", url: "/planning", icon: LayoutList },
  { title: "Reflect", url: "/reports", icon: Sparkles },
];

const organizeItems = [
  { title: "Notes", url: "/notes", icon: FileText },
  { title: "Habits", url: "/habits", icon: Repeat },
  { title: "Goals", url: "/goals", icon: Target },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: SlidersHorizontal },
];

function MenuGroup({ items }: { items: typeof coreItems }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <MenuGroup items={coreItems} />
        <SidebarSeparator />
        <MenuGroup items={organizeItems} />
        <SidebarSeparator />
        <MenuGroup items={settingsItems} />
      </SidebarContent>
      <SidebarFooter className="pb-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:pb-6">
        <SidebarStatusAnimation />
      </SidebarFooter>
    </Sidebar>
  );
}