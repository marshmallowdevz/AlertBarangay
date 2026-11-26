import assert from "node:assert/strict";
import test from "node:test";
import { resolveIncidentReports } from "./communityMedia.js";

test("resolves incident media when batch signing omits one object", async () => {
  const signedIndividually = [];
  const supabase = {
    storage: {
      from(bucket) {
        assert.equal(bucket, "incident-media");
        return {
          async createSignedUrls(paths) {
            return {
              data: [
                { path: paths[0], signedUrl: "https://signed.example/first" },
                { path: paths[1], error: { message: "Object not readable" } },
              ],
              error: null,
            };
          },
          async createSignedUrl(path) {
            signedIndividually.push(path);
            return { data: { signedUrl: `https://signed.example/${path}` }, error: null };
          },
        };
      },
    },
  };

  const [incident] = await resolveIncidentReports(supabase, [{
    id: "incident-1",
    reporter_id: "resident",
    media_path: "resident/photo.webp",
    media_paths: ["resident/photo.webp", "resident/second.jpg"],
    media_types: ["image", "image"],
  }], { userId: "resident" });

  assert.deepEqual(signedIndividually, ["resident/second.jpg"]);
  assert.deepEqual(incident.media_urls.map((media) => media.url), [
    "https://signed.example/first",
    "https://signed.example/resident/second.jpg",
  ]);
});

test("does not sign incident media belonging to another resident", async () => {
  const requestedPaths = [];
  const supabase = {
    storage: {
      from() {
        return {
          async createSignedUrls(paths) {
            requestedPaths.push(...paths);
            return {
              data: paths.map((path) => ({ path, signedUrl: `https://signed.example/${path}` })),
              error: null,
            };
          },
          async createSignedUrl() {
            throw new Error("Individual signing should not be needed.");
          },
        };
      },
    },
  };

  const incidents = await resolveIncidentReports(supabase, [
    {
      id: "mine",
      reporter_id: "resident",
      media_path: "resident/photo.jpg",
      media_paths: ["resident/photo.jpg"],
    },
    {
      id: "not-mine",
      reporter_id: "another-resident",
      media_path: "another-resident/photo.jpg",
      media_paths: ["another-resident/photo.jpg"],
    },
  ], { userId: "resident" });

  assert.deepEqual(requestedPaths, ["resident/photo.jpg"]);
  assert.equal(incidents[0].displayMediaUrl, "https://signed.example/resident/photo.jpg");
  assert.equal(incidents[1].media_path, null);
  assert.equal(incidents[1].displayMediaUrl, "");
});
