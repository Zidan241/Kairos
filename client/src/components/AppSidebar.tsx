import { CircleDot, SlidersHorizontal, LayoutList, Sparkles, FileText } from "lucide-react";
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
} from "@/components/ui/sidebar";
import SidebarStatusAnimation from "@/components/SidebarStatusAnimation";

const menuItems = [
  {
    title: "Focus",
    url: "/",
    icon: CircleDot,
  },
  {
    title: "Plan",
    url: "/planning",
    icon: LayoutList,
  },
  {
    title: "Notes",
    url: "/notes",
    icon: FileText,
  },
  {
    title: "Reflect",
    url: "/reports",
    icon: Sparkles,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: SlidersHorizontal,
  },
];

export default function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
      </SidebarContent>
      <SidebarFooter className="pb-6 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:pb-6">
        <SidebarStatusAnimation />
      </SidebarFooter>
    </Sidebar>
  );
}