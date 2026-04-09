import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "@/app/page";

// Mock R3F Canvas — it requires WebGL which jsdom doesn't have
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
});
