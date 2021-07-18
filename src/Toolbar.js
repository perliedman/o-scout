import React, { useState } from "react";
import { useUndo } from "./store";
import EditControls from "./tools/EditControls";
import PrintArea from "./tools/PrintArea";

const Modes = idHash({
  printArea: { label: "Print Area", component: PrintArea },
  editControls: { label: "Edit", component: EditControls },
});
const modes = [Modes.editControls, Modes.printArea];

export default function Toolbar() {
  const { undo, redo } = useUndo();
  const [activeMode, setActiveMode] = useState();
  const ActiveModeComponent = Modes[activeMode]?.component;

  return (
    <div className="relative">
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10 top-0">
        {modes.map(({ id, label }) => (
          <ModeButton
            key={id}
            active={id === activeMode}
            onClick={() => setActiveMode(id !== activeMode ? id : null)}
          >
            {label}
          </ModeButton>
        ))}
        <ToolButton disabled={!undo} onClick={undo || null}>
          Undo
        </ToolButton>
        <ToolButton disabled={!redo} onClick={redo || null}>
          Redo
        </ToolButton>
        {ActiveModeComponent && <ActiveModeComponent />}
      </div>
    </div>
  );
}

function ModeButton({ active, ...props }) {
  return (
    <ToolButton
      colorClassName={`${active ? "bg-indigo-600 text-white" : null}`}
      {...props}
    />
  );
}

function ToolButton({
  onClick,
  disabled,
  colorClassName = "text-gray-600 bg-white",
  children,
}) {
  return (
    <button
      className={`
        px-2
        py-1
        first:rounded-bl-md
        last:rounded-br-md
        -ml-px
        first:ml-auto
        border
        border-t-0
        border-gray-300
        ${disabled ? "text-gray-400" : colorClassName}
        font-thin
        bg-white
        focus:outline-none`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function idHash(object) {
  Object.entries(object).forEach(([key, val]) => {
    val.id = key;
  });
  return object;
}
