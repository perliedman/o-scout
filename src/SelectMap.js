import React, { useRef, useState } from "react";
import Spinner from "./ui/Spinner";
import Button from "./ui/Button";
import OcadTiler from "ocad-tiler";

import useEvent, { useMap, useNotifications } from "./store";
import { readMap } from "./services/map";

export default function SelectMap({
  className,
  children,
  type = "normal",
  component,
}) {
  const [state, setState] = useState("idle");
  const fileRef = useRef();
  const setMap = useMap(getSetter);
  const setEventMap = useEvent(getSetEventMap);
  const pushNotification = useNotifications(getPush);

  return (
    <>
      {component ? (
        <div onClick={() => fileRef.current.click()}>{component}</div>
      ) : (
        <Button
          type={type}
          className={className}
          onClick={() => {
            fileRef.current.value = "";
            setTimeout(() => fileRef.current.click());
          }}
        >
          {state === "loading" && <Spinner />}
          {children}
        </Button>
      )}
      <input
        ref={fileRef}
        className="hidden"
        disabled={state === "loading"}
        type="file"
        accept=".ocd"
        onChange={loadMap}
      />
    </>
  );

  async function loadMap(e) {
    setState("loading");
    try {
      const [blob] = e.target.files;
      const map = await readMap(blob);
      setMap(blob.name, map, new OcadTiler(map));
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

function getSetEventMap({
  actions: {
    event: { setMap: setEventMap },
  },
}) {
  return setEventMap;
}

function getPush({ push }) {
  return push;
}
