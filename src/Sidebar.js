import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/outline";
import React, { useState } from "react";
import Courses from "./Courses";
import MapSection from "./MapSection";
import PrintAndExport from "./PrintAndExport";
import Section from "./ui/Section";

export default function Sidebar() {
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed inset-y-0 right-0 flex z-20 w-8">
      <div className="absolute flex top-0 h-screen right-0">
        <button
          className="
            w-8
            h-32
            p-1
            my-auto
            rounded
            text-gray-600
            bg-white
            opacity-75
            border
            border-r-0
            border-gray-200
            shadow-lg
            text-center
            transition-colors
            hover:bg-gray-100
            focus:outline-none"
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
          <Section
            title="Map"
            defaultOpen={false}
            className="border-b border-gray-200"
          >
            <MapSection />
          </Section>
          <Section
            title="Courses"
            defaultOpen={true}
            className="border-b border-gray-200"
          >
            <Courses />
          </Section>
          <Section
            title="Print &amp; Export"
            defaultOpen={false}
            className="border-b border-gray-200"
          >
            <PrintAndExport />
          </Section>
        </div>
      </div>
    </div>
  );
}
