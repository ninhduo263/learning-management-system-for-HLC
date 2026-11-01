-- =============================================================================
-- HLC LMS - dữ liệu danh mục ban đầu
-- _id cố định = 24 ký tự đầu của md5(mã) để chạy lại nhiều lần vẫn ra cùng id.
-- =============================================================================

-- Ban / nhóm
INSERT INTO "Department" ("_id", "code", "name", "type") VALUES
    (left(md5('DEPT:BAN_HOC_TAP'), 24),  'BAN_HOC_TAP',  'Ban học tập',  'ACADEMIC'),
    (left(md5('DEPT:BAN_HLC_FUND'), 24), 'BAN_HLC_FUND', 'Ban HLC Fund', 'FUND'),
    (left(md5('DEPT:BAN_MENTORING'), 24), 'BAN_MENTORING', 'Ban Mentoring', 'MENTORING')
ON CONFLICT ("code") DO NOTHING;

-- Chức vụ
INSERT INTO "Position" ("_id", "code", "name", "sortOrder") VALUES
    (left(md5('POS:TRUONG_BAN'), 24), 'TRUONG_BAN', 'Trưởng ban', 1),
    (left(md5('POS:PHO_BAN'), 24),    'PHO_BAN',    'Phó ban',    2),
    (left(md5('POS:LEADER'), 24),     'LEADER',     'Leader',     3),
    (left(md5('POS:PHO_LEADER'), 24), 'PHO_LEADER', 'Phó leader', 4)
ON CONFLICT ("code") DO NOTHING;

-- Loại điểm (= cột của bảng tổng hợp phụ cấp)
INSERT INTO "PointType" ("_id", "code", "name", "category", "isAllowance", "sortOrder") VALUES
    (left(md5('PT:MENTORING_EARLY'), 24), 'MENTORING_EARLY', 'Mentoring sớm',          'MENTORING', TRUE, 1),
    (left(md5('PT:MENTORING_AWARD'), 24), 'MENTORING_AWARD', 'Giải cặp mentoring',     'MENTORING', TRUE, 2),
    (left(md5('PT:POSITION'), 24),        'POSITION',        'Phụ cấp chức vụ',        'POSITION',  TRUE, 3),
    (left(md5('PT:FUND'), 24),            'FUND',            'Đóng quỹ HLC Fund',      'FUND',      TRUE, 4),
    (left(md5('PT:MANUAL_BONUS'), 24),    'MANUAL_BONUS',    'Cộng điểm thủ công',     'BONUS',     TRUE, 90),
    (left(md5('PT:MANUAL_PENALTY'), 24),  'MANUAL_PENALTY',  'Trừ điểm thủ công',      'PENALTY',   TRUE, 91)
ON CONFLICT ("code") DO NOTHING;

