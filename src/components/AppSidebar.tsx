
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
  ChevronRight,
} from 'lucide-react';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & Analytics',
    color: 'text-blue-600'
  },
  {
    title: 'File Upload',
    url: '/upload',
    icon: Upload,
    description: 'Import Data Files',
    color: 'text-green-600'
  },
  {
    title: 'Risk Analysis',
    url: '/analysis',
    icon: BarChart3,
    description: 'Risk Assessment Tools',
    color: 'text-purple-600'
  },
  {
    title: 'Evening Intersegment',
    url: '/evening-intersegment',
    icon: Clock,
    description: 'End-of-Day Processing',
    color: 'text-orange-600'
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileSpreadsheet,
    description: 'Generate Reports',
    color: 'text-indigo-600'
  },
  {
    title: 'Downloads',
    url: '/downloads',
    icon: Download,
    description: 'Export Center',
    color: 'text-teal-600'
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    description: 'System Configuration',
    color: 'text-slate-600'
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar 
      className={`transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"} border-r border-slate-200 shadow-lg bg-white`} 
      collapsible="icon"
    >
      <SidebarContent className="bg-transparent">
        {/* Logo Section */}
        <div className={`transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-6'} border-b border-slate-200`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="relative">
              <div className={`bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-lg transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-2.5'}`}>
                <Shield className={`text-white transition-all duration-300 ${isCollapsed ? 'h-5 w-5' : 'h-6 w-6'}`} />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
            </div>
            {!isCollapsed && (
              <div className="transition-all duration-300">
                <h2 className="font-bold text-xl text-slate-800 tracking-tight">RMS Pro</h2>
                <p className="text-xs text-slate-500 font-medium">Risk Management Suite</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className={`transition-all duration-300 ${isCollapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
          {/* Only show subheading when expanded */}
          {!isCollapsed && (
            <SidebarGroupLabel className="px-2 py-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isItemActive = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <NavLink 
                        to={item.url} 
                        className={`group relative transition-all duration-200 ${
                          isItemActive 
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold border-r-4 border-blue-600 shadow-sm" 
                            : "hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <div className={`flex items-center transition-all duration-200 ${isCollapsed ? 'justify-center py-3 px-2' : 'space-x-3 py-3 px-3'} rounded-lg`}>
                          <item.icon 
                            className={`flex-shrink-0 transition-all duration-200 h-5 w-5 ${
                              isItemActive ? 'text-blue-600' : item.color
                            }`} 
                          />
                          {!isCollapsed && (
                            <div className="flex-1 min-w-0 transition-all duration-300">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium truncate">{item.title}</span>
                                {isItemActive && <ChevronRight className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                            </div>
                          )}
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Status Footer */}
        <div className={`mt-auto transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'} border-t border-slate-200`}>
          {!isCollapsed ? (
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 shadow-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-emerald-800">System Online</p>
                <p className="text-xs text-emerald-600">All services active</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
