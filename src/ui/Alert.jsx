import { FloatingOverlay } from "@floating-ui/react";
import {
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XIcon,
} from "@heroicons/react/outline";

export default function Alert({ message, detail, type = "info", onClose }) {
  const background =
    type === "info"
      ? "bg-indigo-500"
      : type === "success"
      ? "bg-green-500"
      : type === "warning"
      ? "bg-yellow-500"
      : type === "danger"
      ? "bg-red-500"
      : "bg-white";
  const Icon = getIcon(type);
  return (
    <FloatingOverlay
      lockScroll
      style={{ background: "rgba(0, 0, 0, 0.6)", zIndex: 10000 }}
    >
      <div className="w-full h-full flex justify-center items-center">
        <div
          className={`${background} rounded text-white text-sm font-bold px-4 py-3 relative shadow-lg`}
          role="alert"
        >
          <div className="flex flex-row justify-between items-start">
            <Icon className="h-7 w-7 mr-2" />
            <div>
              <p className="mb-4">{message}</p>
              <p className="font-thin max-w-md text-wrap overflow-hidden">
                {detail}
              </p>
            </div>
            <button onClick={onClose}>
              <XIcon className="h-7 w-7" />
            </button>
          </div>
        </div>
      </div>
    </FloatingOverlay>
  );
}

function getIcon(type) {
  switch (type) {
    case "info":
      return InformationCircleIcon;
    case "success":
      return CheckCircleIcon;
    case "warning":
    case "danger":
      return ExclamationCircleIcon;
    default:
      console.warn(`Unknown alert type "${type}"`);
  }
}
