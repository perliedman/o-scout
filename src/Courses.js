import React from "react";
import useEvent from "./store";
import shallow from "zustand/shallow";
import Dropdown, { DropdownItem } from "./ui/Dropdown";

export default function Courses() {
  const { courses, selectedCourseId, setSelected, setName } = useEvent(
    getCourses,
    shallow
  );

  return (
    <>
      <ul>
        {courses.map((course) => (
          <li key={course.id} onClick={() => setSelected(course.id)}>
            <span
              className={
                selectedCourseId === course.id
                  ? "text-indigo-600"
                  : "text-gray-darkest"
              }
            >
              {selectedCourseId === course.id ? (
                <input
                  type="text"
                  value={course.name}
                  onChange={(e) => setName(selectedCourseId, e.target.value)}
                />
              ) : (
                course.name
              )}
            </span>
          </li>
        ))}
      </ul>
      <Dropdown>
        <DropdownItem>Load courses...</DropdownItem>
      </Dropdown>
    </>
  );
}

function getCourses({
  courses,
  selectedCourseId,
  actions: {
    course: { setSelected, setName },
  },
}) {
  return { courses, selectedCourseId, setSelected, setName };
}
