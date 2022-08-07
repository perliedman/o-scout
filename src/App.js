import Map from "./MapComponent";
import StartScreen from "./StartScreen";
import Sidebar from "./Sidebar";
import useEvent, { useMap, useNotifications } from "./store";
import Toolbar from "./Toolbar";
import Alert from "./ui/Alert";
import { ErrorBoundary } from "react-error-boundary";
import Button from "./ui/Button";

function App() {
  const mapFile = useMap(getMap);
  const newEvent = useEvent(getNewEvent);
  const { notifications, popNotification } = useNotifications(getNotifications);
  const { type, message, detail } =
    notifications.length > 0 ? notifications[0] : {};

  return (
    <ErrorBoundary FallbackComponent={ErrorScreen} onReset={newEvent}>
      {mapFile ? (
        <>
          <Map mapFile={mapFile} />
          <Sidebar />
          <Toolbar />
        </>
      ) : (
        <StartScreen />
      )}
      {message ? (
        <div className="absolute top-0">
          <div className="z-20">
            <Alert
              type={type}
              message={message}
              detail={detail}
              onClose={popNotification}
            />
          </div>
        </div>
      ) : null}
    </ErrorBoundary>
  );
}

function getNewEvent({
  actions: {
    event: { newEvent },
  },
}) {
  return newEvent;
}

export default App;

function getMap(state) {
  return state.mapFile;
}

function getNotifications({ notifications, pop }) {
  return { notifications, popNotification: pop };
}

function ErrorScreen({ error, resetErrorBoundary }) {
  return (
    <>
      <div className="flex h-screen bg-gray-100">
        <div className="m-auto text-center bg-white p-24 rounded-lg shadow-md md:mt-48">
          <h3 className="text-4xl font-bold mb-8 uppercase">
            An Error Occurred
          </h3>
          <h3 className="text-4xl font-thin text-indigo-600">
            We are really sorry :(
          </h3>
          <p className="text-gray-500 font-thin mx-auto mt-16 max-w-xl">
            Some internal error (a bug) occurred. You might want to reload the
            page and try again.
          </p>
          <p className="text-gray-500 font-thin mx-auto mt-16 max-w-xl">
            If the problem persists, clear the auto-saved courses by clicking
            the button below. This will <em>clear your current courses</em>, and
            again, we are very sorry if you lost any important changes.
          </p>
          <p className="text-gray-500 font-thin mx-auto mt-16 max-w-xl">
            If you want, please report the bug on{" "}
            <a
              className="text-indigo-400 hover:underline hover:text-indigo-600"
              href="https://github.com/perliedman/o-scout/issues/"
            >
              O-Scout at GitHub
            </a>
            .
          </p>
          <p className="text-gray-500 font-thin mx-auto mt-16 max-w-xl">
            Technical description of error:
          </p>
          <code>
            <pre>{error.message}</pre>
          </code>
          <div className="mt-24">
            <Button
              type="primary"
              className="h-14 font-bold"
              onClick={resetErrorBoundary}
            >
              Clear Saved Data
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
