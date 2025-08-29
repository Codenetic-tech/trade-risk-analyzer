// AppSidebar.tsx
import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Sunrise,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  CheckSquare,
  Settings,
  Shield,
  ChevronRight,
  ChevronDown,
  IndianRupee,
  LogOut,
  User,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { toast } from '@/hooks/use-toast';

// Define all possible menu items
const allMenuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-600',
    roles: ['Risk Manager', 'Analyst'] // All roles can see dashboard
  },
  {
    title: 'Morning BOD',
    url: '/morning-bod',
    icon: Sunrise,
    color: 'text-orange-600',
    roles: ['Risk Manager', 'Analyst'], // Only Risk Manager and Analyst
    subItems: [
      { title: 'NSE CM', url: '/morning-bod/nse-cm', roles: ['Risk Manager', 'Analyst'] },
      { title: 'NSE F&O', url: '/morning-bod/nse-fo', roles: ['Risk Manager', 'Analyst'] },
      { title: 'NSE CD', url: '/morning-bod/nse-cd', roles: ['Risk Manager', 'Analyst'] },
      { title: 'MCX', url: '/morning-bod/mcx', roles: ['Risk Manager', 'Analyst'] },
    ]
  },
  {
    title: 'Morning Intersegment',
    url: '/morning-intersegment',
    icon: Clock,
    color: 'text-purple-600',
    roles: ['Risk Manager', 'Analyst'] // Only Risk Manager and Analyst
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileSpreadsheet,
    color: 'text-indigo-600',
    roles: ['Risk Manager', 'Analyst'] // Only Risk Manager and Analyst
  },
  {
    title: 'Brokerage',
    url: '/brokerage',
    icon: TrendingUp,
    color: 'text-green-600',
    roles: ['Risk Manager', 'Analyst'] // Only Risk Manager and Analyst
  },
  {
    title: 'Evening Intersegment',
    url: '/evening-intersegment',
    icon: Clock,
    color: 'text-purple-600',
    roles: ['Risk Manager', 'Analyst'] // Only Risk Manager and Analyst
  },
  {
    title: 'Allocation Check',
    url: '/allocation-check',
    icon: CheckSquare,
    color: 'text-teal-600',
    roles: ['Risk Manager', 'Analyst'] // Only Risk Manager and Analyst
  },
  {
    title: 'Payout',
    url: '/payout',
    icon: IndianRupee,
    color: 'text-teal-600',
    roles: ['Risk Manager', 'Analyst', 'Banking'] // All roles can see payout
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
    color: 'text-slate-600',
    roles: ['Risk Manager'] // Only Risk Manager
  },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedItems, setExpandedItems] = useState<string[]>(['Morning BOD']);
  const { user, logout } = useAuth(); // Get current user and logout function

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === 'collapsed';

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    if (!user) return [];
    
      return allMenuItems.filter(item => {
      // First, check if user has access to the main item
      if (!item.roles.includes(user.role)) return false;
      
      // For items with subitems, filter the subitems
      if (item.subItems) {
        item.subItems = item.subItems.filter(subItem => 
          subItem.roles.includes(user.role)
        );
        // Only show main item if it has visible subitems
        return item.subItems.length > 0;
      }
      
      return true;
    });
  }, [user]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  return (
    <div className="relative">
      <Sidebar 
        className={`transition-all duration-300 ${isCollapsed ? "w-16" : "w-64"} border-r border-slate-200 shadow-lg bg-white`} 
        collapsible="icon"
      >
        <SidebarContent className="bg-transparent">
          {/* Logo Section */}
          <div className={`transition-all duration-300 ${isCollapsed ? 'p-3' : 'p-3'} border-b border-slate-200`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
              <div className="relative">
                <div className={`bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-lg transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-2.5'}`}>
                  <Shield className={`text-white transition-all duration-300 ${isCollapsed ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
              </div>
              {!isCollapsed && (
                <div className="transition-all duration-300">
                  <h2 className="font-bold text-xl text-slate-800 tracking-tight">GoPocket</h2>
                  {user && (
                    <p className="text-xs text-slate-500 mt-1">
                      {user.role} • {user.username}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <SidebarGroup className={`transition-all duration-300 ${isCollapsed ? 'px-1 py-3 mt-6' : 'px-4 py-4 mt-6'}`}>
            <SidebarGroupContent className="mt-2">
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => {
                  const isItemActive = isActive(item.url);
                  const isExpanded = expandedItems.includes(item.title);
                  const hasSubItems = item.subItems && item.subItems.length > 0;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild={!hasSubItems}
                        tooltip={isCollapsed ? item.title : undefined}
                      >
                        {hasSubItems ? (
                          <button
                            onClick={() => toggleExpanded(item.title)}
                            className={`group relative transition-all duration-200 w-full text-left ${
                              currentPath.startsWith(item.url) 
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold border-r-4 border-blue-600 shadow-sm" 
                                : "hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 text-slate-700 hover:text-slate-900"
                            }`}
                          >
                            <div className={`flex items-center transition-all duration-200 ${
                              isCollapsed ? 'h-12 w-12 justify-center' : 'space-x-3 py-3 px-3'
                            } rounded-lg`}>
                              <item.icon 
                                className={`flex-shrink-0 transition-all duration-200 h-5 w-5 ${
                                  currentPath.startsWith(item.url) ? 'text-blue-600' : item.color
                                }`} 
                              />
                              {!isCollapsed && (
                                <div className="flex-1 min-w-0 transition-all duration-300">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium truncate">{item.title}</span>
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        ) : (
                          <NavLink 
                            to={item.url} 
                            className={`group relative transition-all duration-200 ${
                              isItemActive 
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 font-semibold border-r-4 border-blue-600 shadow-sm" 
                                : "hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 text-slate-700 hover:text-slate-900"
                            }`}
                          >
                            <div className={`flex items-center transition-all duration-200 ${
                              isCollapsed ? 'h-12 w-12 justify-center' : 'space-x-3 py-3 px-3'
                            } rounded-lg`}>
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
                                </div>
                              )}
                            </div>
                          </NavLink>
                        )}
                      </SidebarMenuButton>
                      
                      {hasSubItems && isExpanded && !isCollapsed && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems!.map((subItem) => (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to={subItem.url}
                                  className={`block py-2 px-3 text-sm rounded-md transition-colors ${
                                    isActive(subItem.url)
                                      ? 'bg-blue-100 text-blue-700 font-medium'
                                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                  }`}
                                >
                                  {subItem.title}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* User Profile & Logout Section */}
          <div className={`mt-auto transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'} border-t border-slate-200 space-y-3`}>
            {user && (
              <div className={`transition-all duration-300 ${isCollapsed ? 'px-1' : 'px-0'}`}>
                {!isCollapsed ? (
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{user.username}</p>
                        <p className="text-xs text-slate-500">{user.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4 text-slate-500 group-hover:text-red-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4 text-slate-500 group-hover:text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </SidebarContent>
      </Sidebar>

      {/* Modern Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`
          absolute top-20 z-50 
          flex items-center justify-center
          w-7 h-7
          bg-blue-600 hover:bg-blue-700
          rounded-full
          shadow-md hover:shadow-lg
          transition-all duration-300 ease-in-out
          hover:scale-110
          group
          ${isCollapsed ? '-right-3.5' : '-right-3.5'}
        `}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft 
          className={`
            h-4 w-4 
            text-white
            transition-all duration-300 ease-in-out
            ${isCollapsed ? 'rotate-180' : 'rotate-0'}
          `}
        />
      </button>
    </div>
  );
}