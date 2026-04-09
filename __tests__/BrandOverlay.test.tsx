import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrandOverlay } from "@/components/BrandOverlay";

describe("BrandOverlay", () => {
  it("renders MOTUS LEAP text", () => {
    render(<BrandOverlay />);
    expect(screen.getByText("MOTUS LEAP")).toBeDefined();
  });

  it("has the correct accessibility role", () => {
    render(<BrandOverlay />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("MOTUS LEAP");
  });
});
