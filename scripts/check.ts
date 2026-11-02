import { createSeed } from "../src/lib/seed";
import { diffById } from "../src/lib/schema";
import {
  canGoLive,
  gateKind,
  hiddenAdultCount,
  performFollow,
  performGift,
  performStartStream,
  platformAnalytics,
} from "../src/lib/logic";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const db = createSeed();
const alex = db.users.find((user) => user.id === "user_alex");
const sam = db.users.find((user) => user.id === "user_sam");
const noor = db.users.find((user) => user.id === "user_noor");
const luna = db.users.find((user) => user.id === "user_luna");
const mina = db.users.find((user) => user.id === "user_mina");
const nova = db.users.find((user) => user.id === "user_nova");
assert(alex && sam && noor && luna && mina && nova, "demo users missing");
assert(alex.coin_balance === 1650, `alex balance ${alex.coin_balance}`);
assert(sam.coin_balance === 490, `sam balance ${sam.coin_balance}`);
assert(noor.coin_balance === 200, `noor balance ${noor.coin_balance}`);
assert(luna.total_revenue === 10, `luna revenue ${luna.total_revenue}`);
assert(mina.total_revenue === 1, `mina revenue ${mina.total_revenue}`);
assert(nova.total_revenue === 0.5, `nova revenue ${nova.total_revenue}`);
assert(alex.content_filter_enabled === true, "alex filter");
assert(sam.content_filter_enabled === false, "sam filter");
assert(db.reports.filter((report) => report.status === "Open").length === 1, "open reports");
assert(db.gifts.map((gift) => gift.coin_cost).join(",") === "10,50,100,500,1000", "gift prices");
assert(hiddenAdultCount(db, alex) === 2, "filter hides two adult streams");
assert(hiddenAdultCount(db, sam) === 0, "sam sees adult streams");

const mature = db.streams.find((stream) => stream.id === "stream_luna");
const restricted = db.streams.find((stream) => stream.id === "stream_eden");
const sensitive = db.streams.find((stream) => stream.id === "stream_nova");
assert(mature && mature.sexual_content && mature.includes_nudity && gateKind(mature) === "adult", "mature flow");
assert(restricted && restricted.content_rating.startsWith("Restricted") && gateKind(restricted) === "adult", "restricted flow");
assert(sensitive && gateKind(sensitive) === "sensitive" && !sensitive.sexual_content, "non-sexual sensitive gate");
assert(!canGoLive("viewer") && canGoLive("creator") && canGoLive("administrator"), "go live roles");

const poor = performGift(db, "user_sam", "stream_nova", "gift_crown");
assert(!poor.ok, "crown should fail for sam");
assert(sam.coin_balance === 490, "failed gift must not charge");

const blocked = performStartStream(db, "user_sam", {
  title: "Not allowed",
  description: "",
  category: "Music",
  language: "en",
  content_rating: "General Audience (G)",
  sensitive_content_warning: false,
  sexual_content: false,
  includes_nudity: false,
  location: "Sydney",
});
assert(!blocked.ok, "viewer cannot go live");

const sexualOnTeen = performStartStream(db, "user_alex", {
  title: "Should fail",
  description: "",
  category: "Music",
  language: "en",
  content_rating: "Teen (13+)",
  sensitive_content_warning: false,
  sexual_content: true,
  includes_nudity: false,
  location: "Sydney",
});
assert(!sexualOnTeen.ok, "sexual content cannot use a teen rating");

const followed = performFollow(db, "user_morgan", "user_mina");
assert(followed.ok && followed.data.following, "follow");
const unfollowed = performFollow(db, "user_morgan", "user_mina");
assert(unfollowed.ok && unfollowed.data.following === false, "unfollow");

const ratings = new Set(db.streams.map((stream) => stream.content_rating));
assert(ratings.size === 4, "all ratings seeded");
const categories = new Set(db.streams.map((stream) => stream.category));
assert(categories.size === 9, "all categories seeded");
assert(platformAnalytics(db).open_reports >= 1, "analytics");

const diff = diffById(
  [{ id: "a", name: "one" }],
  [
    { id: "a", name: "two" },
    { id: "b", name: "new" },
  ],
);
assert(diff.upserts.length === 2 && diff.deletes.length === 0, "diff upsert");
const removed = diffById([{ id: "a" }, { id: "b" }], [{ id: "a" }]);
assert(removed.deletes.join() === "b", "diff delete");

console.log("seemee checks passed");
