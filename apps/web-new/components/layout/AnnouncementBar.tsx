"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("announcement-dismissed");
    if (dismissed === "true") {
      setVisible(false);
    }
  }, []);

  function close() {
    localStorage.setItem("announcement-dismissed", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative bg-black text-white">
      <div className="mx-auto flex max-w-[1472px] items-center justify-center px-6 py-2.5 text-center">

        <p className="text-xs md:text-sm font-medium">
          Luuku is building an autonomous operator for its own business —
          <a
            href="/build"
            className="ml-2 underline underline-offset-4"
          >
            Follow the build →
          </a>
        </p>

        <button
          onClick={close}
          className="absolute right-6"
        >
          <X className="h-5 w-5 opacity-70 hover:opacity-100" />
        </button>

      </div>
    </div>
  );
}