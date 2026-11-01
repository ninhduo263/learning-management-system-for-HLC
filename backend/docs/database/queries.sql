-- =============================================================================
-- HLC LMS - "Tính lại" điểm của một kỳ tháng (đã chạy thử trên PostgreSQL 16)
-- Tham số psql: :period_id (Period._id), :now (thời điểm hiện tại / ngày giả lập),
--               :admin_user_id (User._id người bấm "Tính lại")
--
-- Nguyên tắc:
--   * _id của PointEntry hệ thống là tất định = md5(rule + bản ghi gốc) -> chạy lại không cộng trùng.
--   * desired_entry giữ danh sách entry "phải có" ở lần chạy này.
--   * Entry đã bị VOID mà nay thỏa điều kiện lại -> được bật ACTIVE trở lại.
--   * Entry ACTIVE không còn trong desired_entry -> VOID kèm lý do (không xóa, để truy vết).
-- =============================================================================

BEGIN;

SELECT set_config('hlc.period_id', :'period_id', true);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Period" WHERE "_id" = current_setting('hlc.period_id')
                   AND "status" IN ('OPEN', 'CALCULATING', 'REVIEWING')) THEN
        RAISE EXCEPTION 'Kỳ % không tồn tại hoặc đã khóa', current_setting('hlc.period_id');
    END IF;
END $$;

CREATE TEMP TABLE desired_entry ("id" VARCHAR(24) PRIMARY KEY) ON COMMIT DROP;

-- 1. Mentoring sớm: +2 (ngày 1-7) / +1 (ngày 8 - 23:59 ngày 13) theo lần nộp recap ĐẦU TIÊN
--    của mentee, quy đổi giờ VN. Mỗi recap chỉ nhận 1 rule trong cùng exclusiveGroup.
WITH candidates AS (
    SELECT left(md5(pr."_id" || r."_id"), 24) AS id, r."_id" AS recap_id, r."memberId", s."periodId",
           pr."_id" AS rule_id, pr."pointTypeId", pr."points", pr."code" AS rule_code,
           ROW_NUMBER() OVER (PARTITION BY r."_id", pr."exclusiveGroup" ORDER BY pr."priority" DESC) AS rn
    FROM "MentoringRecap" r
    JOIN "MentoringSession" s ON s."_id" = r."sessionId" AND s."status" = 'ACTIVE'
    JOIN "MentoringPair" mp ON mp."_id" = s."pairId" AND mp."status" <> 'CANCELLED'
    JOIN "Period" p ON p."_id" = s."periodId"
    JOIN "PointRule" pr ON pr."sourceType" = 'MENTORING_RECAP' AND pr."isActive"
         AND r."role" = pr."conditions"->>'recapRole'
    CROSS JOIN LATERAL (
        SELECT (r."firstSubmittedAt" AT TIME ZONE (pr."conditions"->>'timezone')) AS local_at
    ) t
    WHERE s."periodId" = :'period_id'
      AND r."reviewStatus" <> 'REJECTED'
      AND r."firstSubmittedAt" <= :'now'
      AND EXTRACT(YEAR FROM t.local_at) = p."year"
      AND EXTRACT(MONTH FROM t.local_at) = p."month"
      AND EXTRACT(DAY FROM t.local_at) BETWEEN (pr."conditions"->>'submittedDayFrom')::int
                                           AND (pr."conditions"->>'submittedDayTo')::int
), picked AS (
    SELECT * FROM candidates WHERE rn = 1
), upserted AS (
    INSERT INTO "PointEntry" ("_id", "periodId", "memberId", "pointTypeId", "ruleId", "points",
                              "sourceType", "sourceId", "description")
    SELECT id, "periodId", "memberId", "pointTypeId", rule_id, "points", 'MENTORING_RECAP', recap_id, rule_code
    FROM picked
    ON CONFLICT ("_id") DO UPDATE SET
        "points" = EXCLUDED."points", "status" = 'ACTIVE', "voidReason" = NULL,
        "voidedAt" = NULL, "voidedBy" = NULL, "updatedAt" = now()
    RETURNING 1
)
INSERT INTO desired_entry SELECT id FROM picked;

