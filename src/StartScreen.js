import React, { useState } from "react";
import SelectMap from "./SelectMap";
import { readMap } from "./services/map";
import { useMap, useNotifications } from "./store";
import Button from "./ui/Button";
import Spinner from "./ui/Spinner";
import OcadTiler from "ocad-tiler";

export default function StartScreen() {
  const [state, setState] = useState("idle");
  const setMap = useMap(getSetter);
  const pushNotification = useNotifications(getPush);

  return (
    <>
      <div className="flex h-screen bg-gray-100">
        <div className="m-auto text-center bg-white p-24 rounded-lg shadow-md md:mt-48">
          <h3 className="text-4xl font-bold mb-8 uppercase">O-Scout</h3>
          <h3 className="text-4xl font-thin text-indigo-600">
            Web-based Course Setting for Orienteering
          </h3>
          <p className="text-gray-500 font-thin mx-auto mt-16 max-w-xl">
            This is very much a work in progress at this point. Some things are
            usable today, a lot of things are completely missing or very roughly
            implemented.
          </p>
          <p className="text-gray-500 font-thin mx-auto mt-16 max-w-xl">
            For reporting issues, getting the code or helping out, visit{" "}
            <a
              className="text-indigo-400 hover:underline hover:text-indigo-600"
              href="https://github.com/perliedman/o-scout/"
            >
              O-Scout at GitHub
            </a>
            .
          </p>
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
      setMap("Demo Map", mapFile, new OcadTiler(mapFile));
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
