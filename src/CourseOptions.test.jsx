import { fireEvent, render } from "@testing-library/react";
import CourseOptions from "./CourseOptions";
import { PAPER_SIZES } from "./services/print";
import { describe, expect, test } from "vitest";

describe("CourseOptions", () => {
  test("Renders selected paper size's name", () => {
    const printArea = {
      pageWidth: 827,
      pageHeight: 1169,
    };
    render(
      <CourseOptions
        mapScale={15000}
        course={{ printScale: 7500, printArea: printArea, controls: [] }}
        setPrintArea={() => {}}
        setPrintScale={() => {}}
      />
    );
    const paperSizeSelect = document.querySelector("select");
    const options = Array.from(paperSizeSelect.querySelectorAll("option"));
    expect(
      options
        .filter((option) => option.text === "A4")
        .every((option) => option.selected)
    ).toBeTruthy();
    expect(
      options
        .filter((option) => option.text !== "A4")
        .every((option) => !option.selected)
    ).toBeTruthy();
  });
  test("Updates selected paper size's name", () => {
    const course = {
      printScale: 7500,
      printArea: {
        pageWidth: 827,
        pageHeight: 1169,
      },
      controls: [],
    };
    const { rerender } = render(
      <CourseOptions
        mapScale={15000}
        course={course}
        setPrintArea={(props) => {
          course.printArea = { ...course.printArea, ...props };
        }}
      />
    );
    const paperSizeSelect = document.querySelector("select");

    fireEvent.change(paperSizeSelect, {
      target: { value: PAPER_SIZES.findIndex(({ name }) => name === "Letter") },
    });

    rerender(
      <CourseOptions
        mapScale={15000}
        course={course}
        setPrintArea={() => {}}
        setPrintScale={() => {}}
      />
    );

    const options = Array.from(document.querySelectorAll("option"));
    expect(
      options
        .filter((option) => option.text === "Letter")
        .every((option) => option.selected)
    ).toBeTruthy();
    expect(
      options
        .filter((option) => option.text !== "Letter")
        .every((option) => !option.selected)
    ).toBeTruthy();
  });
});
