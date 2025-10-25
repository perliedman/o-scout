import { useEffect, useMemo, useRef, useState } from "react";
import { controlDistance } from "./models/control";
import { courseDistance } from "./models/course";
import DefinitionTexts from "svg-control-descriptions/symbols/lang.json";
import Button from "./ui/Button";
import { useHotkeys } from "react-hotkeys-hook";
import { descriptionSymbols } from "./services/fetch-symbol-svg";
import {
  useFloating,
  FloatingOverlay,
  FloatingFocusManager,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
} from "@floating-ui/react";
import { autoPlacement } from "@floating-ui/dom";
import Input from "./ui/Input";

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
  const { refs, context, floatingStyles } = useFloating({
    middleware: [autoPlacement()],
    open: !!descriptionSelector,
    onOpenChange: (open) => {
      if (!open) {
        setDescriptionSelector(null);
      }
    },
  });
  const click = useClick(context);
  const dismiss = useDismiss(context, {
    outsidePressEvent: "mousedown",
  });
  const role = useRole(context);

  const { getFloatingProps } = useInteractions([click, dismiss, role]);
  let sequenceNumber = 0;

  return (
    <div ref={containerRef}>
      <table className="control-sheet bg-white">
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
              {course.labelKind === "sequence" ? (
                <>{courseDistance(course, mapScale).toFixed(1)} km</>
              ) : null}
            </td>
            <td colSpan="2"></td>
          </tr>
          {course.controls.map((c, i) => {
            if (c.kind === "normal") {
              sequenceNumber++;
            }

            return !c.description.all ? (
              <tr key={i}>
                <td className="font-bold">
                  {c.kind !== "start" ? (
                    course.labelKind === "sequence" ? (
                      sequenceNumber
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
                      {typeof c.description[column] === "string" ? (
                        <DescriptionSymbol symbol={c.description[column]} />
                      ) : (
                        c.description[column]?.value
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ) : course.labelKind === "sequence" ? (
              <tr key={i}>
                <td colSpan="8">
                  <DescriptionSymbol symbol={c.description.all} />
                  <div className="relative -top-7 font-bold h-0">
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
              </tr>
            ) : null;
          })}
        </tbody>
      </table>
      {descriptionSelector && (
        <FloatingOverlay lockScroll style={{ background: "rgba(0,0,0,0.3)" }}>
          <FloatingFocusManager context={context}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <DescriptionSelector
                selected={
                  descriptionSelector.control.description[
                    descriptionSelector.column
                  ]
                }
                coordinates={descriptionSelector.coordinates}
                column={descriptionSelector.column}
                allowValue={descriptionSelector.column === "F"}
                onSelect={(symbol) => {
                  onChangeDescription(descriptionSelector.control.id, {
                    ...descriptionSelector.control.description,
                    [descriptionSelector.column]: symbol,
                  });
                  setDescriptionSelector(null);
                }}
              />
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
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

    setDescriptionSelector({
      control,
      column,
    });
    refs.setReference(currentTarget);
  }
}

function DescriptionSymbol({ symbol }) {
  const [svg, setSvg] = useState();

  useEffect(() => {
    if (symbol && typeof symbol === "string" && symbol in descriptionSymbols) {
      descriptionSymbols[symbol]().then(setSvg);
    } else {
      setSvg(null);
    }
  }, [symbol]);
  return svg ? <img src={svg.default} alt={symbol} /> : null;
}

function DescriptionSelector({ selected, column, allowValue, onSelect }) {
  const [tempSelection, setTempSelection] = useState(selected);
  useHotkeys("escape", () => onSelect(selected));

  return (
    <>
      <div className="bg-white rounded shadow-md p-2 border border-grey-200 w-48 h-70">
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
          {allowValue ? (
            <>
              <label htmlFor="description-value">Feature dimension</label>
              <Input
                id="description-value"
                value={tempSelection?.value || ""}
                onChange={(e) => setTempSelection({ value: e.target.value })}
              />
            </>
          ) : null}
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
    </>
  );
}

function DescriptionList({ selected, onSelect, column }) {
  const symbols = useMemo(() => {
    const symbols = Object.keys(DefinitionTexts).filter((key) => {
      if (column === "E") {
        return (
          DefinitionTexts[key].kind === "E" || DefinitionTexts[key].kind === "D"
        );
      }
      return DefinitionTexts[key].kind === column;
    });
    symbols.sort((a, b) => {
      return compare(a, b);
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
