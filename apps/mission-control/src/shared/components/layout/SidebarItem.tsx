import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {

    title: string;

    icon: LucideIcon;

    active?: boolean;

}

export default function SidebarItem({

    title,

    icon: Icon,

    active = false

}: SidebarItemProps) {

    return (

        <button
            className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200

            ${active

                ? "bg-indigo-600 text-white"

                : "text-neutral-400 hover:bg-neutral-900 hover:text-white"

            }`}
        >

            <Icon size={18} />

            <span>

                {title}

            </span>

        </button>

    );

}