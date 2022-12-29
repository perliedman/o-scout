import SelectMap from "./SelectMap";
import useEvent, { useMap } from "./store";
import { ExclamationIcon } from "@heroicons/react/outline";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import Section from "./ui/Section";
import { Fragment } from "react";

export default function MapSection() {
  const { mapProvider } = useMap(getState);
  const setMap = useEvent(getSetMap);

  return (
    <div className="p-4">
      <div
        className="w-full overflow-ellipsis overflow-hidden"
        title={mapProvider.mapName}
      >
        {mapProvider.mapName}
      </div>
      <Details items={mapProvider.getDetails()} />
      <Warnings warnings={mapProvider.getWarnings()} />
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
function getState({ mapProvider }) {
  return { mapProvider };
}

function getSetMap({
  actions: {
    event: { setMap },
  },
}) {
  return setMap;
}

function Details({ items }) {
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

function Warnings({ warnings }) {
  const nWarnings = warnings.length;

  return (
    warnings.length > 0 && (
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
            {warnings.map((w) => (
              <li>{w.toString()}</li>
            ))}
          </ul>
        </div>
      </Section>
    )
  );
}