-- Quy tắc điểm mentoring (barem đã chốt)
INSERT INTO "PointRule" ("_id", "code", "name", "pointTypeId", "ruleKind", "sourceType",
                         "targetMemberType", "conditions", "points", "exclusiveGroup", "priority") VALUES
    (left(md5('PR:MENTORING_EARLY_D1_7'), 24), 'MENTORING_EARLY_D1_7',
        'Mentee nộp recap trong ngày 1-7 của tháng', left(md5('PT:MENTORING_EARLY'), 24),
        'AUTO', 'MENTORING_RECAP', 'MENTEE',
        '{"recapRole": "MENTEE", "submittedDayFrom": 1, "submittedDayTo": 7, "timezone": "Asia/Ho_Chi_Minh"}',
        2, 'MENTORING_EARLY', 2),
    (left(md5('PR:MENTORING_EARLY_D8_13'), 24), 'MENTORING_EARLY_D8_13',
        'Mentee nộp recap từ ngày 8 đến 23:59 ngày 13 của tháng', left(md5('PT:MENTORING_EARLY'), 24),
        'AUTO', 'MENTORING_RECAP', 'MENTEE',
        '{"recapRole": "MENTEE", "submittedDayFrom": 8, "submittedDayTo": 13, "timezone": "Asia/Ho_Chi_Minh"}',
        1, 'MENTORING_EARLY', 1),
    (left(md5('PR:MENTORING_AWARD_RANK_1'), 24), 'MENTORING_AWARD_RANK_1',
        'Cặp mentoring giải nhất', left(md5('PT:MENTORING_AWARD'), 24),
        'RANKING', 'MENTORING_AWARD', 'MENTEE', '{"rank": 1}', 5, 'MENTORING_AWARD', 3),
    (left(md5('PR:MENTORING_AWARD_RANK_2'), 24), 'MENTORING_AWARD_RANK_2',
        'Cặp mentoring giải nhì', left(md5('PT:MENTORING_AWARD'), 24),
        'RANKING', 'MENTORING_AWARD', 'MENTEE', '{"rank": 2}', 3, 'MENTORING_AWARD', 2),
    (left(md5('PR:MENTORING_AWARD_RANK_3'), 24), 'MENTORING_AWARD_RANK_3',
        'Cặp mentoring giải ba', left(md5('PT:MENTORING_AWARD'), 24),
        'RANKING', 'MENTORING_AWARD', 'MENTEE', '{"rank": 3}', 2, 'MENTORING_AWARD', 1)
ON CONFLICT ("code") DO NOTHING;

-- Đóng quỹ: tổng tiền minh chứng đã duyệt (DONE) trong tháng >= 150.000đ -> +2 (chỉ mentee).
-- Mentor nộp quỹ theo nhóm do mentee quản trị: lên kế hoạch sau, chưa có rule.
INSERT INTO "PointRule" ("_id", "code", "name", "pointTypeId", "ruleKind", "sourceType",
                         "targetMemberType", "conditions", "points", "exclusiveGroup", "priority") VALUES
    (left(md5('PR:FUND_MONTHLY_FULL'), 24), 'FUND_MONTHLY_FULL',
        'Mentee đóng đủ quỹ trong tháng', left(md5('PT:FUND'), 24),
        'AUTO', 'FUND_MONTHLY', 'MENTEE', '{"minApprovedAmount": 150000}', 2, 'FUND_MONTHLY', 1)
ON CONFLICT ("code") DO NOTHING;

-- Quy tắc điểm chức vụ: tạm ẩn, chưa có barem -> tạo ở trạng thái tắt, điền "points" rồi bật isActive.
-- Trong lúc tắt, admin cộng phụ cấp chức vụ bằng PointAdjustment (loại điểm POSITION).
INSERT INTO "PointRule" ("_id", "code", "name", "pointTypeId", "ruleKind", "sourceType",
                         "targetMemberType", "conditions", "points", "exclusiveGroup", "priority", "isActive") VALUES
    (left(md5('PR:POSITION_TRUONG_BAN'), 24), 'POSITION_TRUONG_BAN', 'Phụ cấp trưởng ban',
        left(md5('PT:POSITION'), 24), 'POSITION', 'MEMBER_POSITION', 'MENTEE',
        '{"positionCode": "TRUONG_BAN"}', 0, NULL, 0, FALSE),
    (left(md5('PR:POSITION_PHO_BAN'), 24), 'POSITION_PHO_BAN', 'Phụ cấp phó ban',
        left(md5('PT:POSITION'), 24), 'POSITION', 'MEMBER_POSITION', 'MENTEE',
        '{"positionCode": "PHO_BAN"}', 0, NULL, 0, FALSE),
    (left(md5('PR:POSITION_LEADER'), 24), 'POSITION_LEADER', 'Phụ cấp leader',
        left(md5('PT:POSITION'), 24), 'POSITION', 'MEMBER_POSITION', 'MENTEE',
        '{"positionCode": "LEADER"}', 0, NULL, 0, FALSE),
    (left(md5('PR:POSITION_PHO_LEADER'), 24), 'POSITION_PHO_LEADER', 'Phụ cấp phó leader',
        left(md5('PT:POSITION'), 24), 'POSITION', 'MEMBER_POSITION', 'MENTEE',
        '{"positionCode": "PHO_LEADER"}', 0, NULL, 0, FALSE)
