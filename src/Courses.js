import React, { useMemo, useState } from "react";
import useEvent, { useMap } from "./store";
import shallow from "zustand/shallow";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import FilePicker from "./FilePicker";
import { parsePPen } from "./services/ppen";
import CourseLayer from "./CourseLayer";
import ControlDescriptionSheet from "./ControlDescriptionSheet";
import * as Course from "./models/course";

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
    setControlDescription,
    makeNewEvent,
    newCourse,
  } = useEvent(getCourses, shallow);
  const mapFile = useMap(getMapFile);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );
  const mapScale = useMemo(() => mapFile.getCrs().scale, [mapFile]);

  const [isSelectingCourse, selectCourse] = useState(false);

  return (
    <>
      <ul>
        {courses.map((course) => (
          <li key={course.id}>
            <button
              onClick={() => setSelected(course.id)}
              className={`focus:outline-none focus:ring-2 rounded p-1 ring-indigo-600 ${
                selectedCourseId === course.id
                  ? "text-indigo-600"
                  : "text-gray-600"
              }`}
            >
              {course.name}
            </button>
            {selectedCourseId === course.id && (
              <div className="my-4">
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
                Course.create(null, "New course", [], mapScale, "normal")
              )
            }
          >
            Add new course
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
      {selectedCourse && (
        <CourseLayer
          eventName={eventName}
          course={selectedCourse}
          courseAppearance={courseAppearance}
        />
      )}
    </>
  );

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
    course: { setSelected, setName: setCourseName, new: newCourse },
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
  };
}

function getMapFile({ mapFile }) {
  return mapFile;
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(new Error(`Failed to read file: ${err}`));
    reader.readAsText(file);
  });
}
