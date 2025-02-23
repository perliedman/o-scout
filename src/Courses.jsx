import { useMemo, useState } from "react";
import useEvent, { useMap } from "./store";
import shallow from "zustand/shallow";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import FilePicker from "./FilePicker";
import { parsePPen, writePpen } from "./services/ppen";
import CourseLayer from "./CourseLayer";
import ControlDescriptionSheet from "./ControlDescriptionSheet";
import * as Course from "./models/course";
import Section from "./ui/Section";
import CourseOptions from "./CourseOptions";
import downloadBlob from "./services/download-blob";
import { mmToMeter, toProjectedCoord } from "./services/coordinates";
import { rotate } from "ol/coordinate";

const enableExtras = import.meta.env.VITE_ENABLE_EXTRAS === "true";

export default function Courses() {
  const {
    eventName,
    courses,
    courseAppearance,
    selectedCourseId,
    setSelected,
    setEvent,
    setEventName,
    setCourseName,
    setPrintScale,
    setPrintArea,
    setControlDescription,
    setControlCode,
    makeNewEvent,
    newCourse,
    transformAll,
  } = useEvent(getCourses, shallow);
  const { mapFile, map, crs, projections } = useMap(getMap, shallow);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );
  const mapScale = useMemo(() => crs.scale, [crs]);

  const [isSelectingCourse, selectCourse] = useState(false);

  return (
    <div className="pb-4">
      <ul className="">
        {courses.map((course) => (
          <li key={course.id}>
            <button
              onClick={() => setSelected(course.id)}
              className={`px-4 focus:outline-none focus:ring-2 rounded py-2 ring-indigo-600 font-thin tracking-wide border-t border-gray-200 w-full text-left ${
                selectedCourseId === course.id
                  ? "text-indigo-600"
                  : "text-gray-600"
              }`}
            >
              {course.name}
            </button>
            {selectedCourseId === course.id && (
              <div className="m-4">
                <ControlDescriptionSheet
                  eventName={eventName}
                  course={course}
                  mapScale={mapScale}
                  onChangeEventName={setEventName}
                  onChangeCourseName={(name) =>
                    setCourseName(selectedCourseId, name)
                  }
                  onChangeDescription={(controlId, description) =>
                    setControlDescription(controlId, description)
                  }
                  onChangeControlCode={(controlId, code) =>
                    setControlCode(controlId, code)
                  }
                />
                <Section title="Options" level={2}>
                  <CourseOptions
                    course={course}
                    mapScale={mapScale}
                    setPrintScale={(scale) => setPrintScale(course.id, scale)}
                    setPrintArea={(printAreaProps) =>
                      setPrintArea(course.id, printAreaProps)
                    }
                  />
                </Section>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Dropdown>
          <DropdownItem
            onClick={() =>
              newCourse(
                Course.create(
                  null,
                  "Course " + courses.length,
                  [],
                  selectedCourse.printScale,
                  "normal"
                )
              )
            }
          >
            Add new course
          </DropdownItem>
          <DropdownItem onClick={downloadCourses}>
            Download as Purple Pen...
          </DropdownItem>
          <DropdownItem onClick={selectCourse}>Load courses...</DropdownItem>
          <DropdownItem onClick={newEvent}>New event</DropdownItem>
          {enableExtras ? (
            <>
              <DropdownItem
                onClick={() => {
                  if (crs) {
                    transformAll((c) =>
                      toMapCoord(crs, toProjectedCoord(crs, c))
                    );
                  }
                }}
              >
                Apply grivation
              </DropdownItem>
            </>
          ) : null}
        </Dropdown>
      </div>
      <FilePicker
        active={isSelectingCourse}
        accept=".ppen"
        onSelect={loadCourse}
      />
      {map && mapFile && crs && projections && selectedCourse && (
        <CourseLayer
          eventName={eventName}
          mapScale={mapScale}
          course={selectedCourse}
          courseAppearance={courseAppearance}
        />
      )}
    </div>
  );

  function downloadCourses() {
    const event = useEvent.getState();
    const ppen = writePpen(event);
    downloadBlob(
      new Blob([new XMLSerializer().serializeToString(ppen)], {
        type: "application/xml",
      }),
      `${event.name}.ppen`
    );
  }

  async function loadCourse([file]) {
    selectCourse(false);

    const xmlString = await readAsText(file);
    const event = parsePPen(
      new DOMParser().parseFromString(xmlString, "application/xml")
    );
    setEvent(event);
  }

  function newEvent() {
    if (
      window.confirm(
        "Clear all current courses and create a new event -\n\nAre you sure?"
      )
    ) {
      makeNewEvent();
    }
  }
}

function getCourses({
  name,
  courses,
  courseAppearance,
  selectedCourseId,
  actions: {
    event: { set, setName: setEventName, newEvent: makeNewEvent },
    course: {
      setSelected,
      setName: setCourseName,
      new: newCourse,
      setPrintScale,
      setPrintArea,
    },
    control: {
      setDescription: setControlDescription,
      setCode: setControlCode,
      transformAll,
    },
  },
}) {
  return {
    eventName: name,
    courses,
    courseAppearance,
    selectedCourseId,
    setSelected,
    setEvent: set,
    setEventName,
    setCourseName,
    setControlDescription,
    setControlCode,
    makeNewEvent,
    newCourse,
    setPrintScale,
    setPrintArea,
    transformAll,
  };
}

function getMap({ mapFile, map, projections }) {
  return { mapFile, map, crs: mapFile.getCrs(), projections };
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(new Error(`Failed to read file: ${err}`));
    reader.readAsText(file);
  });
}

// This is a re-implementation of Ocad2GeoJSON's CRS.toMapCoord with the difference that it
// actually uses the maps grivation (bug in current version) and operates on millimeters of
// paper (PPen units), *not* 1/100 mm (OCAD units).
function toMapCoord(crs, coord) {
  const map = [
    (coord[0] - crs.easting) / mmToMeter / crs.scale,
    (coord[1] - crs.northing) / mmToMeter / crs.scale,
  ];
  return rotate(map, crs.grivation);
}
