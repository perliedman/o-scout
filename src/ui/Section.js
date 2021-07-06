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
      <button
        className="py-5 w-full cursor-pointer select-none focus:outline-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex justify-between items-center">
          <HeadingComponent
            className={`${
              open ? "text-indigo-700" : "text-gray-600"
            } font-thin ${headingTextStyle}`}
          >
            {title}
          </HeadingComponent>
          <Toggle open={open} />
        </div>
      </button>
      {open ? <div className="font-thin">{children}</div> : null}
    </div>
  );
}
