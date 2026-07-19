import SidebarItem from "./SidebarItem";

import { navigation } from "@/lib/navigation";

export default function Sidebar() {

    return (

        <aside className="flex h-screen w-72 flex-col border-r border-neutral-800 bg-neutral-950">

            <div className="border-b border-neutral-800 p-8">

                <h1 className="text-2xl font-bold">

                    LUUKU AI

                </h1>

                <p className="mt-2 text-sm text-neutral-500">

                    Mission Control

                </p>

            </div>

            <nav className="flex-1 space-y-2 p-4">

                {navigation.map(

                    (item, index) => (

                        <SidebarItem

                            key={item.title}

                            title={item.title}

                            icon={item.icon}

                            active={index === 0}

                        />

                    )

                )}

            </nav>

            <div className="border-t border-neutral-800 p-6">

                <div className="rounded-xl bg-neutral-900 p-4">

                    <div className="flex items-center gap-2">

                        <div className="h-3 w-3 rounded-full bg-green-500" />

                        <span className="font-medium">

                            Runtime Online

                        </span>

                    </div>

                    <p className="mt-3 text-sm text-neutral-500">

                        Version 1.0

                    </p>

                </div>

            </div>

        </aside>

    );

}