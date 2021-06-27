import React from "react";
import { useUndo } from "./store";

export default function Toolbar() {
  const { undo, redo } = useUndo();

  return (
    <div className="relative">
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10 top-0">
        <ToolButton disabled={!undo} onClick={undo || null}>
          Undo
        </ToolButton>
        <ToolButton disabled={!redo} onClick={redo || null}>
          Redo
        </ToolButton>
      </div>
    </div>
  );
}

function ToolButton({ onClick, disabled, children }) {
  return (
    // TODO: rounded doesn't really work
    <button
      className={`
        px-2
        py-1
        first:rounded-l
        last:rounded-r
        -ml-px
        first:ml-auto
        border
        border-gray-300
        ${disabled ? "text-gray-400" : "text-gray-600"}
        font-thin
        bg-white`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
