import { expect, it } from "vitest";
import { reviewTeamRow, reviewTeamText } from "./review-wording";

it("uses PharmaGuide Team wording for historic display notes without mutating the evidence", () => {
  const row = { "Clinician decision": "awaiting clinician approval", Notes: "Historical clinical review; 3 g carbs", Carbs: 3 };
  expect(reviewTeamRow(row)).toEqual({ "PharmaGuide Team decision": "awaiting PharmaGuide Team approval", Notes: "Historical PharmaGuide Team review; 3 g carbs", Carbs: 3 });
  expect(row["Clinician decision"]).toBe("awaiting clinician approval");
  expect(reviewTeamText("Authenticated clinician approval required")).toBe("Authenticated PharmaGuide Team approval required");
});
