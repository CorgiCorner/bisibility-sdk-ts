import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  BisibilityClient,
  BisibilityResponseError,
  type CheckNotificationSettingInput,
  type CloudImportNotificationPreference,
  type CloudImportPackage,
  type NotificationPreferenceWarning,
  type NotificationPreferencesPatch,
  type ProviderEvidenceProjection,
  type RankCheckRunEvidenceProjection,
} from "../src/index.js";
import { validatePublicIdRequest } from "../src/public-id-contract.js";

const fixture = JSON.parse(readFileSync("test/fixtures/notification-evidence.json", "utf8"));
const project = "prj_a00000000000000000000000";
const checkId = "check_a00000000000000000000000";
const runId = "rcr_a00000000000000000000000";
const projection: ProviderEvidenceProjection = {
  acceptance: "accepted",
  accounting: null,
  cost: "unknown",
  fulfillment: "partial",
  original_checked_at: "2026-09-05T12:00:00.000Z",
  recovery: {
    state: "pending",
    last_attempt_at: null,
    next_attempt_at: "2026-09-05T13:00:00.000Z",
    reason: null,
  },
  result: "partial",
  returned_depth: 20,
};

function setup(body: unknown) {
  const requests: { method: string | undefined; body: unknown }[] = [];
  const client = new BisibilityClient({
    apiKey: "bsb_key_test_fixture",
    baseUrl: "https://example.com/api/v1",
    maxRetries: 0,
    fetch: async (input, init) => {
      if (String(input).endsWith("/capabilities"))
        return new Response(JSON.stringify({ apiVersions: ["v1"], data: [] }));
      requests.push({
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      });
    },
  });
  return { client, requests };
}

