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
    <div className="container">
      <div
        className={`container w-96 ${background} flex items-center text-white text-sm font-bold px-4 py-3 relative`}
        role="alert"
      >
        <Icon className="h-7 w-7 mr-2" />
        <div>
          <p>{message}</p>
          <p className="font-thin">{detail}</p>
        </div>

        <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
          <button onClick={onClose}>
            <XIcon className="h-7 w-7" />
          </button>
        </span>
      </div>
    </div>
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
