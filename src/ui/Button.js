import React from "react";

export default function Button({ children, onClick, className }) {
  return (
    <button
      className={`rounded-lg font-thin bg-indigo-600 text-white px-4 py-2 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
