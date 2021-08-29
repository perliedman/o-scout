import React, { useState } from "react";
import { useUndo } from "./store";
import EditControls from "./tools/EditControls";
import PrintArea from "./tools/PrintArea";
import { useHotkeys } from "react-hotkeys-hook";
import CreateCourse from "./tools/CreateCourse";
import ToolButton, { ModeButton } from "./ui/ToolButton";

const Modes = idHash({
  printArea: { label: "Area", component: PrintArea },
  editControls: { label: "Edit", component: EditControls },
  createCourse: { label: "Create", component: CreateCourse },
});
const modes = [Modes.createCourse, Modes.editControls, Modes.printArea];

export default function Toolbar() {
  const { undo, redo } = useUndo();
  const [activeMode, setActiveMode] = useState(modes[0].id);
  const ActiveModeComponent = Modes[activeMode]?.component;

  useHotkeys("ctrl+z", undo || voidFn, [undo]);
  useHotkeys("ctrl+y", redo || voidFn, [redo]);

  return (
    <div className="relative">
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10 top-0 flex flex-col items-center">
        <div>
          {modes.map(({ id, label }) => (
            <ModeButton
              key={id}
              active={id === activeMode}
              onClick={() => setActiveMode(id)}
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
        </div>
        {ActiveModeComponent && <ActiveModeComponent />}
      </div>
    </div>
  );
}

function idHash(object) {
  Object.entries(object).forEach(([key, val]) => {
    val.id = key;
  });
  return object;
}

function voidFn() {}