describe("notification and provider evidence response compatibility", () => {
  it("preserves captured notification reads and deprecated-write warnings", async () => {
    expect(await setup(fixture.preferences).client.notificationSettings.get(project)).toEqual(
      fixture.preferences,
    );
    const { client, requests } = setup(fixture.updated);
    const updated = await client.notificationSettings.update(project, { check_in_app: false });
    expectTypeOf(updated.warnings).toEqualTypeOf<NotificationPreferenceWarning[] | undefined>();
    expect(updated).toEqual(fixture.updated);
    expect(updated).toHaveProperty("warnings.0.field", "check_in_app");
    expect(requests).toEqual([{ method: "PATCH", body: { check_in_app: false } }]);
  });

  it("sends each new preference independently, including all modes and both thresholds' boundaries", async () => {
    const patches: NotificationPreferencesPatch[] = [
      ...(["all", "important", "none"] as const).map((check_notification_setting) => ({
        check_notification_setting,
      })),
      { check_notification_top_n: 1 },
      { check_notification_top_n: 100 },
      { check_notification_position_move: 1 },
      { check_notification_position_move: 100 },
      { provider_incident_in_app: true },
      { provider_incident_in_app: false },
    ];
    for (const patch of patches) {
      const { client, requests } = setup(fixture.updated);
      await client.notificationSettings.update(project, patch);
      expect(requests).toEqual([{ method: "PATCH", body: patch }]);
    }
    expectTypeOf<NotificationPreferencesPatch["check_notification_setting"]>().toEqualTypeOf<
      CheckNotificationSettingInput | undefined
    >();
    expectTypeOf<"future">().not.toExtend<CheckNotificationSettingInput>();
    expectTypeOf<CloudImportNotificationPreference["check_notification_setting"]>().toEqualTypeOf<
      CheckNotificationSettingInput | undefined
    >();
  });

  it("preserves legacy preferences with absent fields and accepts future response modes", async () => {
    const {
      check_notification_setting: _setting,
      check_notification_top_n: _top,
      check_notification_position_move: _move,
      provider_incident_in_app: _incident,
      ...legacy
    } = fixture.preferences;
    for (const source of [legacy, { ...legacy, check_notification_setting: "future_mode" }]) {
      expect(await setup(source).client.notificationSettings.get(project)).toEqual(source);
      const result = await setup(source).client.notificationSettings.update(project, {});
      expect(result).toEqual(source);
      expect(result.warnings).toBeUndefined();
    }
  });

  it("sends current and legacy cloud-import preference rows unchanged", async () => {
    const preferences: CloudImportNotificationPreference[] = [
      { check_in_app: false },
      {
        check_notification_setting: "important",
        check_notification_top_n: 1,
        check_notification_position_move: 100,
        provider_incident_in_app: false,
      },
    ];
    const packet = {
      alert_rules: [],
      competitors: [],
      keywords: [],
      notification_preferences: preferences,
      project_id: project,
      saved_views: [],
      version: 6 as const,
    } satisfies CloudImportPackage;
    const { client, requests } = setup({
      counts: {},
      job_id: "imp_a00000000000000000000000",
      state: "done",
    });
    await client.importCloudExport(packet);
    expect(requests).toEqual([{ method: "POST", body: packet }]);
  });

  it.each([false, true])(
    "validates import enums and integer boundaries (chunked: %s)",
    (chunked) => {
      function validate(preference: unknown) {
        if (chunked) {
          validatePublicIdRequest("/cloud/import/sessions/imp_a00000000000000000000000/chunks/0", {
            body: {
              checksum: `sha256:${"a".repeat(64)}`,
              kind: "sections",
              sections: { notification_preferences: [preference] },
            },
          });
          return;
        }
        validatePublicIdRequest("/cloud/import", {
          body: {
            alert_rules: [],
            competitors: [],
            keywords: [],
            notification_preferences: [preference],
            project_id: project,
            saved_views: [],
            version: 6,
          },
        });
      }
      for (const mode of ["all", "important", "none"])
        expect(() => validate({ check_notification_setting: mode })).not.toThrow();
      for (const field of ["check_notification_top_n", "check_notification_position_move"]) {
        for (const value of [1, 100]) expect(() => validate({ [field]: value })).not.toThrow();
        for (const value of [0, 101, 1.5, null, "5", Number.NaN])
          expect(() => validate({ [field]: value })).toThrow();
      }
      for (const value of ["future", "", null, true])
        expect(() => validate({ check_notification_setting: value })).toThrow();
      for (const value of [true, false])
        expect(() => validate({ provider_incident_in_app: value })).not.toThrow();
      expect(() => validate({ provider_incident_in_app: null })).toThrow();
    },
  );

  it("rejects malformed new preference fields and update warnings", async () => {
    for (const patch of [
      { check_notification_setting: null },
      { check_notification_top_n: null },
      { check_notification_position_move: "5" },
      { provider_incident_in_app: null },
      { warnings: [{ code: "deprecated_field", field: "check_in_app" }] },
      { warnings: null },
    ]) {
      await expect(
        setup({ ...fixture.updated, ...patch }).client.notificationSettings.update(project, {}),
      ).rejects.toBeInstanceOf(BisibilityResponseError);
    }
  });

  it("preserves absent, null and populated check projections without inventing comparison", async () => {
    const { evidence_projection: _projection, ...legacy } = fixture.check;
    for (const extra of [
      {},
      { evidence_projection: null, returned_depth: null },
      {
        comparison_allowed: false,
        evidence_projection: projection,
        result_completeness: "partial",
        returned_depth: 20,
      },
      { evidence_projection: { ...projection, recovery: null }, result_completeness: "future" },
    ]) {
      const source = { ...legacy, ...extra };
      const check = await setup(source).client.rankChecks.getResult(checkId);
      expectTypeOf(check.evidence_projection).toEqualTypeOf<
        ProviderEvidenceProjection | null | undefined
      >();
      expectTypeOf(check.comparison_allowed).toEqualTypeOf<false | undefined>();
      expect(check).toEqual(source);
    }
    for (const extra of [
      { comparison_allowed: true },
      { result_completeness: null },
      { returned_depth: "20" },
      { evidence_projection: { ...projection, returned_depth: "20" } },
      { evidence_projection: { ...projection, recovery: {} } },
    ]) {
      await expect(
        setup({ ...legacy, ...extra }).client.rankChecks.getResult(checkId),
      ).rejects.toBeInstanceOf(BisibilityResponseError);
    }
  });

  it("preserves absent, null, empty and populated retained-run projections", async () => {
    const { evidence_projections: _projections, ...legacy } = fixture.run;
    for (const extra of [
      {},
      { evidence_projections: null },
      { evidence_projections: [] },
      { evidence_projections: [{ ...projection, check_id: checkId }] },
    ]) {
      const source = { ...legacy, ...extra };
      const run = await setup(source).client.rankChecks.runs.get(project, runId);
      expectTypeOf(run.evidence_projections).toEqualTypeOf<
        RankCheckRunEvidenceProjection[] | null | undefined
      >();
      expect(run).toEqual(source);
      const list = { data: [source], meta: { next_cursor: null } };
      expect(await setup(list).client.rankChecks.runs.list(project)).toEqual(list);
    }
    await expect(
      setup({ ...legacy, evidence_projections: [projection] }).client.rankChecks.runs.get(
        project,
        runId,
      ),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });

  it("preserves legacy export projections when absent, null or populated", async () => {
    const { evidence_projection: _projection, ...row } = fixture.export.data[0];
    for (const extra of [{}, { evidence_projection: null }, { evidence_projection: projection }]) {
      const source = { ...fixture.export, data: [{ ...row, ...extra }] };
      expect(await setup(source).client.rankChecks.history.export(project)).toEqual(source);
    }
    await expect(
      setup({
        ...fixture.export,
        data: [{ ...row, evidence_projection: {} }],
      }).client.rankChecks.history.export(project),
    ).rejects.toBeInstanceOf(BisibilityResponseError);
  });
});
