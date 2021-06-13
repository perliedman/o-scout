import React, { useState } from "react";
import SelectMap from "./SelectMap";
import { useMap } from "./store";
import { ExclamationIcon } from "@heroicons/react/outline";
import Toggle from "./ui/Toggle";
import Dropdown, { DropdownItem } from "./ui/Dropdown";

export default function MapSection() {
  const { mapFilename, mapFile } = useMap(getState);

  return (
    <>
      <div
        className="w-full overflow-ellipsis overflow-hidden"
        title={mapFilename}
      >
        {mapFilename}
      </div>
      <Details mapFile={mapFile} />
      <Warnings mapFile={mapFile} />
      <div className="flex justify-end">
        <Dropdown>
          <SelectMap
            component={<DropdownItem>Select new map...</DropdownItem>}
          />
        </Dropdown>
      </div>
    </>
  );
}
function getState({ mapFilename, mapFile }) {
  return { mapFilename, mapFile };
}

function Details({ mapFile }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <>
      <div className="mt-4 flex justify-between">
        <div>Details</div>
        <Toggle
          type="small"
          open={showDetails}
          onClick={() => setShowDetails(!showDetails)}
        />
      </div>
      {showDetails && (
        <div className="pl-4 bg-indigo-100 rounded">
          <ul className="ml-4 my-4 py-2 list-disc">
            <li>OCAD version: {mapFile.header.version}</li>
          </ul>
        </div>
      )}
    </>
  );
}

function Warnings({ mapFile }) {
  const [showWarnings, setShowWarnings] = useState(false);
  const nWarnings = mapFile.warnings.length;

  return (
    mapFile.warnings.length > 0 && (
      <>
        <div className="mt-4 flex justify-between">
          <div>
            <ExclamationIcon className="inline-block h-5 w-5 text-red-600" />{" "}
            Map has {nWarnings} warning{nWarnings !== 1 ? "s" : ""}
          </div>
          <Toggle
            type="small"
            open={showWarnings}
            onClick={() => setShowWarnings(!showWarnings)}
          />
        </div>
        {showWarnings && (
          <div className="pl-4 bg-indigo-100 rounded">
            <ul className="ml-4 my-4 py-2 list-disc">
              {mapFile.warnings.map((w) => (
                <li>{w.toString()}</li>
              ))}
            </ul>
          </div>
        )}
      </>
    )
  );
}
