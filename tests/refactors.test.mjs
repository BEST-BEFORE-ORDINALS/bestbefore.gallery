import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCarouselLifespanHtml,
  buildHeartbeatLifespanHtml,
  formatCarouselMetaBlockTime,
  getCarouselJumpMax,
  getCarouselShiftLayout,
  getCarouselSlidePresentation,
  getHeartbeatNodeWidth,
  resolveCarouselJumpTarget,
} from "../src/carousel.js";
import {
  buildModalLifespanHtml,
  formatModalBlockTime,
  getModalLifespanVisualState,
} from "../src/modal.js";
import { parseRoute } from "../src/router.js";
import {
  buildPreparedItem,
  resolveBestBeforeStatus,
  splitProvenanceParts,
} from "../scripts/prepare-best-before-data.mjs";

test("parseRoute normalizes supported deep links", () => {
  assert.deepEqual(parseRoute("/"), {
    view: "gallery",
    tab: null,
    section: null,
    part: null,
    item: null,
    modal: false,
    statement: false,
    faq: null,
    canonicalPath: "/",
  });

  assert.equal(parseRoute("/42").item, 42);
  assert.equal(parseRoute("/42").modal, true);
  assert.equal(parseRoute("/about/statement").statement, true);
  assert.equal(parseRoute("/about/faq/how-does-it-work").faq, "how-does-it-work");
  assert.equal(parseRoute("/diary/6").part, 6);
  assert.equal(parseRoute("/diary/9").canonicalPath, "/diary");
  assert.equal(parseRoute("/ledger/hall-of-fame").section, "hall-of-fame");
});

test("carousel helper functions preserve jump and layout rules", () => {
  const items = [{ number: 10 }, { number: 25 }, { number: null }];
  assert.equal(getCarouselJumpMax(items), 25);
  assert.equal(getCarouselJumpMax([{ number: null }]), 420);

  assert.equal(formatCarouselMetaBlockTime(3), "30m");
  assert.equal(formatCarouselMetaBlockTime(12), "2h");

  assert.deepEqual(resolveCarouselJumpTarget("25", items, 25), { error: "", index: 1 });
  assert.deepEqual(resolveCarouselJumpTarget("0", items, 25), { error: "Enter 1-25", index: -1 });
  assert.deepEqual(resolveCarouselJumpTarget("24", items, 25), { error: "Nº24 not found", index: -1 });

  const desktopLayout = getCarouselShiftLayout({
    stageWidth: 1400,
    slideWidth: 300,
    maxOffset: 540,
    isDesktop: true,
    isCompact: false,
  });
  assert.ok(desktopLayout.sideShift > 0);
  assert.ok(desktopLayout.farShift > desktopLayout.sideShift);

  const focusPresentation = getCarouselSlidePresentation({
    immersive: false,
    diff: 0,
    isCompact: false,
    drag: 18,
    sideShift: 260,
    farShift: 420,
  });
  assert.equal(focusPresentation.opacity, 1);
  assert.equal(focusPresentation.pointerEvents, "auto");

  const farPresentation = getCarouselSlidePresentation({
    immersive: false,
    diff: 2,
    isCompact: false,
    drag: 0,
    sideShift: 260,
    farShift: 420,
  });
  assert.equal(farPresentation.zIndex, 12);
  assert.equal(farPresentation.pointerEvents, "none");
});

test("carousel and heartbeat markup helpers preserve status copy", () => {
  const expiredHtml = buildCarouselLifespanHtml({
    status: "expired",
    block: { tip: 500, expiry: 490 },
  });
  assert.match(expiredHtml, /ago/);

  assert.equal(
    buildHeartbeatLifespanHtml({ status: "sealed", block: {} }),
    '<span class="bb-hb-lifespan is-sealed">Awaiting activation</span>',
  );
  assert.equal(getHeartbeatNodeWidth(68, 1.4, false), 68);
  assert.equal(getHeartbeatNodeWidth(68, 1.4, true), 95);
});

test("modal helper functions preserve lifespan display rules", () => {
  assert.equal(formatModalBlockTime(3), "30m");
  assert.equal(formatModalBlockTime(12), "2h");

  assert.deepEqual(getModalLifespanVisualState({ immortal: true }), {
    lifespanPct: 100,
    lifespanClass: "is-immortal",
    remainingValueClass: "",
  });

  assert.deepEqual(
    getModalLifespanVisualState({ lifespan: 100, remaining: 5 }),
    {
      lifespanPct: 5,
      lifespanClass: "is-critical",
      remainingValueClass: "bb-modal__data-value--danger",
    },
  );

  assert.match(buildModalLifespanHtml("sealed", {}), /Awaiting activation/);
});

test("data preparation helpers preserve status and metadata mapping", () => {
  assert.deepEqual(splitProvenanceParts(" alpha, beta ,, gamma "), ["alpha", "beta", "gamma"]);

  const openNumberMap = new Map([[12, "/assets/outputs/BB12.png"]]);
  const expiredNumbers = new Set([13]);
  assert.equal(resolveBestBeforeStatus({ id: "SEALED", number: 12, openNumberMap, expiredNumbers }), "open");
  assert.equal(resolveBestBeforeStatus({ id: "abc", number: 13, openNumberMap, expiredNumbers }), "expired");
  assert.equal(resolveBestBeforeStatus({ id: "SEALED", number: 99, openNumberMap, expiredNumbers }), "sealed");

  const previewThumbMap = new Map([[12, "/assets/outputs/thumbs/BB12.jpg"]]);
  const prepared = buildPreparedItem(
    {
      name: "BEST BEFORE Nº12",
      id: "abc123",
      content_size: "1,024",
      fee: "210",
      provenance: "alpha, beta",
      artwork_type: "PNG",
      dimensions: "1800 x 3200 px",
      timestamp: "2026-01-02 03:04:05 UTC",
      content_type: "image/png",
      sat: "sat-1",
      height: "123456",
    },
    { openNumberMap, expiredNumbers, previewMap: openNumberMap, previewThumbMap },
  );

  assert.equal(prepared.number, 12);
  assert.equal(prepared.status, "open");
  assert.equal(prepared.contentSizeBytes, 1024);
  assert.equal(prepared.feeSat, 210);
  assert.equal(prepared.knownHeight, true);
  assert.deepEqual(prepared.provenanceParts, ["alpha", "beta"]);
  assert.equal(prepared.preview, "/assets/outputs/BB12.png");
  assert.equal(prepared.previewThumb, "/assets/outputs/thumbs/BB12.jpg");
});
