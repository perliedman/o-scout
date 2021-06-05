import React from "react";

export default function Button({ children, onClick, className, disabled }) {
  return (
    <button
      className={`rounded-lg font-thin bg-indigo-600 text-white px-4 py-2 ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
