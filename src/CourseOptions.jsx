import { useMemo } from "react";
import { getPrintAreaExtent } from "./models/course";
import { PAPER_SIZES, paperSizeToMm } from "./services/print";
import Input from "./ui/Input";

export default function CourseOptions({
  course,
  course: { printScale, printArea },
  mapScale,
  setPrintScale,
  setPrintArea,
}) {
  const selectedPaperSizeIndex = PAPER_SIZES.findIndex(
    ({ dimensions: [width, height] }) =>
      width === printArea.pageWidth && height === printArea.pageHeight
  );

  const extent = useMemo(
    () => getPrintAreaExtent(course, mapScale),
    [course, mapScale]
  );

  return (
    <>
      <label>Print Scale</label>
      <div className="flex items-center">
        1&nbsp;:&nbsp;
        <Input
          type="number"
          value={printScale}
          min={mapScale / 10}
          step={mapScale / 30}
          onChange={(e) => setPrintScale(Number(e.target.value))}
        />
      </div>
      <label>Paper Size</label>
      <div>
        <select
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={selectedPaperSizeIndex}
          onChange={(e) => {
            const {
              dimensions: [width, height],
            } = PAPER_SIZES[e.target.value];
            setPrintArea({
              pageWidth: width,
              pageHeight: height,
            });
          }}
          data-testid="paper-size-select"
        >
          {PAPER_SIZES.map(({ name }, i) => (
            <option key={i} value={i}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <label>Print Area</label>
      <div className="flex flex-row justify-between my-2">
        {sizeOptions.map(([label, auto, restrictToPage]) => (
          <div key={label} className="flex items-center gap-x-2">
            <input
              type="radio"
              name="print-area-mode"
              id={`print-area-${label}`}
              checked={
                printArea.auto === auto &&
                printArea.restrictToPage === restrictToPage
              }
              onChange={() => setPrintArea({ auto, restrictToPage })}
            ></input>
            <label htmlFor={`print-area-${label}`}>{label}</label>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <div />
        <ExtentInput
          extent={extent}
          index={3}
          onChange={(extent) => setPrintArea({ extent, restrictToPage: false })}
        />
        <div />
        <ExtentInput
          extent={extent}
          index={0}
          onChange={(extent) => setPrintArea({ extent, restrictToPage: false })}
        />
        <div className="justify-self-center w-8 h-8 border border-dashed border-gray-400" />
        <ExtentInput
          extent={extent}
          index={2}
          onChange={(extent) => setPrintArea({ extent, restrictToPage: false })}
        />
        <div />
        <ExtentInput
          extent={extent}
          index={1}
          onChange={(extent) => setPrintArea({ extent, restrictToPage: false })}
        />
        <div />
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th />
            <th className="font-thin">Height</th>
            <th className="font-thin">Width</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Size on paper</td>
            <td>
              {((extent[3] - extent[1]) * (mapScale / printScale)).toFixed(2)}{" "}
              mm ({(printArea.pageHeight * paperSizeToMm).toFixed()} mm)
            </td>
            <td>
              {((extent[2] - extent[0]) * (mapScale / printScale)).toFixed(2)}{" "}
              mm ({(printArea.pageWidth * paperSizeToMm).toFixed()} mm)
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function ExtentInput({ extent, index, onChange }) {
  return (
    <Input
      type="number"
      className="w-24 text-center"
      value={extent[index].toFixed(2)}
      onChange={(e) => {
        const nextExtent = [...extent];
        nextExtent[index] = Number(e.target.value);
        onChange(nextExtent);
      }}
      step={0.01}
    />
  );
}

const sizeOptions = [
  ["Auto", true, false],
  ["Fit to Page", false, true],
  ["Manual", false, false],
];
