import SelectMap from "./SelectMap";
import useEvent, { useMap } from "./store";
import { ExclamationIcon } from "@heroicons/react/outline";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import Section from "./ui/Section";
import { Fragment } from "react";

export default function MapSection() {
  const { mapFilename, mapFile } = useMap(getState);
  const setMap = useEvent(getSetMap);

  return (
    <div className="p-4">
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
    </div>
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
  const { version, subVersion, subSubVersion, currentFileVersion } =
    mapFile.header;
  const crs = mapFile.getCrs();

  const items = [
    ["OCAD version", [version, subVersion, subSubVersion].join(".")],
    ["File version", currentFileVersion],
    ["Georeference", `${crs.name} (${crs.catalog}:${crs.code})`],
  ];

  return (
    <Section title="Details" level={2}>
      <div className="-mx-1 px-1 bg-indigo-50 rounded">
        <dl>
          {items.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-2">
              <dt className="text-sm text-gray-600">{label}</dt>
              <dd className="col-span-2">{value}</dd>
            </div>
          ))}
        </dl>
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
