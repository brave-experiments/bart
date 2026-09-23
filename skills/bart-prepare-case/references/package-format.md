# Package format (schemaVersion 2)

The preparing agent writes the findings and test guidance. TypeScript validates
structure and links; it does not generate conclusions. This format applies to new
cases and revisions. Do not edit schemaVersion 1 frozen packages: allocate a new
case and record the superseded snapshot. Legacy working cases cannot be newly frozen
without a schemaVersion 2 revision.

## Files and identity

- `case.json`: retain the creator's schemaVersion 2, caseId, target, objective and
  createdAt. Add preparedAt, status `prepared-for-attempt`, revision identities and
  generation provenance (agent and instruction version/hash when available).
- `test-plan.md`: the brief, check table, proposed actions and outcome rules.
- `context/findings.md`: preparation findings with primary evidence, not runtime results.
- `context/brief-index.json`: finding/check IDs and their titles, as shown below.
- `context/sources.json` and `context/source-index.json`: captures and pinned file metadata
  described in SKILL.md. Keep their IDs distinct from finding/check IDs; findings may
  cite several sources, and sources may support several findings.

## Anchors and links

Use `finding-001` through `finding-999` for findings, and `check-001` through
`check-999` for planned checks. Numbers are unique within each kind in the package;
there are no case-specific prefixes. IDs express identity, not order or severity.
Do not renumber existing IDs when headings or order change. Allocate the next unused
number for a new item; do not reuse retired numbers. When converting old ad hoc IDs,
record the mapping once in revision notes.

Define findings only in context/findings.md and checks only in test-plan.md, using
literal explicit anchors (double quotes, as below). Headings and titles describe the
item; links use exactly the title recorded in brief-index.json, not the bare ID.
The supported format uses inline Markdown links and no other explicit HTML anchors
in those two documents. Definitions and links must be outside fenced code and inline code spans.
Link destinations must match the full path and anchor; extra fragment text is invalid.

```markdown
<a id="finding-001"></a>

## Feature gate and default

State the evidence-backed finding, source IDs and exact source locators here.
```

Reference it from the plan:

```markdown
[Feature gate and default](context/findings.md#finding-001)
```

Define each check in the plan with `<a id="check-001"></a>` and a descriptive heading.
The check table links to that definition as `[Disabled comparison](#check-001)`.
Within findings.md, finding links use `#finding-NNN`; links back to a check use
`../test-plan.md#check-NNN`. Do not use an opaque ID as a prose citation.

Every finding and check must have a descriptive link from test-plan.md. Keep paths
relative. Source URLs and paths still identify the underlying evidence; a finding ID
alone is not a source citation.

## Machine-readable index

```json
{
  "findings": [
    { "id": "finding-001", "title": "Feature gate and default", "sourceIds": ["feature-source"] }
  ],
  "checks": [
    { "id": "check-001", "title": "Disabled comparison" }
  ]
}
```

Both arrays must be nonempty. Finding sourceIds must identify records in sources.json.
Use plain titles without Markdown link delimiters. Keep titles and links in sync.
The index records navigation and traceability, not a second copy of the brief.

## Content requirements

When primary sources identify a release containing a fix, make it an explicit
finding and prerequisite, with the release-comment URL and version. Distinguish
that release lead from the first usable APK: if that tag has no suitable APK,
provisioning must select a later artifact and verify its source relationship.
Do not download binaries during preparation or assert unobserved asset availability.

When the code gates behavior on a feature, explicitly name the exact symbol,
compiled default, user-visible flag (if present), activation conditions and relaunch
requirements. Cite the pinned declaration and guarded call site. Keep runtime
activation and production rollout separate from source defaults.

Finding/check IDs, duplicate or missing anchors, source references, link destinations
and descriptive labels are checked when freezing. The validator does not establish
that a finding is true, a procedure is executable, or a device test passed. It cannot
verify historical ID continuity without comparing revisions; preserve that continuity
as part of the agent's revision work.
