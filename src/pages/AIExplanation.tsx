import { useState } from "react";

const original = `Section 3.2 (Amended): Periodic updates of KYC shall be done annually for high-risk customers and every 2 years for medium-risk customers. The regulated entity shall ensure that the risk categorization of customers is reviewed at each periodic update and any change in risk category is documented with supporting rationale. V-CIP shall be the preferred method for conducting periodic KYC updates where in-person interaction is not feasible.`;

const simple = `This rule says banks must check their high-risk customers' identity documents every year (instead of every 2 years). For medium-risk customers, it's still every 2 years. Banks should also check if a customer's risk level has changed during each review and write down why. Video calls (V-CIP) can be used instead of meeting in person.`;

const technical = `The amendment modifies the periodicity of Customer Due Diligence (CDD) reviews under the risk-based approach framework. High-risk customers now require annual KYC refresh cycles (previously biennial under the 2016 Master Direction). Medium-risk customers retain the 2-year cycle. The amendment mandates documented risk re-categorization at each CDD touchpoint, creating an audit trail requirement under PMLA Section 12. V-CIP (Video-based Customer Identification Process) per RBI Circular DOR.AML.REC.78 is elevated from permissive to preferred status for remote CDD execution.`;

export default function AIExplanation() {
  const [mode, setMode] = useState<"simple" | "technical">("simple");

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">AI Explanation</h1>
      <div className="border p-3 mb-4" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <div className="font-semibold text-sm mb-1">Original Regulation Text</div>
        <p className="text-sm">{original}</p>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          className={`border px-3 py-1 text-sm font-semibold ${mode === "simple" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
          onClick={() => setMode("simple")}
        >
          Explain Simply
        </button>
        <button
          className={`border px-3 py-1 text-sm font-semibold ${mode === "technical" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}
          onClick={() => setMode("technical")}
        >
          Explain Technically
        </button>
      </div>
      <div className="border p-3" style={{ boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03)" }}>
        <div className="font-semibold text-sm mb-1">
          {mode === "simple" ? "Simplified Explanation" : "Technical Explanation"}
        </div>
        <p className="text-sm">{mode === "simple" ? simple : technical}</p>
      </div>
    </div>
  );
}
