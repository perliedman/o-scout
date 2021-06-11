import React, { useMemo, useState } from "react";
import useEvent from "./store";
import shallow from "zustand/shallow";
import Dropdown, { DropdownItem } from "./ui/Dropdown";
import FilePicker from "./FilePicker";
import { parsePPen } from "./services/ppen";
import CourseLayer from "./CourseLayer";

export default function Courses() {
  const { courses, selectedCourseId, setSelected, setEvent } = useEvent(
    getCourses,
    shallow
  );
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );

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
                  : "text-gray-darkest"
              }`}
            >
              {course.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Dropdown>
          <DropdownItem onClick={selectCourse}>Load courses...</DropdownItem>
        </Dropdown>
      </div>
      <FilePicker
        active={isSelectingCourse}
        accept=".ppen"
        onSelect={loadCourse}
      />
      {selectedCourse && <CourseLayer course={selectedCourse} />}
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
}

function getCourses({
  courses,
  selectedCourseId,
  actions: {
    event: { set },
    course: { setSelected, setName },
  },
}) {
  return { courses, selectedCourseId, setSelected, setName, setEvent: set };
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(new Error(`Failed to read file: ${err}`));
    reader.readAsText(file);
  });
}
