import { ComponentType, ReactElement } from "react";
import useEvent, { StateWithActions, useUndo } from "./store";
import EditControls from "./tools/EditControls";
import PrintArea from "./tools/PrintArea";
import { useHotkeys } from "react-hotkeys-hook";
import CreateCourse from "./tools/CreateCourse";
import ToolButton, { ModeButton } from "./ui/ToolButton";
import shallow from "zustand/shallow";
import { Mode } from "./store";

export const ModeMappings: ModeMap = idHash({
  [Mode.PrintArea]: { label: "Area", component: PrintArea },
  [Mode.EditControls]: { label: "Edit", component: EditControls },
  [Mode.CreateCourse]: { label: "Create", component: CreateCourse },
});

const modes: ToolbarMode[] = [
  ModeMappings[Mode.CreateCourse],
  ModeMappings[Mode.EditControls],
  ModeMappings[Mode.PrintArea],
];

export default function Toolbar(): ReactElement {
  const { undo, redo } = useUndo();

  const { mode: activeMode, setMode: setActiveMode } = useEvent(
    getEvent,
    shallow
  );
  const ActiveModeComponent = activeMode
    ? ModeMappings[activeMode]?.component
    : null;
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
              onClick={() => id && setActiveMode(id)}
            >
              {label}
            </ModeButton>
          ))}
          <ToolButton
            disabled={!undo}
            onClick={undo || undefined}
            title="Ctrl+Z"
          >
            Undo
          </ToolButton>
          <ToolButton
            disabled={!redo}
            onClick={redo || undefined}
            title="Ctrl+Y"
          >
            Redo
          </ToolButton>
        </div>
        {ActiveModeComponent && <ActiveModeComponent />}
      </div>
    </div>
  );
}

function voidFn() {
  return undefined;
}

function getEvent({
  courses,
  selectedCourseId,
  mode,
  actions: { setMode },
}: StateWithActions) {
  return { courses, selectedCourseId, mode, setMode };
}

type ModeMap = Record<number, ToolbarMode>;

interface ToolbarMode {
  id?: Mode;
  label: string;
  component: ComponentType<Record<string, never>>;
}

function idHash(
  object: Record<string, ToolbarMode>
): Record<string, ToolbarMode> {
  Object.entries(object).forEach(([key, val]) => {
    val.id = Number(key);
  });
  return object;
}
