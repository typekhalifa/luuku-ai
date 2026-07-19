import {
    Activity,
    BarChart3,
    Bot,
    Building2,
    GitBranch,
    LayoutDashboard,
    Settings
} from "lucide-react";

export const navigation = [

    {
        title: "Overview",
        href: "/",
        icon: LayoutDashboard
    },

    {
        title: "Agents",
        href: "/agents",
        icon: Bot
    },

    {
        title: "Workflows",
        href: "/workflows",
        icon: GitBranch
    },

    {
        title: "CRM",
        href: "/crm",
        icon: Building2
    },

    {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3
    },

    {
        title: "Events",
        href: "/events",
        icon: Activity
    },

    {
        title: "Settings",
        href: "/settings",
        icon: Settings
    }

];