import React, { useEffect, useMemo, useRef, useState } from "react";
import { getExtent } from "./models/print-area";
import useEvent, { useMap, useUndo } from "./store";
import ExtentInteraction from "ol/interaction/Extent";
import {
  fromProjectedCoord,
  toProjectedCoord,
  transformExtent,
} from "./services/coordinates";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";

const Modes = idHash({
  printArea: { label: "Print Area", component: PrintArea },
});

export default function Toolbar() {
  const { undo, redo } = useUndo();
  const [activeMode, setActiveMode] = useState();
  const ActiveModeComponent = Modes[activeMode]?.component;

  return (
    <div className="relative">
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10 top-0">
        {[Modes.printArea].map(({ id, label }) => (
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

function PrintArea() {
  const { map, mapFile } = useMap(getMap);
  const { course, setPrintAreaExtent } = useEvent(getSelectedCourse);

  const crs = useMemo(() => mapFile?.getCrs(), [mapFile]);
  const currentExtent = useRef();

  useEffect(() => {
    if (map && course) {
      const interaction = new ExtentInteraction({
        extent: transformExtent(getExtent(course.printArea, course), (c) =>
          toProjectedCoord(crs, c)
        ),
        boxStyle,
      });
      interaction.on(
        "extentchanged",
        ({ extent }) => (currentExtent.current = extent)
      );
      map.on("pointerup", commitExtent);
      map.addInteraction(interaction);

      return () => {
        map.removeInteraction(interaction);
        map.un("pointerup", commitExtent);
      };

      function commitExtent() {
        setPrintAreaExtent(
          course.id,
          transformExtent(currentExtent.current, (c) =>
            fromProjectedCoord(crs, c)
          )
        );
      }
    }
  }, [crs, mapFile, map, course, setPrintAreaExtent]);

  return null;
}

const boxStyle = new Style({
  stroke: new Stroke({ color: "steelblue", width: 5 }),
  fill: null,
});

function getMap({ map, mapFile }) {
  return { map, mapFile };
}

function getSelectedCourse({
  courses,
  selectedCourseId,
  actions: {
    course: { setPrintAreaExtent },
  },
}) {
  return {
    course: courses.find(({ id }) => id === selectedCourseId),
    setPrintAreaExtent,
  };
}

function idHash(object) {
  Object.entries(object).forEach(([key, val]) => {
    val.id = key;
  });
  return object;
}
