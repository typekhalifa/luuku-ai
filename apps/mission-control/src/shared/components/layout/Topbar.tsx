import { Bell, Search } from "lucide-react";

export default function Topbar() {

    return (

        <header className="flex h-20 items-center justify-between border-b border-neutral-800 bg-neutral-950 px-8">

            <div>

                <h2 className="text-2xl font-bold">

                    Mission Control

                </h2>

            </div>

            <div className="flex items-center gap-4">

                <div className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2">

                    <Search size={18} />

                    <input
                        placeholder="Search..."
                        className="bg-transparent outline-none"
                    />

                </div>

                <button className="rounded-xl border border-neutral-800 p-3 hover:bg-neutral-900">

                    <Bell size={18} />

                </button>

            </div>

        </header>

    );

}