import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { QuantityInput } from "@/components/common/QuantityInput";

function Harness({ min = 40, max = 5000 as number | null, start = 40, onValue = vi.fn(), onEmpty = vi.fn() }) {
  const [value, setValue] = useState(start);
  return (
    <QuantityInput
      value={value}
      min={min}
      max={max}
      unitLabel="pcs"
      onChange={(q) => {
        onValue(q);
        setValue(q);
      }}
      onEmptyChange={onEmpty}
    />
  );
}

const field = () => screen.getByLabelText("Quantity") as HTMLInputElement;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("QuantityInput", () => {
  it("is a mobile numeric field", () => {
    render(<Harness />);
    expect(field().type).toBe("text");
    expect(field().getAttribute("inputmode")).toBe("numeric");
    expect(field().getAttribute("pattern")).toBe("[0-9]*");
    expect(field().getAttribute("enterkeyhint")).toBe("done");
    expect(field().getAttribute("autocomplete")).toBe("off");
    expect(field().maxLength).toBe(7);
  });

  it("strips non-digits as typed and commits the clamped value after the debounce", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "1a2b0" } });
    expect(field().value).toBe("120");
    expect(onValue).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(150));
    expect(onValue).toHaveBeenLastCalledWith(120);
    expect(screen.queryByRole("status")?.textContent).toBe("");
  });

  it("shows a neutral note while typing below the minimum, prices at the clamp, and snaps on blur", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "10" } });
    expect(field().value).toBe("10");
    expect(screen.getByRole("status").textContent).toBe("Minimum order is 40 pcs");
    act(() => void vi.advanceTimersByTime(150));
    expect(onValue).toHaveBeenLastCalledWith(40);
    fireEvent.blur(field());
    expect(field().value).toBe("40");
    expect(screen.getByRole("status").textContent).toBe("Adjusted to 40 pcs");
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("explains the maximum and snaps down on Enter", () => {
    render(<Harness />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "9000" } });
    expect(screen.getByRole("status").textContent).toBe("Maximum order is 5,000 pcs");
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(field().value).toBe("5000");
    expect(screen.getByRole("status").textContent).toBe("Adjusted to 5,000 pcs");
  });

  it("restores the last valid value when left empty and reports emptiness meanwhile", () => {
    const onEmpty = vi.fn();
    const onValue = vi.fn();
    render(<Harness start={100} onEmpty={onEmpty} onValue={onValue} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "" } });
    expect(onEmpty).toHaveBeenLastCalledWith(true);
    act(() => void vi.advanceTimersByTime(300));
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.blur(field());
    expect(field().value).toBe("100");
    expect(onEmpty).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("steps with +/- from the minimum and disables at the bounds", () => {
    render(<Harness start={40} max={50} />);
    const minus = screen.getByLabelText("Decrease quantity") as HTMLButtonElement;
    const plus = screen.getByLabelText("Increase quantity") as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
    fireEvent.click(plus);
    expect(field().value).toBe("45");
    fireEvent.click(plus);
    expect(field().value).toBe("50");
    expect(plus.disabled).toBe(true);
    fireEvent.click(minus);
    expect(field().value).toBe("45");
  });

  it("Enter commits once (the follow-up blur does not re-commit a stale draft)", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "9000" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.blur(field());
    expect(onValue.mock.calls.filter(([q]) => q === 5000)).toHaveLength(1);
  });

  it("caps at 1,000,000 when there is no maximum", () => {
    render(<Harness max={null} />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "9999999" } });
    fireEvent.blur(field());
    expect(field().value).toBe("1000000");
  });
});
