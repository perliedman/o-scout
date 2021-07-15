import { parsePpenFile } from "../test-utils";

describe("parsePPen", () => {
  test.each`
    ppenFile                         | numberCourses
    ${"./test-data/ppen/test1.ppen"} | ${5}
    ${"./test-data/ppen/test2.ppen"} | ${6}
  `("reads $input courses without errors", ({ ppenFile, numberCourses }) => {
    const event = parsePpenFile(ppenFile);
    expect(event.courses.length).toBe(numberCourses);
  });

  test("can read special objects", () => {
    const event = parsePpenFile("./test-data/ppen/test1.ppen");
    // All courses except "All controls" should have 2 special objects
    event.courses.slice(0, -1).forEach((course) => {
      expect(course.specialObjects.length).toBe(2);
    });
  });

  test("gives warnings", () => {
    const event = parsePpenFile("./test-data/ppen/test2.ppen");
    expect(event.warnings.length).toBe(1);
    expect(event.warnings[0]).toBe(
      "No course with id 0 found for special object 13."
    );
  });

  test("read course appearance", () => {
    const event = parsePpenFile("./test-data/ppen/test2.ppen");
    const { courseAppearance } = event;
    expect(courseAppearance).not.toBeNull();
    expect(courseAppearance.autoLegGapSize).toBe(3.5);
    expect(courseAppearance.scaleSizes).toBe("RelativeToMap");
    expect(courseAppearance.scaleSizesCircleGaps).toBe(true);
    expect(courseAppearance.blendPurple).toBe(true);
  });
});
