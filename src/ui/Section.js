import { useState } from "react";
import Toggle from "./Toggle";

export default function Section({
  title,
  defaultOpen,
  children,
  className,
  headingComponent: HeadingComponent = "h2",
  headingTextStyle = "text-lg",
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`w-full p-4 ${className}`}>
      <div className="flex justify-between items-center">
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
      {open ? <div className="font-thin">{children}</div> : null}
    </div>
  );
}
