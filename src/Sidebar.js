import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/outline";
import React, { useState } from "react";
import Courses from "./Courses";
import MapSection from "./MapSection";
import PrintAndExport from "./PrintAndExport";
import Toggle from "./ui/Toggle";

export default function Sidebar() {
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed inset-y-0 right-0 flex z-20 w-8">
      <div className="absolute flex top-0 h-screen right-0 flew-row">
        <button
          className="w-8 h-32 p-1 my-auto rounded text-gray-400 bg-white border border-gray-200 shadow-l text-center focus:outline-none"
          onClick={() => setOpen(!open)}
        >
          <span className="block font-bold">
            {open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </span>
        </button>
        <div
          className={`
          transition-all duration-200
          ${open ? "w-sidebar" : "w-0"}
          shadow-xl
          border-l
          border-gray-200
          h-full
          overflow-y-auto
          bg-white`}
        >
          <Section title="Map" defaultOpen={false}>
            <MapSection />
          </Section>
          <Section title="Courses" defaultOpen={true}>
            <Courses />
          </Section>
          <Section title="Print &amp; Export" defaultOpen={false}>
            <PrintAndExport />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 w-full p-4">
      <header
        className="flex justify-between items-center py-5 cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <h2
          className={`${
            open ? "text-indigo-700" : "text-gray-600"
          } font-thin text-lg`}
        >
          {title}
        </h2>
        <Toggle open={open} />
      </header>
      {open ? <div className="font-thin">{children}</div> : null}
    </div>
  );
}
