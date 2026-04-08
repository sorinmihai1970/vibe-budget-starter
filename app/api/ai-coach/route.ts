import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

interface CategorySummary {
  category_name: string;
  category_icon: string;
  total: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
}

interface CoachRequest {
  categoryExpenses: CategorySummary[];
  monthlyBars: MonthlyTrend[];
  totalExpenses: number;
  totalIncome: number;
  currency: string;
  period: string;
}

interface CoachResponse {
  healthScore: number;
  healthExplanation: string;
  tips: string[];
  positiveObservation: string;
}

const PERIOD_LABELS: Record<string, string> = {
  current_month: "luna curentă",
  last_3_months: "ultimele 3 luni",
  last_6_months: "ultimele 6 luni",
  all: "toate datele disponibile",
};

function buildPrompt(data: CoachRequest): string {
  const periodLabel = PERIOD_LABELS[data.period] ?? data.period;
  const balance = data.totalIncome - data.totalExpenses;
  const savingsRate =
    data.totalIncome > 0
      ? ((balance / data.totalIncome) * 100).toFixed(1)
      : "0";

  const categoriesText = data.categoryExpenses
    .map(
      (c) =>
        `  - ${c.category_icon} ${c.category_name}: ${c.total.toFixed(2)} ${data.currency} (${c.percentage}% din cheltuieli)`
    )
    .join("\n");

  const trendsText = data.monthlyBars
    .map(
      (m) =>
        `  - ${m.month}: venituri ${m.income.toFixed(2)} ${data.currency}, cheltuieli ${m.expenses.toFixed(2)} ${data.currency}`
    )
    .join("\n");

  return `Ești un coach financiar personal care analizează datele de buget ale unui utilizator și oferă sfaturi în limba română.

DATELE UTILIZATORULUI (${periodLabel}):
- Total venituri: ${data.totalIncome.toFixed(2)} ${data.currency}
- Total cheltuieli: ${data.totalExpenses.toFixed(2)} ${data.currency}
- Balanță: ${balance.toFixed(2)} ${data.currency}
- Rata de economisire: ${savingsRate}%

Cheltuieli pe categorii:
${categoriesText || "  - Nu există cheltuieli înregistrate"}

Trend lunar:
${trendsText || "  - Nu există date lunare"}

INSTRUCȚIUNI:
Analizează aceste date și returnează EXCLUSIV un JSON valid (fără text înainte sau după), cu această structură exactă:
{
  "healthScore": <număr întreg 0-100>,
  "healthExplanation": "<1-2 propoziții care explică scorul, menționând rata de economisire și balanța>",
  "tips": [
    "<sfat 1 concret și acționabil bazat pe datele reale>",
    "<sfat 2 concret și acționabil>",
    "<sfat 3 concret și acționabil>",
    "<sfat 4 opțional dacă există date relevante>",
    "<sfat 5 opțional dacă există date relevante>"
  ],
  "positiveObservation": "<1 observație pozitivă sinceră despre ce face bine utilizatorul>"
}

Reguli pentru healthScore:
- 80-100: balanță pozitivă, rata economisire >20%
- 60-79: balanță pozitivă, rata economisire 5-20%
- 40-59: balanță pozitivă mică sau zero, rata economisire <5%
- 20-39: balanță negativă moderată
- 0-19: balanță puternic negativă

Sfaturile să fie specifice (menționează categorii reale din date), în română, la persoana a doua (tu/dvs).`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Autentificare
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Date din body
    const body = (await request.json()) as CoachRequest;

    if (!body.currency || !body.period) {
      return NextResponse.json({ error: "Date insuficiente" }, { status: 400 });
    }

    // 3. Apel Claude AI
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = buildPrompt(body);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    // 4. Parsare răspuns JSON
    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let coachData: CoachResponse;
    try {
      // Extrage JSON-ul dacă e înconjurat de text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      coachData = JSON.parse(jsonMatch[0]) as CoachResponse;
    } catch {
      console.error("[AI-COACH] JSON parse error. Raw:", rawText);
      return NextResponse.json(
        { error: "Eroare la procesarea răspunsului AI" },
        { status: 500 }
      );
    }

    // 5. Validare minimă
    if (
      typeof coachData.healthScore !== "number" ||
      !Array.isArray(coachData.tips) ||
      !coachData.healthExplanation ||
      !coachData.positiveObservation
    ) {
      return NextResponse.json(
        { error: "Răspuns AI incomplet" },
        { status: 500 }
      );
    }

    // Clampează scorul între 0-100
    coachData.healthScore = Math.max(0, Math.min(100, Math.round(coachData.healthScore)));

    return NextResponse.json({ data: coachData });
  } catch (error) {
    console.error("[AI-COACH] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
