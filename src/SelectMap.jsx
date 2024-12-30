import { useRef, useState } from "react";
import Spinner from "./ui/Spinner";
import Button from "./ui/Button";
import OcadTiler from "ocad-tiler";

import { useMap, useNotifications } from "./store";
import { readMap } from "./services/map";

export default function SelectMap({
  className,
  children,
  type = "normal",
  component,
  onMapLoaded,
}) {
  const [state, setState] = useState("idle");
  const fileRef = useRef();
  const setMap = useMap(getSetter);
  const pushNotification = useNotifications(getPush);

  return (
    <>
      {component ? (
        <div onClick={activateFilePicker}>{component}</div>
      ) : (
        <Button type={type} className={className} onClick={activateFilePicker}>
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

  function activateFilePicker() {
    fileRef.current.value = "";
    setTimeout(() => fileRef.current.click());
  }

  async function loadMap(e) {
    setState("loading");
    try {
      const [blob] = e.target.files;
      const map = await readMap(blob);
      setMap(blob.name, map, new OcadTiler(map), blob);
      onMapLoaded && onMapLoaded(map, blob.name);
      setState("idle");
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
