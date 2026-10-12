import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api/client";
import { getPersonalisationError } from "@/lib/api/personalisationErrors";
import { fieldMaxLength, trimTemplateData } from "@/lib/templateFields";
import { TemplateForm } from "@/features/products/template/TemplateForm";

const check = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/shipping", () => ({ checkServiceability: check }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { DeliveryCheck } from "@/features/products/DeliveryCheck";
import { showPersonalisationError, describePersonalisationError } from "@/features/cart/personalisationToast";
import type { CartItem } from "@/types";

describe("template fields", () => {
  it("caps at max_length with a live counter, default 100 when null", () => {
    render(
      <TemplateForm
        fields={[
          { id: "name", label: "Your Name", type: "text", required: true, maxLength: 20 },
          { id: "msg", label: "Message", type: "text", required: false },
        ]}
        onChange={() => {}}
      />
    );
    const [name, msg] = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(name.maxLength).toBe(20);
    expect(msg.maxLength).toBe(100);
    fireEvent.change(name, { target: { value: "abc" } });
    expect(screen.getByText("3/20")).toBeTruthy();
    expect(screen.getByText("0/100")).toBeTruthy();
  });
  it("tells the customer when a paste was trimmed", async () => {
    const user = userEvent.setup();
    render(<TemplateForm fields={[{ id: "n", label: "Name", type: "text", required: false, maxLength: 5 }]} onChange={() => {}} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.click(input);
    await user.paste("abcdefghij");
    expect(input.value).toBe("abcde");
    expect(screen.getByText("Trimmed to 5 characters")).toBeTruthy();
  });
  it("helpers", () => {
    expect(fieldMaxLength({ type: "text" })).toBe(100);
    expect(trimTemplateData({ a: "  x " })).toEqual({ a: "x" });
  });
});

describe("DeliveryCheck", () => {
  beforeEach(() => { check.mockReset(); });
  async function submit(value: string) {
    const user = userEvent.setup();
    render(<DeliveryCheck />);
    await user.type(screen.getByLabelText("Pincode"), value);
    await user.click(screen.getByRole("button", { name: "Check" }));
  }
  it("flags short and non-numeric input without a request", async () => {
    await submit("12345");
    expect(screen.getByRole("alert").textContent).toBe("Enter a valid 6-digit pincode");
    expect(check).not.toHaveBeenCalled();
  });
  it("a 422 means invalid pincode, not a server problem", async () => {
    check.mockImplementation(async () => { throw new ApiError("Enter a valid 6-digit Indian pincode", 422, "validation_error"); });
    await submit("000000");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Enter a valid pincode"));
  });
  it("only 400/404/422 are 'invalid pincode'; 401 or 429 keep the retry message", async () => {
    check.mockImplementation(async () => { throw new ApiError("x", 429); });
    await submit("560001");
    await waitFor(() => expect(screen.getByText(/Couldn't check delivery right now/)).toBeTruthy());
  });
  it("sanitises pastes after the fact: spaces and Devanagari digits", async () => {
    const user = userEvent.setup();
    render(<DeliveryCheck />);
    const input = screen.getByLabelText("Pincode") as HTMLInputElement;
    expect(input.maxLength).toBe(-1);
    await user.click(input);
    await user.paste("560 001");
    expect(input.value).toBe("560001");
    await user.clear(input);
    await user.paste("५६०००१");
    expect(input.value).toBe("560001");
  });
  it("keeps the retry message for 5xx and network failures", async () => {
    check.mockImplementation(async () => { throw new ApiError("x", 503); });
    await submit("560001");
    await waitFor(() => expect(screen.getByText(/Couldn't check delivery right now/)).toBeTruthy());
  });
});

describe("personalisation 422", () => {
  const body = {
    status: 422, error: "personalisation_required", message: "Please fill in: Your name",
    fields: [{ id: "your_name", label: "Your name" }], product_id: "5",
  };
  const err = new ApiError(body.message, 422, "personalisation_required", body);
  const line = (id: string) => ({ product: { id, name: "Shagun Envelope", slug: "royal", categorySlug: "env" }, config: {} }) as unknown as CartItem;

  it("parses the final contract", () => {
    expect(getPersonalisationError(err)).toEqual({
      code: "personalisation_required", message: "Please fill in: Your name",
      fields: [{ id: "your_name", label: "Your name" }], productId: "5",
    });
    const tooLong = new ApiError("Too long", 422, "personalisation_too_long", {
      error: "personalisation_too_long", fields: [{ id: "your_name", label: "Your name", max_length: 100 }], product_id: "5",
    });
    expect(getPersonalisationError(tooLong)?.fields[0].maxLength).toBe(100);
  });
  it("ignores everything else, including FastAPI's generic detail 422", () => {
    expect(getPersonalisationError(new ApiError("x", 422, "invalid_option"))).toBeNull();
    expect(getPersonalisationError(new ApiError("body.items: too long", 422, undefined, { detail: [{ loc: ["body"], msg: "x" }] }))).toBeNull();
    expect(getPersonalisationError(new ApiError("x", 500, "personalisation_required"))).toBeNull();
  });
  it("names the product by product_id and links to its page", () => {
    const nav = vi.fn();
    expect(showPersonalisationError(err, [line("9"), line("5")], nav)).toBe(true);
    const [msg, opts] = toast.error.mock.calls[0];
    expect(msg).toContain("Shagun Envelope");
    expect(msg).toContain("Please fill in: Your name");
    opts.action.onClick();
    expect(nav).toHaveBeenCalledWith("/products/env/royal");
    expect(showPersonalisationError(new ApiError("x", 400), [line("5")], nav)).toBe(false);
  });
  it("personalisation_invalid names the bad-format fields", () => {
    const e = new ApiError("Please check the format of: Website", 422, "personalisation_invalid", {
      error: "personalisation_invalid", fields: [{ id: "site", label: "Website", type: "url" }], product_id: "5",
    });
    expect(getPersonalisationError(e)).toMatchObject({ code: "personalisation_invalid", productId: "5", fields: [{ id: "site", label: "Website" }] });
    const nav = vi.fn();
    toast.error.mockClear();
    expect(showPersonalisationError(e, [line("5")], nav)).toBe(true);
    expect(toast.error.mock.calls[0][0]).toContain("Please check the format of: Website");
    const noMsg = new ApiError("", 422, "personalisation_invalid", { fields: [{ id: "site", label: "Website" }] });
    expect(getPersonalisationError(noMsg)?.message).toBe("Please check the format of: Website");
  });
  it("invalid_artwork shows the re-upload message and links to the product, even without product_id", () => {
    const e = new ApiError("Your uploaded design couldn't be found", 422, "invalid_artwork", { error: "invalid_artwork" });
    const withArt = { ...line("5"), config: { artworkFileKey: "k" } } as unknown as CartItem;
    const n = describePersonalisationError(e, [line("9"), withArt]);
    expect(n?.message).toContain("please re-upload it on the product page");
    expect(n?.href).toBe("/products/env/royal");
  });
  it("without a matching line there is a message but no link", () => {
    expect(describePersonalisationError(err, [line("9")])?.href).toBeNull();
  });
});

describe("multiline cap", () => {
  it("mirrors the server's 500 cap", () => {
    expect(fieldMaxLength({ type: "multiline" })).toBe(100);
    expect(fieldMaxLength({ type: "multiline", maxLength: 2000 })).toBe(500);
    expect(fieldMaxLength({ type: "text", maxLength: 2000 })).toBe(2000);
  });
});
