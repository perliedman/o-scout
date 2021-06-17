import React, { useState } from "react";
import Courses from "./Courses";
import MapSection from "./MapSection";
import PrintAndExport from "./PrintAndExport";
import Toggle from "./ui/Toggle";

export default function Sidebar() {
  return (
    <div className="absolute z-10 shadow-xl border-l border-gray-200 inset-y-0 right-0 w-1/4 h-full bg-white">
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
