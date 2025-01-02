export default function Button({
  children,
  onClick,
  className,
  disabled,
  type = "normal",
  size = "normal",
}) {
  return (
    <button
      className={`focus:outline-none focus:ring-2 ring-indigo-600 rounded font-thin ${
        type === "primary"
          ? "bg-indigo-600 text-white"
          : "text-indigo-700  border-indigo-600"
      } ${
        size === "small" ? "px-1 py-px text-xs border" : "px-4 py-2 border-2"
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
