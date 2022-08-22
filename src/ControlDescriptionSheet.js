import React, { useEffect, useMemo, useRef, useState } from "react";
import { controlDistance } from "./models/control";
import { courseDistance } from "./models/course";
import DefinitionTexts from "svg-control-descriptions/symbols/lang.json";
import Button from "./ui/Button";
import { useHotkeys } from "react-hotkeys-hook";

export default function ControlDescriptionSheet({
  eventName,
  course,
  mapScale,
  onChangeEventName,
  onChangeCourseName,
  onChangeDescription,
  onChangeControlCode,
}) {
  const containerRef = useRef();
  const [descriptionSelector, setDescriptionSelector] = useState();

  return (
    <div ref={containerRef}>
      <table className="control-sheet">
        <tbody>
          <tr>
            <td colSpan="8">
              <input
                type="text"
                value={eventName}
                className="border-0 font-bold w-full text-center focus:outline-none"
                onChange={(e) => onChangeEventName(e.target.value)}
              />
            </td>
          </tr>
          <tr>
            <td colSpan="3" className="heavy-right font-bold">
              <input
                type="text"
                value={course.name}
                className="border-0 font-bold w-full text-center focus:outline-none"
                onChange={(e) => onChangeCourseName(e.target.value)}
              />
            </td>
            <td colSpan="3" className="heavy-right font-bold">
              {courseDistance(course, mapScale).toFixed(1)} km
            </td>
            <td colSpan="2"></td>
          </tr>
          {course.controls.map((c, i) => (
            <tr key={i}>
              {!c.description.all ? (
                <>
                  <td className="font-bold">
                    {c.kind !== "start" ? (
                      course.labelKind === "sequence" ? (
                        i
                      ) : (
                        ""
                      )
                    ) : (
                      <DescriptionSymbol symbol="start" />
                    )}
                  </td>
                  <td>
                    {" "}
                    <input
                      type="text"
                      value={c.code}
                      className="border-0 p-0 w-full text-center focus:outline-none"
                      onChange={(e) =>
                        onChangeControlCode(c.id, Number(e.target.value))
                      }
                    />
                  </td>
                  {["C", "D", "E", "F", "G", "H"].map((column, colIndex) => (
                    <td
                      key={column}
                      className={`h-full ${
                        colIndex % 3 === 0 ? "heavy-right" : ""
                      }`}
                    >
                      <button
                        onClick={(event) =>
                          openDescriptionSelector(c, column, event)
                        }
                        className="w-full focus:outline-none"
                        style={{ height: "32px" }} // TODO: yuck
                      >
                        <DescriptionSymbol symbol={c.description[column]} />
                      </button>
                    </td>
                  ))}
                </>
              ) : (
                <td colSpan="8">
                  <DescriptionSymbol symbol={c.description.all} />
                  <div className="relative -top-6 font-bold h-0">
                    {i > 0
                      ? Math.round(
                          ((controlDistance(
                            course.controls[i - 1],
                            course.controls[i]
                          ) /
                            1000) *
                            mapScale) /
                            10
                        ) * 10
                      : ""}
                    m
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {descriptionSelector && (
        <DescriptionSelector
          selected={
            descriptionSelector.control.description[descriptionSelector.column]
          }
          coordinates={descriptionSelector.coordinates}
          column={descriptionSelector.column}
          onSelect={(symbol) => {
            onChangeDescription(descriptionSelector.control.id, {
              ...descriptionSelector.control.description,
              [descriptionSelector.column]: symbol,
            });
            setDescriptionSelector(null);
          }}
        />
      )}
    </div>
  );

  function openDescriptionSelector(control, column, { currentTarget }) {
    if (
      control === descriptionSelector?.control &&
      column === descriptionSelector?.column
    ) {
      setDescriptionSelector(null);
      return;
    }

    const { left, bottom } = currentTarget.getBoundingClientRect();
    const { top: containerTop, left: containerLeft } =
      containerRef.current.getBoundingClientRect();
    setDescriptionSelector({
      control,
      column,
      coordinates: [left - containerLeft, bottom - containerTop],
    });
  }
}

function DescriptionSymbol({ symbol }) {
  const [svg, setSvg] = useState();

  useEffect(() => {
    if (symbol) {
      import(`svg-control-descriptions/symbols/${symbol}.svg`).then(setSvg);
    } else {
      setSvg(null);
    }
  }, [symbol]);
  return svg ? <img src={svg.default} alt={symbol} /> : null;
}

function DescriptionSelector({
  selected,
  coordinates: [x, y],
  column,
  onSelect,
}) {
  const pos = useMemo(() => {
    if (x < 287 / 2) {
      return { top: `${y + 244}px`, left: `${x}px` };
    } else {
      return { top: `${y + 244}px`, right: `${287 - 40 - x}px` };
    }
  }, [x, y]);
  const [tempSelection, setTempSelection] = useState(selected);
  useHotkeys("escape", () => onSelect(selected));

  return (
    <>
      <div
        className="absolute z-10 bg-white rounded shadow-md p-2 border border-grey-200 w-48 h-70"
        style={pos}
      >
        <div className="flex flex-col">
          <DescriptionList
            selected={tempSelection}
            column={column}
            onSelect={(description, clickEvent) => {
              setTempSelection(description);
              if (clickEvent.detail === 2) onSelect(description);
            }}
          />
          <div className="font-bold text-center border-t border-gray-600">
            {DefinitionTexts[tempSelection]?.names["en"] || " "}
          </div>
          <div className="w-full flex flex-col items-center mt-2">
            <div className="w-8 h-12">
              <DescriptionSymbol symbol={tempSelection} />
            </div>
          </div>
          <div className="border-t border-gray-600 mt-2">
            <Button
              type="primary"
              className="text-xs mt-2 w-full"
              onClick={() => onSelect(tempSelection)}
            >
              Ok
            </Button>
            <Button
              className="text-xs mt-2 w-full"
              onClick={() => onSelect(null)}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-y-0 left-8 right-0 bg-black opacity-5"
        onClick={() => onSelect(tempSelection)}
      />
    </>
  );
}

function DescriptionList({ selected, onSelect, column }) {
  const symbols = useMemo(() => {
    const symbols = Object.keys(DefinitionTexts);
    symbols.sort((a, b) => {
      const aDef = DefinitionTexts[a];
      const bDef = DefinitionTexts[b];
      const aIsCol = aDef.kind === column ? -1 : 1;
      const bIsCol = bDef.kind === column ? -1 : 1;

      return compare(aIsCol, bIsCol) || compare(a, b);
    });
    return symbols;
  }, [column]);
  return (
    <div className="grid grid-cols-4 description-selector max-h-24 overflow-y-scroll">
      {symbols.map((symbol) => (
        <button
          key={symbol}
          className={`w-6 p-1 focus:outline-none ${
            selected === symbol ? "border border-gray-400" : ""
          }`}
          onClick={(e) => onSelect(symbol, e)}
        >
          <DescriptionSymbol symbol={symbol} />
        </button>
      ))}
    </div>
  );
}

function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}
