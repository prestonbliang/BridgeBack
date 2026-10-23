# Selecting an additional original feature

Five candidates were compared after the required PathFinder, BarrierBreak, simulation and multi-program design were established. These are qualitative design judgments, not user-research measurements.

| Candidate | Usefulness | Originality | Feasibility | Privacy | Accessibility | Demo value | Maintenance |
|---|---|---|---|---|---|---|---|
| **Route Rescue: minimum accepted document route under constraints** | Directly addresses an unavailable document | Exact constrained set-cover across separate acceptance rules | Small catalog permits complete search | Stores status only | Plain-language route and impossibility result | Shows an obstacle resolving across plans | Reuses existing acceptance data |
| Provider call preparation card | Helps users ask focused questions | Moderate; structured handoff | Straightforward | Could omit personal facts | Printable and screen-reader friendly | Useful but less algorithmic | Requires keeping contact details current |
| Time-budget task planner | Helps choose what fits today | Moderate scheduling logic | Depends on credible effort/time data | Low collection risk | Clear list possible | Easy to explain | Unsupported duration estimates would mislead |
| Deadline collision calendar | Helps avoid scheduling conflicts | Moderate constraint visualization | Already partly supported by the required engine | Low collection risk | Requires an equivalent list | Weak with no verified deadlines loaded | Needs frequent authoritative verification |
| Evidence freshness assistant | Highlights aging document evidence | Rule-sensitive | Needs verified validity windows | Status/dates only | Plain reminders possible | Useful if real rules exist | High risk of inventing expiration policies |

## Why Route Rescue

A person may be unable to obtain a pay stub. A conventional checklist says “missing”; a useful navigator should determine whether an accepted route still exists. The shared inventory and explicit acceptance rules already provide the data needed. No new personal information or external service is necessary, and the result is both useful and technically inspectable.

## Algorithm

1. Collect every document acceptance gate in the selected programs.
2. Remove gates already satisfied by an available, usable document.
3. Exclude document types the user marks unavailable.
4. Detect any remaining gate with no accepted candidate. Report it by program and requirement; never bypass it.
5. Enumerate the bounded document subsets and retain those satisfying every outstanding gate.
6. Select the smallest subset. Use supplied effort only as a tie-breaker, then a stable lexical order.
7. Explain the checked rules, number of alternatives examined and remaining form/review work.

With five canonical document types, at most 32 subsets are examined. A defensive upper bound prevents accidentally applying an exponential search to an unbounded catalog. The output is the minimum number of additional document **types**, not a promise that real evidence will be accepted or a claim about elapsed time.

## Complete interaction

In Documents, select “I cannot obtain Pay stub.” The actual graph excludes that route, readiness recalculates, and Route Rescue suggests only alternatives explicitly accepted by each selected program. For all three fictional plans with identity and residence available, employer letter plus benefits statement cover the income gates. Mark identity unavailable and a required route becomes impossible; the application names the unresolved requirement instead of inventing an alternative. Corrections are available in Timeline.