-- 2. Xếp giải nhất/nhì/ba của tháng: chỉ cặp DONE (cả 2 nộp đúng hạn),
--    buổi càng sớm càng cao; hòa thì cặp hoàn tất recap trước; cuối cùng theo mã. Không đồng giải.
DELETE FROM "MentoringAward" WHERE "periodId" = :'period_id';
WITH ranked AS (
    SELECT st."sessionId", s."periodId",
           ROW_NUMBER() OVER (ORDER BY s."scheduledStartAt", st."completedAt", s."code") AS rnk,
           jsonb_build_object('scheduledStartAt', s."scheduledStartAt", 'completedAt', st."completedAt") AS basis
    FROM mentoring_session_status(:'now') st
    JOIN "MentoringSession" s ON s."_id" = st."sessionId"
    JOIN "MentoringPair" mp ON mp."_id" = s."pairId" AND mp."status" <> 'CANCELLED'
    WHERE st."periodId" = :'period_id' AND st."pairStatus" = 'DONE'
)
INSERT INTO "MentoringAward" ("_id", "periodId", "sessionId", "rank", "rankingBasis", "decidedBy")
SELECT left(md5('AW' || "sessionId"), 24), "periodId", "sessionId", rnk, basis, :'admin_user_id'
FROM ranked
WHERE rnk <= 3;

-- 3. Điểm giải thưởng cho mentee của cặp đạt giải
WITH picked AS (
    SELECT left(md5(pr."_id" || a."_id"), 24) AS id, a."periodId", mp."menteeId", pr."pointTypeId",
           pr."_id" AS rule_id, pr."points", a."_id" AS award_id, pr."code" AS rule_code
    FROM "MentoringAward" a
    JOIN "MentoringSession" s ON s."_id" = a."sessionId"
    JOIN "MentoringPair" mp ON mp."_id" = s."pairId"
    JOIN "PointRule" pr ON pr."sourceType" = 'MENTORING_AWARD' AND pr."isActive"
         AND (pr."conditions"->>'rank')::int = a."rank"
    WHERE a."periodId" = :'period_id'
), upserted AS (
    INSERT INTO "PointEntry" ("_id", "periodId", "memberId", "pointTypeId", "ruleId", "points",
                              "sourceType", "sourceId", "description")
    SELECT id, "periodId", "menteeId", "pointTypeId", rule_id, "points", 'MENTORING_AWARD', award_id, rule_code
    FROM picked
    ON CONFLICT ("_id") DO UPDATE SET
        "points" = EXCLUDED."points", "status" = 'ACTIVE', "voidReason" = NULL,
        "voidedAt" = NULL, "voidedBy" = NULL, "updatedAt" = now()
    RETURNING 1
)
INSERT INTO desired_entry SELECT id FROM picked;

-- 4. Phụ cấp chức vụ: chức vụ còn hiệu lực ít nhất 1 ngày trong tháng
WITH picked AS (
    SELECT left(md5(pr."_id" || mpos."_id" || p."_id"), 24) AS id, p."_id" AS period_id, mpos."memberId",
           pr."pointTypeId", pr."_id" AS rule_id, pr."points", mpos."_id" AS position_id, pr."code" AS rule_code
    FROM "MemberPosition" mpos
    JOIN "Member" m ON m."_id" = mpos."memberId"
    JOIN "Position" pos ON pos."_id" = mpos."positionId"
    JOIN "Period" p ON p."_id" = :'period_id'
    JOIN "PointRule" pr ON pr."sourceType" = 'MEMBER_POSITION' AND pr."isActive" AND pr."points" <> 0
         AND pr."conditions"->>'positionCode' = pos."code"
         AND pr."targetMemberType" IN (m."memberType", 'ALL')
    WHERE mpos."startDate" <= p."endDate"
      AND (mpos."endDate" IS NULL OR mpos."endDate" >= p."startDate")
), upserted AS (
    INSERT INTO "PointEntry" ("_id", "periodId", "memberId", "pointTypeId", "ruleId", "points",
                              "sourceType", "sourceId", "description")
    SELECT id, period_id, "memberId", "pointTypeId", rule_id, "points", 'MEMBER_POSITION', position_id, rule_code
    FROM picked
    ON CONFLICT ("_id") DO UPDATE SET
        "points" = EXCLUDED."points", "status" = 'ACTIVE', "voidReason" = NULL,
        "voidedAt" = NULL, "voidedBy" = NULL, "updatedAt" = now()
    RETURNING 1
)
INSERT INTO desired_entry SELECT id FROM picked;

