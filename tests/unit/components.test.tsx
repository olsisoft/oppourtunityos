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
            message: { key: "test.kill.noTrigger", text: "No trigger." },
            suggestion: { key: "test.kill.noTrigger.fix", text: "Ask when it becomes urgent." },
          },
          {
            code: "LOW_WTP",
            severity: "critical",
            message: { key: "test.kill.lowWtp", text: "WTP is low." },
            suggestion: { key: "test.kill.lowWtp.fix", text: "Look for existing spend." },
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
