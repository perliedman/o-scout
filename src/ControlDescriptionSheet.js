import React, { useEffect, useState } from "react";
import { controlDistance } from "./models/control";
import { courseDistance } from "./models/course";

export default function ControlDescriptionSheet({
  eventName,
  course,
  mapScale,
  onChangeEventName,
  onChangeCourseName,
  onChangeDescription,
}) {
  return (
    <table className="control-sheet">
      <tbody>
        <tr>
          <td colSpan="8">
            <input
              type="text"
              value={eventName}
              className="font-bold w-full text-center focus:outline-none"
              onChange={(e) => onChangeEventName(e.target.value)}
            />
          </td>
        </tr>
        <tr>
          <td colSpan="3" className="heavy-right font-bold">
            <input
              type="text"
              value={course.name}
              className="font-bold w-full text-center focus:outline-none"
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
                    i
                  ) : (
                    <DescriptionSymbol symbol="start" />
                  )}
                </td>
                <td>{c.code}</td>
                {["C", "D", "E", "F", "G", "H"].map((column, colIndex) => (
                  <td
                    key={column}
                    className={`${colIndex % 3 === 0 ? "heavy-right" : ""}`}
                  >
                    <DescriptionSymbol symbol={c.description[column]} />
                  </td>
                ))}
              </>
            ) : (
              <td colSpan="8">
                <DescriptionSymbol symbol={c.description.all} />
                <div className="relative -top-6 font-bold h-0">
                  {i > 0
                    ? (
                        (controlDistance(
                          course.controls[i - 1],
                          course.controls[i]
                        ) /
                          1000) *
                        mapScale
                      ).toFixed(0)
                    : ""}
                  m
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DescriptionSymbol({ symbol }) {
  const [svg, setSvg] = useState();

  useEffect(() => {
    symbol &&
      import(`svg-control-descriptions/symbols/${symbol}.svg`).then(setSvg);
  }, [symbol]);
  return svg ? <img src={svg.default} alt={symbol} /> : null;
}