ON CONFLICT ("code") DO NOTHING;

-- Ba module học tập ban đầu (tạo bằng cấu hình, không cần code riêng).
-- Mã seed đặt tay cho dễ nhận; module admin tạo mới sẽ được service tự sinh mã (LM-0001, ...).
-- Điểm chấm bài thang 100 (maxScore), tách hoàn toàn với điểm phụ cấp.
INSERT INTO "LearningModule" ("_id", "code", "name", "departmentId", "targetMemberType", "cycleType",
                              "minSubmissionsPerCycle", "maxSubmissionsPerCycle", "libraryType",
                              "requireReview", "enableScoring", "maxScore", "sortOrder") VALUES
    (left(md5('MOD:READING'), 24), 'READING', 'Đọc sách', NULL, 'MENTEE', 'MONTHLY',
        1, NULL, 'BOOK', TRUE, TRUE, 100, 1),
    (left(md5('MOD:FAVORITE_ARTICLE'), 24), 'FAVORITE_ARTICLE', 'Bài tâm đắc', NULL, 'MENTEE', 'MONTHLY',
        1, NULL, NULL, TRUE, TRUE, 100, 2),
    (left(md5('MOD:ACADEMIC_WEEKLY'), 24), 'ACADEMIC_WEEKLY', 'Bài nộp ban học tập', left(md5('DEPT:BAN_HOC_TAP'), 24),
        'MENTEE', 'WEEKLY', 3, 4, 'DOCUMENT', TRUE, TRUE, 100, 3)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ModuleField" ("_id", "moduleId", "key", "label", "fieldType", "isRequired", "isUnique", "validation", "sortOrder") VALUES
    (left(md5('FLD:READING:book'), 24), left(md5('MOD:READING'), 24),
        'book', 'Sách đã đọc', 'LIBRARY_ITEM', TRUE, FALSE, NULL, 1),
    (left(md5('FLD:READING:youtubeUrl'), 24), left(md5('MOD:READING'), 24),
        'youtubeUrl', 'Link YouTube video cảm nhận', 'YOUTUBE_URL', TRUE, TRUE, NULL, 2),
    (left(md5('FLD:FAVORITE_ARTICLE:title'), 24), left(md5('MOD:FAVORITE_ARTICLE'), 24),
        'title', 'Tiêu đề', 'TEXT', TRUE, FALSE, '{"maxLength": 255}', 1),
    (left(md5('FLD:FAVORITE_ARTICLE:content'), 24), left(md5('MOD:FAVORITE_ARTICLE'), 24),
        'content', 'Nội dung bài viết', 'LONG_TEXT', FALSE, FALSE, NULL, 2),
    (left(md5('FLD:FAVORITE_ARTICLE:link'), 24), left(md5('MOD:FAVORITE_ARTICLE'), 24),
        'link', 'Link bài viết', 'URL', FALSE, FALSE, NULL, 3),
    (left(md5('FLD:ACADEMIC_WEEKLY:content'), 24), left(md5('MOD:ACADEMIC_WEEKLY'), 24),
        'content', 'Nội dung bài làm', 'LONG_TEXT', TRUE, FALSE, NULL, 1),
    (left(md5('FLD:ACADEMIC_WEEKLY:images'), 24), left(md5('MOD:ACADEMIC_WEEKLY'), 24),
        'images', 'Ảnh bài làm', 'IMAGE', FALSE, FALSE, '{"maxFiles": 10, "maxSizeMb": 10}', 2)
ON CONFLICT ("moduleId", "key") DO NOTHING;