-- 5. Đóng quỹ đủ trong tháng: tổng tiền minh chứng DONE của kỳ >= minApprovedAmount.
--    sourceId = Period._id (mỗi thành viên tối đa 1 dòng / rule / kỳ).
WITH totals AS (
    SELECT f."memberId", f."periodId", sum(f."amount") AS approved_amount
    FROM "FundContribution" f
    WHERE f."periodId" = :'period_id' AND f."status" = 'DONE'
    GROUP BY f."memberId", f."periodId"
), picked AS (
    SELECT left(md5(pr."_id" || t."memberId" || t."periodId"), 24) AS id, t."periodId", t."memberId",
           pr."pointTypeId", pr."_id" AS rule_id, pr."points", pr."code" AS rule_code
    FROM totals t
    JOIN "Member" m ON m."_id" = t."memberId" AND m."status" = 'ACTIVE'
    JOIN "PointRule" pr ON pr."sourceType" = 'FUND_MONTHLY' AND pr."isActive"
         AND pr."targetMemberType" IN (m."memberType", 'ALL')
    WHERE t.approved_amount >= (pr."conditions"->>'minApprovedAmount')::numeric
), upserted AS (
    INSERT INTO "PointEntry" ("_id", "periodId", "memberId", "pointTypeId", "ruleId", "points",
                              "sourceType", "sourceId", "description")
    SELECT id, "periodId", "memberId", "pointTypeId", rule_id, "points", 'FUND_MONTHLY', "periodId", rule_code
    FROM picked
    ON CONFLICT ("_id") DO UPDATE SET
        "points" = EXCLUDED."points", "status" = 'ACTIVE', "voidReason" = NULL,
        "voidedAt" = NULL, "voidedBy" = NULL, "updatedAt" = now()
    RETURNING 1
)
INSERT INTO desired_entry SELECT id FROM picked;

-- 6. Hủy điểm hệ thống không còn thỏa điều kiện (điểm thủ công ruleId NULL không bị đụng tới)
UPDATE "PointEntry" e SET
    "status" = 'VOID', "voidReason" = 'Không còn thỏa điều kiện khi tính lại',
    "voidedAt" = now(), "voidedBy" = :'admin_user_id', "updatedAt" = now()
WHERE e."periodId" = :'period_id'
  AND e."status" = 'ACTIVE'
  AND e."ruleId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM desired_entry d WHERE d."id" = e."_id");

-- 7. Tổng hợp tháng -> AllowanceSummary (mỗi mentee 1 dòng; dòng đã LOCKED/PAID giữ nguyên)
INSERT INTO "AllowanceSummary" ("_id", "periodId", "memberId", "pointsByType", "totalPoints",
                                "pointRate", "baseAllowance", "amount", "calculatedAt",
                                "fullNameSnapshot", "bankAccountSnapshot", "bankNameSnapshot")
SELECT left(md5('AS' || p."_id" || m."_id"), 24), p."_id", m."_id",
       COALESCE((SELECT jsonb_object_agg(x.code, x.pts) FROM (
           SELECT pt."code", sum(e."points") AS pts
           FROM "PointEntry" e JOIN "PointType" pt ON pt."_id" = e."pointTypeId"
           WHERE e."periodId" = p."_id" AND e."memberId" = m."_id" AND e."status" = 'ACTIVE'
           GROUP BY pt."code") x), '{}'),
       COALESCE(tot.pts, 0), p."pointRate", p."baseAllowance",
       p."baseAllowance" + COALESCE(tot.pts, 0) * p."pointRate",
       :'now', m."fullName", m."bankAccount", m."bankName"
FROM "Member" m
CROSS JOIN "Period" p
LEFT JOIN LATERAL (
    SELECT sum(e."points") AS pts
    FROM "PointEntry" e JOIN "PointType" pt ON pt."_id" = e."pointTypeId"
    WHERE e."periodId" = p."_id" AND e."memberId" = m."_id" AND e."status" = 'ACTIVE' AND pt."isAllowance"
) tot ON TRUE
WHERE p."_id" = :'period_id' AND m."memberType" = 'MENTEE' AND m."status" = 'ACTIVE'
ON CONFLICT ("periodId", "memberId") DO UPDATE SET
    "pointsByType" = EXCLUDED."pointsByType",
    "totalPoints"  = EXCLUDED."totalPoints",
    "pointRate"    = EXCLUDED."pointRate",
    "baseAllowance" = EXCLUDED."baseAllowance",
    "amount"       = EXCLUDED."amount",
    "calculatedAt" = EXCLUDED."calculatedAt",
    "fullNameSnapshot" = EXCLUDED."fullNameSnapshot",
    "bankAccountSnapshot" = EXCLUDED."bankAccountSnapshot",
    "bankNameSnapshot" = EXCLUDED."bankNameSnapshot",
    "updatedAt" = now()
WHERE "AllowanceSummary"."status" = 'DRAFT';

COMMIT;
