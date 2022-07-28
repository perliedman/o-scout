import React, { useMemo, useState } from "react";
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
    makeNewEvent,
    newCourse,
  } = useEvent(getCourses, shallow);
  const { mapFile, map, crs } = useMap(getMap);
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
                  "New course",
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
        </Dropdown>
      </div>
      <FilePicker
        active={isSelectingCourse}
        accept=".ppen"
        onSelect={loadCourse}
      />
      {map && mapFile && crs && selectedCourse && (
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
    control: { setDescription: setControlDescription },
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
    makeNewEvent,
    newCourse,
    setPrintScale,
    setPrintArea,
  };
}

function getMap({ mapFile, map }) {
  return { mapFile, map, crs: mapFile.getCrs() };
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(new Error(`Failed to read file: ${err}`));
    reader.readAsText(file);
  });
}
