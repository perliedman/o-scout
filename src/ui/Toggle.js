import { ChevronUpIcon } from "@heroicons/react/outline";

export default function Toggle({ open, type, onClick }) {
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
