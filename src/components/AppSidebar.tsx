
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Upload,
  FileSpreadsheet,
  Settings,
  Shield,
  BarChart3,
  Download,
  Clock,
  ChevronRight
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & Analytics'
  },
  {
    title: 'File Upload',
    url: '/upload',
    icon: Upload,
    description: 'Import Data Files'
  },
  {
    title: 'Risk Analysis',
    url: '/analysis',
    icon: BarChart3,
    description: 'Risk Assessment Tools'
  },
  {
    title: 'Evening Intersegment',
    url: '/evening-intersegment',
    icon: Clock,
    description: 'End-of-Day Processing'
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileSpreadsheet,
    description: 'Generate Reports'
  },
  {
    title: 'Downloads',
    url: '/downloads',
    icon: Download,
    description: 'Export Center'
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    description: 'System Configuration'
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === 'collapsed';

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "group relative bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 font-medium border-l-4 border-blue-600 shadow-sm" 
      : "group relative hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 text-slate-700 hover:text-slate-900 transition-all duration-200";

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-72"} collapsible="icon">
      <SidebarContent className="bg-white border-r border-slate-200 shadow-sm">
        {/* Modern Logo Section */}
        <div className={`p-6 border-b border-slate-100 ${isCollapsed ? 'p-4' : ''}`}>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-bold text-xl text-slate-800 tracking-tight">RMS</h2>
                <p className="text-xs text-slate-500 font-medium">Risk Management System</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className={`px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-widest ${isCollapsed ? 'hidden' : ''}`}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavCls}
                    >
                      <div className="flex items-center space-x-3 py-3 px-3 rounded-lg transition-all duration-200">
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{item.title}</span>
                            <p className="text-xs text-slate-500 truncate">{item.description}</p>
                          </div>
                        )}
                        {!isCollapsed && isActive(item.url) && (
                          <ChevronRight className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Modern Status Footer */}
        {!isCollapsed && (
          <div className="mt-auto p-4 border-t border-slate-100">
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <p className="text-xs font-medium text-green-800">System Online</p>
                <p className="text-xs text-green-600">All services active</p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
