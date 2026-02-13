import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentsList } from "../../components/documents/DocumentsList";
import type { DocumentAnnotation } from "@/lib/interfaces/graph.interfaces";

const makeAnnotation = (overrides = {}): DocumentAnnotation => ({
  id: "ann-1",
  title: "Auth Service Notes",
  content: "# Auth\nImportant notes.",
  tags: ["auth", "security"],
  linkedEntityIds: [],
  fileId: "file-1",
  filePath: "src/auth/auth.service.ts",
  fileName: "auth.service.ts",
  author: { id: "user-1", name: "Alice" },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-02T00:00:00Z",
  ...overrides,
});

const defaultProps = {
  annotations: [makeAnnotation()],
  activeTags: [],
  allTags: ["auth", "security"],
  onToggleTag: jest.fn(),
  onSelect: jest.fn(),
  selectedId: null,
};

describe("DocumentsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders annotation title, file path, tags and author", () => {
    render(<DocumentsList {...defaultProps} />);

    expect(screen.getByText("Auth Service Notes")).toBeInTheDocument();
    expect(screen.getByText("src/auth/auth.service.ts")).toBeInTheDocument();
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("security")).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("clicking an annotation calls onSelect", () => {
    const onSelect = jest.fn();
    render(<DocumentsList {...defaultProps} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Auth Service Notes"));

    expect(onSelect).toHaveBeenCalledWith(defaultProps.annotations[0]);
  });

  it("renders tag filter buttons for allTags", () => {
    render(<DocumentsList {...defaultProps} />);

    const authButtons = screen.getAllByText("auth");
    expect(authButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("clicking a tag badge calls onToggleTag", () => {
    const onToggleTag = jest.fn();
    render(<DocumentsList {...defaultProps} onToggleTag={onToggleTag} />);

    const tagFilterButtons = screen.getAllByRole("button", { pressed: false });
    fireEvent.click(tagFilterButtons[0]);

    expect(onToggleTag).toHaveBeenCalled();
  });

  it("active tag badge has aria-pressed=true", () => {
    render(<DocumentsList {...defaultProps} activeTags={["auth"]} />);

    const pressedButtons = screen.getAllByRole("button", { pressed: true });
    expect(pressedButtons.length).toBeGreaterThan(0);
  });

  it("renders multiple annotations", () => {
    const annotations = [
      makeAnnotation({ id: "ann-1", title: "First Note" }),
      makeAnnotation({ id: "ann-2", title: "Second Note", filePath: "src/db/db.ts" }),
    ];
    render(<DocumentsList {...defaultProps} annotations={annotations} />);

    expect(screen.getByText("First Note")).toBeInTheDocument();
    expect(screen.getByText("Second Note")).toBeInTheDocument();
  });

  it("selected annotation card has highlighted styling", () => {
    render(<DocumentsList {...defaultProps} selectedId="ann-1" />);

    const button = screen.getByText("Auth Service Notes").closest("button");
    expect(button).toHaveClass("bg-accent");
  });

  it("renders empty list without errors", () => {
    render(<DocumentsList {...defaultProps} annotations={[]} allTags={[]} />);
    expect(screen.queryByText("Auth Service Notes")).not.toBeInTheDocument();
  });
});
