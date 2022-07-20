import { useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/outline";

export default function Section({
  title,
  defaultOpen,
  children,
  className,
  level = 1,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { marginClass, borderClass, HeadingComponent, headingTextStyle } =
    getAttributes(level);

  return (
    <div className={`w-full ${className}`}>
      <div className={`flex justify-between items-center ${marginClass}`}>
        <button
          className="py-5 w-full cursor-pointer select-none focus:outline-none text-left"
          onClick={() => setOpen(!open)}
        >
          <HeadingComponent
            className={`${
              open ? "text-indigo-700" : "text-gray-600"
            } font-thin ${headingTextStyle}`}
          >
            {title}
          </HeadingComponent>
        </button>
        <Toggle open={open} onClick={() => setOpen(!open)} />
      </div>
      {open ? (
        <div className={`font-thin bg-gray-50 ${borderClass}`}>{children}</div>
      ) : null}
    </div>
  );
}

function Toggle({ open, type, onClick }) {
  return (
    <button
      className={`focus:outline-none focus:ring-1 ring-indigo-400 rounded-full border transform ${
        open ? "border-indigo-600 bg-indigo-600 rotate-180" : "border-grey"
      } ${
        type === "small" ? "w-4 h-4" : "w-7 h-7"
      } flex items-center justify-center transition-transform`}
      onClick={onClick}
    >
      <ChevronUpIcon className={open ? "text-white" : "text-grey"} />
    </button>
  );
}

function getAttributes(level) {
  switch (level) {
    case 1:
      return {
        marginClass: "mx-4",
        HeadingComponent: "h2",
        borderClass: "border-t border-grey",
        headingTextStyle: "text-lg",
      };
    case 2:
      return {
        marginClass: "",
        HeadingComponent: "h3",
        borderClass: "",
        headingTextStyle: "",
      };
    default:
      throw new Error(`Unhandled Section level ${level}.`);
  }
}
