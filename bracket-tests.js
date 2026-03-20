const assert = require("assert");

function computeBracketOutcome(answers) {
  const q1Winner = answers.q1; // perry or ping
  const q2Winner = answers.q2; // iggy or tobi
  const q3Winner = answers.q3; // sky or ty
  const q4Winner = answers.q4; // ola or q3Winner
  const q5Winner = answers.q5; // q1Winner or q2Winner
  const q6Winner = answers.q6; // q4Winner or q5Winner

  return {
    q1Winner,
    q2Winner,
    q3Winner,
    q4Pair: ["ola", q3Winner],
    q5Pair: [q1Winner, q2Winner],
    q4Winner,
    q5Winner,
    q6Pair: [q4Winner, q5Winner],
    preferredPal: q6Winner,
    fallbackPal: q5Winner
  };
}

function assignWithStock(preferredPal, fallbackPal, stock) {
  if (preferredPal && stock[preferredPal] > 0) {
    return preferredPal;
  }

  if (fallbackPal && stock[fallbackPal] > 0) {
    return fallbackPal;
  }

  return Object.keys(stock).find((pal) => stock[pal] > 0) || null;
}

function cloneStock(base = {}) {
  return {
    perry: 1,
    ping: 1,
    ola: 1,
    ty: 1,
    sky: 1,
    tobi: 1,
    iggy: 1,
    ...base
  };
}

function runNamedTests() {
  // Case 1 from your example:
  // Q1 Perry, Q2 Iggy, Q3 Sky, Q4 Ola, Q5 Iggy, Q6 Iggy
  {
    const outcome = computeBracketOutcome({
      q1: "perry",
      q2: "iggy",
      q3: "sky",
      q4: "ola",
      q5: "iggy",
      q6: "iggy"
    });

    assert.deepStrictEqual(outcome.q4Pair, ["ola", "sky"]);
    assert.deepStrictEqual(outcome.q5Pair, ["perry", "iggy"]);
    assert.deepStrictEqual(outcome.q6Pair, ["ola", "iggy"]);
    assert.strictEqual(outcome.preferredPal, "iggy");
    assert.strictEqual(outcome.fallbackPal, "iggy");

    const stock = cloneStock();
    const assigned = assignWithStock(outcome.preferredPal, outcome.fallbackPal, stock);
    assert.strictEqual(assigned, "iggy");
  }

  // Case 2 from your example:
  // Q1 Ping, Q2 Tobi, Q3 Ty, Q4 Ty, Q5 Tobi, Q6 Ty
  {
    const outcome = computeBracketOutcome({
      q1: "ping",
      q2: "tobi",
      q3: "ty",
      q4: "ty",
      q5: "tobi",
      q6: "ty"
    });

    assert.deepStrictEqual(outcome.q4Pair, ["ola", "ty"]);
    assert.deepStrictEqual(outcome.q5Pair, ["ping", "tobi"]);
    assert.deepStrictEqual(outcome.q6Pair, ["ty", "tobi"]);
    assert.strictEqual(outcome.preferredPal, "ty");
    assert.strictEqual(outcome.fallbackPal, "tobi");

    const stock = cloneStock();
    const assigned = assignWithStock(outcome.preferredPal, outcome.fallbackPal, stock);
    assert.strictEqual(assigned, "ty");
  }

  // Stock fallback test: preferred out of stock -> fallback should be used
  {
    const outcome = computeBracketOutcome({
      q1: "ping",
      q2: "tobi",
      q3: "ty",
      q4: "ty",
      q5: "tobi",
      q6: "ty"
    });

    const stock = cloneStock({ ty: 0, tobi: 5 });
    const assigned = assignWithStock(outcome.preferredPal, outcome.fallbackPal, stock);
    assert.strictEqual(assigned, "tobi");
  }

  // Final fallback test: both preferred and fallback out of stock
  {
    const outcome = computeBracketOutcome({
      q1: "perry",
      q2: "iggy",
      q3: "sky",
      q4: "ola",
      q5: "iggy",
      q6: "iggy"
    });

    const stock = cloneStock({
      iggy: 0,
      perry: 3,
      ping: 0,
      ola: 0,
      ty: 0,
      sky: 0,
      tobi: 0
    });

    const assigned = assignWithStock(outcome.preferredPal, outcome.fallbackPal, stock);
    assert.strictEqual(assigned, "perry");
  }

  console.log("Named tests passed.");
}

function runExhaustiveTests() {
  const q1Options = ["perry", "ping"];
  const q2Options = ["iggy", "tobi"];
  const q3Options = ["sky", "ty"];

  let count = 0;

  for (const q1Winner of q1Options) {
    for (const q2Winner of q2Options) {
      for (const q3Winner of q3Options) {
        const q4Options = ["ola", q3Winner];
        const q5Options = [q1Winner, q2Winner];

        for (const q4Winner of q4Options) {
          for (const q5Winner of q5Options) {
            const q6Options = [q4Winner, q5Winner];

            for (const q6Winner of q6Options) {
              const outcome = computeBracketOutcome({
                q1: q1Winner,
                q2: q2Winner,
                q3: q3Winner,
                q4: q4Winner,
                q5: q5Winner,
                q6: q6Winner
              });

              // Structure checks
              assert.deepStrictEqual(outcome.q4Pair, ["ola", q3Winner]);
              assert.deepStrictEqual(outcome.q5Pair, [q1Winner, q2Winner]);
              assert.deepStrictEqual(outcome.q6Pair, [q4Winner, q5Winner]);

              // Preferred/fallback checks
              assert.strictEqual(outcome.preferredPal, q6Winner);
              assert.strictEqual(outcome.fallbackPal, q5Winner);

              // Stock checks
              {
                const stock = cloneStock();
                const assigned = assignWithStock(outcome.preferredPal, outcome.fallbackPal, stock);
                assert.strictEqual(assigned, q6Winner);
              }

              {
                const stock = cloneStock({
                  [q6Winner]: 0,
                  [q5Winner]: 2
                });
                const assigned = assignWithStock(outcome.preferredPal, outcome.fallbackPal, stock);
                assert.strictEqual(assigned, q5Winner);
              }

              count += 1;
            }
          }
        }
      }
    }
  }

  console.log(`Exhaustive tests passed. Total combinations checked: ${count}`);
}

runNamedTests();
runExhaustiveTests();
console.log("All bracket tests passed.");