import React from "react";

export default function Button({
  children,
  onClick,
  className,
  disabled,
  type = "normal",
}) {
  return (
    <button
      className={`focus:outline-none focus:ring-2 ring-indigo-600 rounded font-thin ${
        type === "primary"
          ? "bg-indigo-600 text-white"
          : "text-indigo-700 border-2 border-indigo-600"
      } text-white px-4 py-2 ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
