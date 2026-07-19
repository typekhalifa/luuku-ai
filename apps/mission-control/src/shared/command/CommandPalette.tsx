import { Search } from "lucide-react";

import {
    useEffect,
    useState,
} from "react";

const commands = [

    "Open Executive AI",
    "Open CRM",
    "Create Company",
    "Create Deal",
    "Create Workflow",
    "Restart Agent",
    "Run Research AI",
    "View Analytics",
    "Open Database",
    "Generate Report",
    "Mission Control",
    "Open Settings",

];

export default function CommandPalette() {

    const [open, setOpen] = useState(false);

    const [query, setQuery] = useState("");

    useEffect(() => {

        const handler = (e: KeyboardEvent) => {

            if (e.ctrlKey && e.key.toLowerCase() === "k") {

                e.preventDefault();

                setOpen((v) => !v);

            }

            if (e.key === "Escape") {

                setOpen(false);

            }

        };

        window.addEventListener(

            "keydown",

            handler

        );

        return () =>

            window.removeEventListener(

                "keydown",

                handler

            );

    }, []);

    if (!open) return null;

    const filtered = commands.filter((c) =>

        c.toLowerCase().includes(

            query.toLowerCase()

        )

    );

    return (

        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-32">

            <div className="w-[700px] overflow-hidden rounded-3xl border border-white/10 bg-[#101114] shadow-[0_20px_80px_rgba(0,0,0,.55)]">

                <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">

                    <Search size={20} />

                    <input

                        autoFocus

                        placeholder="Search everything..."

                        value={query}

                        onChange={(e) =>

                            setQuery(e.target.value)

                        }

                        className="w-full bg-transparent outline-none"

                    />

                </div>

                <div className="max-h-[420px] overflow-auto">

                    {filtered.map((item) => (

                        <button

                            key={item}

                            className="flex w-full items-center justify-between border-b border-white/5 px-6 py-4 text-left transition hover:bg-white/5"

                        >

                            {item}

                        </button>

                    ))}

                </div>

            </div>

        </div>

    );

}