import shallow from "zustand/shallow";
import useEvent, { useMap } from "./store";
import Button from "./ui/Button";

export default function EventMapMismatchDialog({ onClose }) {
  const {
    mapFilename: eventMapName,
    setEventMap,
    newEvent,
  } = useEvent(getEvent, shallow);
  const { mapFilename: currentMapFilename, mapFile } = useMap(
    ({ mapFilename, mapFile }) => ({ mapFilename, mapFile })
  );

  return (
    <>
      <div>
        The current event uses a map named
        <div className="max-w-xs overflow-hidden overflow-ellipsis">
          <strong>{eventMapName}</strong>
        </div>
        but the current map is named
        <div className="max-w-xs overflow-hidden overflow-ellipsis">
          <strong>{currentMapFilename}</strong>
        </div>
        Please ensure this is the correct map.
      </div>
      <div className="flex justify-end mt-2">
        <Button
          type="primary"
          onClick={() => {
            setEventMap(mapFile, currentMapFilename);
            onClose();
          }}
          className="mr-2"
        >
          This is correct the correct map
        </Button>
        <Button type="primary" onClick={() => onClose()} className="mr-2">
          Incorrect map
        </Button>
        <Button
          type="primary"
          onClick={() => {
            newEvent();
            setEventMap(mapFile, currentMapFilename);
            onClose();
          }}
        >
          Discard current event
        </Button>
      </div>
    </>
  );
}

function getEvent({
  mapFilename,
  actions: {
    event: { setMap: setEventMap, newEvent },
  },
}) {
  return { mapFilename, setEventMap, newEvent };
}
