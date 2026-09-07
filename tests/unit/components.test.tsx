import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KillCriteria } from "@/components/opportunity/kill-criteria";
import { VerdictExplanation } from "@/components/opportunity/score-breakdown";
import { computeVerdict } from "@/services/scoring/verdict";

describe("KillCriteria", () => {
  it("shows a clean state when no warnings", () => {
    render(<KillCriteria warnings={[]} />);
    expect(screen.getByText(/No kill criteria triggered/)).toBeInTheDocument();
  });
  it("lists critical warnings first with suggestions", () => {
    render(
      <KillCriteria
        warnings={[
          {
            code: "NO_TRIGGER",
            severity: "warning",
            message: "No trigger.",
            suggestion: "Ask when it becomes urgent.",
          },
          {
            code: "LOW_WTP",
            severity: "critical",
            message: "WTP is low.",
            suggestion: "Look for existing spend.",
          },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("WTP is low.");
    expect(screen.getByText(/1 critical signal/)).toBeInTheDocument();
    expect(screen.getByText("Look for existing spend.")).toBeInTheDocument();
  });
});

describe("VerdictExplanation", () => {
  it("explains why a verdict was produced", () => {
    render(<VerdictExplanation result={computeVerdict(85, 30)} />);
    expect(screen.getByText("Opportunity ≥ 70 and Evidence < 50")).toBeInTheDocument();
    expect(screen.getByText(/never BUILD/)).toBeInTheDocument();
  });
});
