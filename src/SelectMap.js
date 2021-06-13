import React, { useRef, useState } from "react";
import readOcad from "ocad2geojson/src/ocad-reader";
import toBuffer from "blob-to-buffer";
import Spinner from "./ui/Spinner";
import Button from "./ui/Button";

import { useMap, useNotifications } from "./store";

export default function SelectMap({
  className,
  children,
  type = "normal",
  component,
}) {
  const [state, setState] = useState("idle");
  const fileRef = useRef();
  const setMap = useMap(getSetter);
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
            fileRef.current.click();
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
      const file = await new Promise((resolve, reject) =>
        toBuffer(blob, (err, buffer) => {
          if (err) reject(err);
          resolve(buffer);
        })
      );
      const map = await readOcad(file);
      setMap(blob.name, map);
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
