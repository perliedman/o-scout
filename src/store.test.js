import { renderHook, act } from "@testing-library/react-hooks";
import useEvent from "./store";

describe("store", () => {
  test("can set name", () => {
    const { result } = renderHook(() => useEvent());
    act(() => {
      result.current.actions.event.setName("krfsm");
    });
    expect(result.current.name).toBe("krfsm");
  });
  test("can undo", () => {
    const { result } = renderHook(() => useEvent());
    const originalName = result.current.name;
    act(() => {
      result.current.actions.event.setName("krfsm");
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.name).toBe(originalName);
  });

  test("can redo", () => {
    const { result } = renderHook(() => useEvent());
    act(() => {
      result.current.actions.event.setName("krfsm");
    });

    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });

    expect(result.current.name).toBe("krfsm");
  });

  test("undo past start of history is no-op", () => {
    const { result } = renderHook(() => useEvent());
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.undo();
      });
    }
  });

  test("redo past end of history is no-op", () => {
    const { result } = renderHook(() => useEvent());
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.redo();
      });
    }
  });

  test("history is 40 steps", () => {
    const { result } = renderHook(() => useEvent());
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.actions.event.setName(i.toString());
      });
    }
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.undo();
      });
    }
    expect(result.current.name).toBe("9");
  });
});
