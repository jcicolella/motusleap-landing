import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    size: { width: 1920, height: 1080 },
    mouse: { x: 0, y: 0 },
  })),
}));

vi.mock("@react-three/drei", () => ({}));

describe("Home page", () => {
  it("renders the brand name", () => {
    render(<Home />);
    expect(screen.getByText("MOTUS LEAP")).toBeDefined();
  });

  it("renders the Three.js canvas", () => {
    render(<Home />);
    expect(screen.getByTestId("r3f-canvas")).toBeDefined();
  });

  it("renders the brand name as an h1", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("MOTUS LEAP");
  });
});
