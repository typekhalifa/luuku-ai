import type { ReactNode } from "react";

import Sidebar from "./Sidebar";

import Topbar from "./Topbar";

interface ShellProps {

    children: ReactNode;

}

export default function Shell({

    children

}: ShellProps) {

    return (

        <div className="flex min-h-screen bg-neutral-950 text-white">

            <Sidebar />

            <main className="flex flex-1 flex-col">

                <Topbar />

                <div className="flex-1 overflow-y-auto">

                    {children}

                </div>

            </main>

        </div>

    );

}