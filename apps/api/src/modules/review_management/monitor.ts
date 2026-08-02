import { prisma } from "../../db.js";
import { isEntitled } from "../../billing/service.js";
import { getIntegrationConfig } from "../../integrations/service.js";
import { logActivity } from "../../activity/service.js";

export interface ExternalReview {
  externalId: string;
  author: string;
  rating: number;
  text: string;
}

/**
 * Fetch new reviews from Google Business Profile for an org.
 *
 * NOTE: the actual Google API call is stubbed until GBP credentials/OAuth are
 * wired up. The plumbing around it — the google_business integration, dedup by
 * externalId, import, activity logging, and scheduled polling — is complete, so
 * enabling it is a matter of implementing this one function.
 */
async function fetchExternalReviews(organizationId: string): Promise<ExternalReview[]> {
  const config = await getIntegrationConfig(organizationId, "google_business");
  if (!config?.locationId || !config.apiToken) return []; // not connected

  // TODO: call the Google Business Profile API here, e.g.
  //   GET https://mybusiness.googleapis.com/v4/{location}/reviews
  // and map results to ExternalReview[]. Returning [] for now.
  return [];
}

/** Import any new external reviews for an org (deduped by externalId). */
export async function syncReviews(organizationId: string): Promise<number> {
  if (!(await isEntitled(organizationId, "review_management"))) return 0;
  const external = await fetchExternalReviews(organizationId);
  let imported = 0;
  for (const r of external) {
    try {
      await prisma.review.create({
        data: {
          organizationId,
          author: r.author,
          rating: r.rating,
          text: r.text,
          source: "google",
          externalId: r.externalId,
        },
      });
      imported += 1;
      await logActivity(organizationId, "review", `New ${r.rating}★ review from ${r.author}`);
    } catch {
      // Unique (organizationId, externalId) violation → already imported. Skip.
    }
  }
  return imported;
}

/** Poll every org's connected review source (used by the scheduler). */
export async function runAllReviewSyncs(): Promise<number> {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  let total = 0;
  for (const org of orgs) {
    try {
      total += await syncReviews(org.id);
    } catch (err) {
      console.error(`[reviews] sync failed for ${org.id}:`, (err as Error).message);
    }
  }
  return total;
}
