import shallow from "zustand/shallow";
import useEvent, { useMap } from "./store";
import Button from "./ui/Button";

export default function EventMapMismatchDialog({ onClose }) {
  const {
    mapFilename: eventMapName,
    setEventMapProvider,
    newEvent,
  } = useEvent(getEvent, shallow);
  const { mapProvider } = useMap(({ mapProvider }) => ({ mapProvider }));
  const currentMapFilename = mapProvider.mapName;

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
            setEventMapProvider(mapProvider);
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
            setEventMapProvider(mapProvider);
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
    event: { setMapProvider: setEventMapProvider, newEvent },
  },
}) {
  return { mapFilename, setEventMapProvider, newEvent };
}
