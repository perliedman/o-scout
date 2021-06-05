import React, { useState } from "react";
import Courses from "./Courses";
import SelectMap from "./SelectMap";
import { useMap } from "./store";

export default function Sidebar() {
  const mapFilename = useMap(getMapFilename);
  return (
    <div className="absolute z-10 shadow-xl border-l border-gray-200 inset-y-0 right-0 w-1/4 h-full bg-white">
      <Section title="Map" defaultOpen={false}>
        {mapFilename}
        <div className="mt-2">
          <SelectMap>Select map</SelectMap>
        </div>
      </Section>
      <Section title="Courses" defaultOpen={true}>
        <Courses />
      </Section>
    </div>
  );
}

function getMapFilename(state) {
  return state.mapFilename;
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

function Toggle({ open, onClick }) {
  return (
    <button
      className={`rounded-full border transform ${
        open ? "border-indigo-600 bg-indigo-600" : "border-grey rotate-180"
      } w-7 h-7 flex items-center justify-center transition-transform`}
      onClick={onClick}
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="24"
        stroke={open ? "white" : "#606F7B"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}
