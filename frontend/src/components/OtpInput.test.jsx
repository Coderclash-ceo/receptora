import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OtpInput from "../components/OtpInput";

describe("OtpInput component", () => {
  it("renders 6 input boxes", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBe(6);
  });

  it("handles typing individual digits and triggers onChange", () => {
    const handleChange = vi.fn();
    render(<OtpInput value="" onChange={handleChange} />);
    const inputs = screen.getAllByRole("textbox");

    fireEvent.change(inputs[0], { target: { value: "5" } });
    expect(handleChange).toHaveBeenCalledWith("5");
  });

  it("triggers onComplete when 6th digit is entered", () => {
    const handleComplete = vi.fn();
    render(<OtpInput value="12345" onChange={() => {}} onComplete={handleComplete} />);
    const inputs = screen.getAllByRole("textbox");

    fireEvent.change(inputs[5], { target: { value: "6" } });
    expect(handleComplete).toHaveBeenCalledWith("123456");
  });

  it("pastes full 6 digit string across boxes", () => {
    const handleChange = vi.fn();
    const handleComplete = vi.fn();
    render(<OtpInput value="" onChange={handleChange} onComplete={handleComplete} />);
    const inputs = screen.getAllByRole("textbox");

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => "987654",
      },
    });

    expect(handleChange).toHaveBeenCalledWith("987654");
    expect(handleComplete).toHaveBeenCalledWith("987654");
  });
});
