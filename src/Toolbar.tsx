import { useState, useEffect, ComponentType, ReactNode } from "react";
import useEvent, { EventState, useUndo } from "./store";
import EditControls from "./tools/EditControls";
import PrintArea from "./tools/PrintArea";
import { useHotkeys } from "react-hotkeys-hook";
import CreateCourse from "./tools/CreateCourse";
import ToolButton, { ModeButton } from "./ui/ToolButton";
import shallow from "zustand/shallow";

const Modes: ModeMap = idHash({
  printArea: { label: "Area", component: PrintArea },
  editControls: { label: "Edit", component: EditControls },
  createCourse: { label: "Create", component: CreateCourse },
});
const modes = [Modes.createCourse, Modes.editControls, Modes.printArea];

export default function Toolbar(): ReactNode {
  const { undo, redo } = useUndo();
  const [activeMode, setActiveMode] = useState<keyof ModeMap | undefined>(modes[0].id);

  const { courses, selectedCourseId } = useEvent(getEvent, shallow);
  useEffect(() => {
    const selectedCourse = courses.find(course => course.id === selectedCourseId)
    if (selectedCourse) {
      const hasFinish = selectedCourse.controls.some(control => control.kind==='finish')
      setActiveMode(hasFinish ? 'editControls' : 'createCourse')
    }
  }, [courses, selectedCourseId])

  const ActiveModeComponent = activeMode ? Modes[activeMode]?.component : null;
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

function voidFn() {
  return undefined;
}

function getEvent({ courses, selectedCourseId }: EventState) {
  return { courses, selectedCourseId };
}

type ModeMap = Record<string, Mode>;

interface Mode {
  id?: keyof ModeMap;
  label: string;
  component: ComponentType<Record<string,never>>;
}

function idHash(object: Record<string, Mode>): Record<string, Mode> {
  Object.entries(object).forEach(([key, val]) => {
    val.id = key;
  });
  return object;
}
