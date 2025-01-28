import { useState } from "react";
import SelectMap from "./SelectMap";
import { readMap } from "./services/map";
import useEvent, { useMap, useNotifications } from "./store";
import Button from "./ui/Button";
import Spinner from "./ui/Spinner";
import OcadTiler from "ocad-tiler";

export default function StartScreen() {
  const [state, setState] = useState("idle");
  const setMap = useMap(getSetter);
  const pushNotification = useNotifications(getPush);
  const event = useEvent();

  return (
    <>
      <div className="flex h-screen bg-gray-100">
        <div className="m-auto text-center bg-white p-24 rounded-lg shadow-md md:mt-48">
          <h3 className="text-4xl font-bold mb-8 uppercase">O-Scout</h3>
          <h3 className="text-4xl font-thin text-indigo-600">
            Web-based Course Setting for Orienteering
          </h3>
          <div className="mx-auto flex flex-col gap-y-16 mt-16 max-w-xl text-gray-500 font-thin">
            <p>
              This is very much a work in progress at this point. Some things
              are usable today, a lot of things are completely missing or very
              roughly implemented.
            </p>
            <p>
              For reporting issues, getting the code or helping out, visit{" "}
              <a
                className="text-indigo-400 hover:underline hover:text-indigo-600"
                href="https://github.com/perliedman/o-scout/"
              >
                O-Scout at GitHub
              </a>
              .
            </p>
            {event.mapFilename ? (
              <p className="p-3 border border-indigo-600 rounded">
                You have courses saved from a previous session using the map
                <br />
                <strong>{event.mapFilename}</strong>
                <br />
                Open this map to continue working.
              </p>
            ) : null}
          </div>
          <div className="mt-24">
            <span className="md:mr-4 block md:inline">
              <SelectMap type="primary" className="text-xl w-48 h-16">
                Open a Map
              </SelectMap>
            </span>
            <span className="md:ml-4 block md:inline mt-8 md:mt-0">
              <Button className="w-48 h-16" onClick={loadDemoMap}>
                {state === "loading" && <Spinner className="text-indigo-600" />}
                Open Demo Map
              </Button>
            </span>
          </div>
        </div>
      </div>
    </>
  );

  async function loadDemoMap() {
    setState("loading");
    try {
      const response = await window.fetch("demo-map.ocd");
      const blob = await response.blob();
      const mapFile = await readMap(blob);
      const mapFilename = "Demo Map";
      setMap(mapFilename, mapFile, new OcadTiler(mapFile), blob);
    } catch (e) {
      console.error(e);
      setState("error");
      pushNotification("danger", "Failed to load map.", e.toString());
    }
  }
}

function getSetter(state) {
  return state.setMapFile;
}

function getPush({ push }) {
  return push;
}
