import React from "react";
import SelectMap from "./SelectMap";
import useEvent, { useMap } from "./store";
import { ExclamationIcon } from "@heroicons/react/outline";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import Section from "./ui/Section";

export default function MapSection() {
  const { mapFilename, mapFile } = useMap(getState);
  const setMap = useEvent(getSetMap);

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
            onMapLoaded={setMap}
          />
        </Dropdown>
      </div>
    </>
  );
}
function getState({ mapFilename, mapFile }) {
  return { mapFilename, mapFile };
}

function getSetMap({
  actions: {
    event: { setMap },
  },
}) {
  return setMap;
}

function Details({ mapFile }) {
  return (
    <Section title="Details" headingComponent="h3" headingTextStyle="">
      <div className="pl-4 bg-indigo-100 rounded">
        <ul className="ml-4 my-4 py-2 list-disc">
          <li>OCAD version: {mapFile.header.version}</li>
        </ul>
      </div>
    </Section>
  );
}

function Warnings({ mapFile }) {
  const nWarnings = mapFile.warnings.length;

  return (
    mapFile.warnings.length > 0 && (
      <Section
        headingComponent="h3"
        headingTextStyle=""
        title={
          <>
            <ExclamationIcon className="inline-block h-5 w-5 text-red-600" />{" "}
            Map has {nWarnings} warning{nWarnings !== 1 ? "s" : ""}
          </>
        }
      >
        <div className="pl-4 bg-indigo-100 rounded">
          <ul className="ml-4 my-4 py-2 list-disc">
            {mapFile.warnings.map((w) => (
              <li>{w.toString()}</li>
            ))}
          </ul>
        </div>
      </Section>
    )
  );
}
