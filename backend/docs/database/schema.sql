-- =============================================================================
-- HLC LMS - PostgreSQL schema
-- Quy ước (khớp với base NestJS/Sequelize):
--   * Khóa chính "_id" VARCHAR(24) = chuỗi ObjectId do ứng dụng sinh (@StrObjectId).
--   * Tên bảng = hằng Entity (PascalCase), tên cột camelCase -> không cần map field.
--   * Mọi bảng có "createdAt" / "updatedAt" (Sequelize timestamps).
--   * Enum dùng VARCHAR + CHECK (dễ alter hơn kiểu ENUM của Postgres).
--   * Mốc thời gian dùng TIMESTAMPTZ; ngày lịch dùng DATE.
--   * Mọi phép tính "ngày trong tháng" phải quy đổi về múi giờ Asia/Ho_Chi_Minh.
-- Bảng "User" (tài khoản đăng nhập) do base quản lý, schema này chỉ tham chiếu.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A. NỀN TẢNG: thành viên, ban/nhóm, chức vụ, kỳ tháng
-- -----------------------------------------------------------------------------

CREATE TABLE "Department" (
    "_id"        VARCHAR(24) PRIMARY KEY,
    "code"       VARCHAR(50)  NOT NULL UNIQUE,
    "name"       VARCHAR(255) NOT NULL,
    "type"       VARCHAR(20)  NOT NULL DEFAULT 'OTHER'
                 CHECK ("type" IN ('ACADEMIC', 'FUND', 'MENTORING', 'GROUP', 'OTHER')),
    "parentId"   VARCHAR(24) REFERENCES "Department"("_id") ON DELETE SET NULL,
    "isActive"   BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Position" (
    "_id"        VARCHAR(24) PRIMARY KEY,
    "code"       VARCHAR(50)  NOT NULL UNIQUE,      -- TRUONG_BAN, PHO_BAN, LEADER, PHO_LEADER
    "name"       VARCHAR(255) NOT NULL,
    "sortOrder"  INTEGER NOT NULL DEFAULT 0,
    "isActive"   BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Member" (
    "_id"                 VARCHAR(24) PRIMARY KEY,
    "userId"              VARCHAR(24) UNIQUE REFERENCES "User"("_id") ON DELETE SET NULL,
    "memberCode"          VARCHAR(20)  NOT NULL UNIQUE,   -- HLC-MTE-00012 / HLC-MTO-00034
    "memberType"          VARCHAR(10)  NOT NULL CHECK ("memberType" IN ('MENTEE', 'MENTOR')),
    "fullName"            VARCHAR(255) NOT NULL,
    "dateOfBirth"         DATE,
    "gender"              VARCHAR(10) CHECK ("gender" IN ('MALE', 'FEMALE', 'OTHER')),
    "phone"               VARCHAR(20),
    "email"               VARCHAR(255),
    "profileUrl"          TEXT,
    "bankAccount"         VARCHAR(50),
    "bankName"            VARCHAR(255),
    "livingAllowanceType" VARCHAR(100),
    "joinedAt"            DATE,
    "allowanceStartDate"  DATE,
    "status"              VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'INACTIVE')),
    "note"                TEXT,
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Member_code_format" CHECK ("memberCode" ~ '^HLC-(MTE|MTO)-[0-9]{5}$'),
    CONSTRAINT "Member_code_matches_type" CHECK (
        ("memberType" = 'MENTEE' AND "memberCode" LIKE 'HLC-MTE-%')
        OR ("memberType" = 'MENTOR' AND "memberCode" LIKE 'HLC-MTO-%')
    )
);
CREATE INDEX "Member_type_status_idx" ON "Member" ("memberType", "status");

-- Chức vụ có thời hạn hiệu lực -> nguồn của điểm phụ cấp chức vụ (tạm ẩn, chỉnh tay được)
CREATE TABLE "MemberPosition" (
    "_id"           VARCHAR(24) PRIMARY KEY,
    "memberId"      VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE CASCADE,
    "departmentId"  VARCHAR(24) NOT NULL REFERENCES "Department"("_id") ON DELETE RESTRICT,
    "positionId"    VARCHAR(24) NOT NULL REFERENCES "Position"("_id") ON DELETE RESTRICT,
    "startDate"     DATE NOT NULL,
    "endDate"       DATE,                                 -- NULL = đang giữ chức vụ
    "note"          TEXT,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MemberPosition_date_range" CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);
CREATE INDEX "MemberPosition_member_idx" ON "MemberPosition" ("memberId", "startDate");
CREATE INDEX "MemberPosition_department_idx" ON "MemberPosition" ("departmentId");

-- Kỳ tháng: đơn vị tính điểm và chi trả phụ cấp (chi vào mùng 10 tháng sau)
CREATE TABLE "Period" (
    "_id"            VARCHAR(24) PRIMARY KEY,
    "code"           VARCHAR(7)  NOT NULL UNIQUE,         -- '2026-10'
    "year"           SMALLINT    NOT NULL,
    "month"          SMALLINT    NOT NULL CHECK ("month" BETWEEN 1 AND 12),
    "startDate"      DATE NOT NULL,
    "endDate"        DATE NOT NULL,
    "status"         VARCHAR(12) NOT NULL DEFAULT 'OPEN'
                     CHECK ("status" IN ('OPEN', 'CALCULATING', 'REVIEWING', 'LOCKED', 'EXPORTED', 'PAID')),
    "pointRate"      NUMERIC(12, 2) NOT NULL DEFAULT 0,   -- tiền / 1 điểm
    "baseAllowance"  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    "payoutDate"     DATE,
    "lockedAt"       TIMESTAMPTZ,
    "lockedBy"       VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Period_year_month_key" UNIQUE ("year", "month"),
    CONSTRAINT "Period_date_range" CHECK ("endDate" >= "startDate")
);

-- File/ảnh đính kèm dùng chung (recap, bài nộp, minh chứng quỹ, thư viện).
-- Luồng: upload qua POST /file (bảng "File" của base) -> tạo Attachment với fileId + url.
CREATE TABLE "Attachment" (
    "_id"         VARCHAR(24) PRIMARY KEY,
    "ownerType"   VARCHAR(30) NOT NULL
                  CHECK ("ownerType" IN ('MENTORING_RECAP', 'SUBMISSION', 'FUND_CONTRIBUTION', 'LIBRARY_ITEM')),
    "ownerId"     VARCHAR(24) NOT NULL,
    "fieldKey"    VARCHAR(50),                 -- ô form của module động chứa file này
    "fileId"      VARCHAR(24) REFERENCES "File"("_id") ON DELETE SET NULL,   -- file đã upload (base)
    "url"         TEXT NOT NULL,
    "storageKey"  TEXT,
    "fileName"    VARCHAR(255),
    "mimeType"    VARCHAR(100),
    "sizeBytes"   BIGINT CHECK ("sizeBytes" IS NULL OR "sizeBytes" >= 0),
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "uploadedBy"  VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "Attachment_owner_idx" ON "Attachment" ("ownerType", "ownerId");

-- -----------------------------------------------------------------------------
-- B. MENTORING
-- -----------------------------------------------------------------------------

CREATE TABLE "MentoringQuarter" (
    "_id"               VARCHAR(24) PRIMARY KEY,
    "code"              VARCHAR(6)  NOT NULL UNIQUE,      -- '2026Q4'
    "year"              SMALLINT    NOT NULL,
    "quarter"           SMALLINT    NOT NULL CHECK ("quarter" BETWEEN 1 AND 4),
    "startDate"         DATE NOT NULL,
    "endDate"           DATE NOT NULL,
    "preferenceOpenAt"  TIMESTAMPTZ NOT NULL,             -- ngày 5 tháng cuối quý trước
    "pairingOpenAt"     TIMESTAMPTZ NOT NULL,             -- ngày 10
    "visibleAt"         TIMESTAMPTZ NOT NULL,             -- ngày 25: mentor/mentee thấy cặp
    "status"            VARCHAR(10) NOT NULL DEFAULT 'DRAFT'
                        CHECK ("status" IN ('DRAFT', 'PAIRING', 'ACTIVE', 'CLOSED')),
    "isLocked"          BOOLEAN NOT NULL DEFAULT FALSE,
    "lockedAt"          TIMESTAMPTZ,
    "lockedBy"          VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdBy"         VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MentoringQuarter_year_quarter_key" UNIQUE ("year", "quarter"),
    CONSTRAINT "MentoringQuarter_date_range" CHECK ("endDate" > "startDate"),
    CONSTRAINT "MentoringQuarter_timeline_order" CHECK (
        "preferenceOpenAt" <= "pairingOpenAt" AND "pairingOpenAt" <= "visibleAt"
    )
);

-- Nguyện vọng chọn mentor của mentee cho một quý (3-10 mentor, kiểm tra ở service)
CREATE TABLE "MentorPreference" (
    "_id"           VARCHAR(24) PRIMARY KEY,
    "quarterId"     VARCHAR(24) NOT NULL REFERENCES "MentoringQuarter"("_id") ON DELETE CASCADE,
    "menteeId"      VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE CASCADE,
    "message"       VARCHAR(500),
    "submittedAt"   TIMESTAMPTZ NOT NULL,
    "isLateJoiner"  BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MentorPreference_quarter_mentee_key" UNIQUE ("quarterId", "menteeId")
);

CREATE TABLE "MentorPreferenceItem" (
    "_id"           VARCHAR(24) PRIMARY KEY,
    "preferenceId"  VARCHAR(24) NOT NULL REFERENCES "MentorPreference"("_id") ON DELETE CASCADE,
    "mentorId"      VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE CASCADE,
    "priority"      SMALLINT NOT NULL CHECK ("priority" BETWEEN 1 AND 10),
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MentorPreferenceItem_mentor_key" UNIQUE ("preferenceId", "mentorId"),
    CONSTRAINT "MentorPreferenceItem_priority_key" UNIQUE ("preferenceId", "priority")
);

-- Cặp mentor-mentee trong một quý. Một mentee chỉ có 1 cặp ACTIVE / quý.
-- Đổi mentor giữa quý: cặp cũ -> ENDED, tạo cặp mới cho các tháng còn lại.
CREATE TABLE "MentoringPair" (
    "_id"        VARCHAR(24) PRIMARY KEY,
    "quarterId"  VARCHAR(24) NOT NULL REFERENCES "MentoringQuarter"("_id") ON DELETE RESTRICT,
    "mentorId"   VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "menteeId"   VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "code"       VARCHAR(64) NOT NULL,                    -- mã cặp theo quý
    "status"     VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'ENDED', 'CANCELLED')),
    "source"     VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK ("source" IN ('MANUAL', 'IMPORT', 'INHERIT', 'SUGGEST')),
    "sortOrder"  INTEGER NOT NULL DEFAULT 0,
    "note"       TEXT,
    "createdBy"  VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MentoringPair_distinct_members" CHECK ("mentorId" <> "menteeId"),
    CONSTRAINT "MentoringPair_quarter_code_key" UNIQUE ("quarterId", "code")
);
CREATE UNIQUE INDEX "MentoringPair_one_active_per_mentee" ON "MentoringPair" ("quarterId", "menteeId")
    WHERE "status" = 'ACTIVE';
CREATE INDEX "MentoringPair_mentor_idx" ON "MentoringPair" ("mentorId", "quarterId");

-- Buổi mentoring theo tháng của một cặp (mỗi cặp 1 buổi / tháng) = lịch đã chốt.
CREATE TABLE "MentoringSession" (
    "_id"                    VARCHAR(24) PRIMARY KEY,
    "pairId"                 VARCHAR(24) NOT NULL REFERENCES "MentoringPair"("_id") ON DELETE CASCADE,
    "periodId"               VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE RESTRICT,
    "monthIndex"             SMALLINT NOT NULL CHECK ("monthIndex" BETWEEN 1 AND 3),   -- tháng thứ mấy trong quý
    "code"                   VARCHAR(64) NOT NULL,          -- mã mentoring theo tháng
    "status"                 VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'CANCELLED')),
    "scheduledStartAt"       TIMESTAMPTZ,                   -- NULL = chưa có lịch
    "scheduledEndAt"         TIMESTAMPTZ,
    "firstScheduledStartAt"  TIMESTAMPTZ,                   -- mốc chốt lần đầu: qua mốc này thì khóa sửa lịch
    "location"               VARCHAR(255),
    "meetingLink"            TEXT,
    "scheduleNote"           TEXT,
    "scheduleSubmittedBy"    VARCHAR(24) REFERENCES "Member"("_id") ON DELETE SET NULL,
    "scheduleSubmittedAt"    TIMESTAMPTZ,
    "recapDeadlineAt"        TIMESTAMPTZ,                   -- = thời điểm mentoring + 24h (service tính)
    "importedStatus"         JSONB,                         -- trạng thái lấy từ file Excel cũ
    "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MentoringSession_pair_period_key" UNIQUE ("pairId", "periodId"),
    CONSTRAINT "MentoringSession_period_code_key" UNIQUE ("periodId", "code"),
    CONSTRAINT "MentoringSession_schedule_complete" CHECK (
        ("scheduledStartAt" IS NULL AND "scheduledEndAt" IS NULL)
        OR ("scheduledStartAt" IS NOT NULL AND "scheduledEndAt" > "scheduledStartAt"
            AND "firstScheduledStartAt" IS NOT NULL AND "recapDeadlineAt" IS NOT NULL)
    )
);
CREATE INDEX "MentoringSession_period_start_idx" ON "MentoringSession" ("periodId", "scheduledStartAt");

-- Lịch sử chốt/sửa lịch (ai đổi, đổi từ giờ nào sang giờ nào)
CREATE TABLE "MentoringScheduleLog" (
    "_id"          VARCHAR(24) PRIMARY KEY,
    "sessionId"    VARCHAR(24) NOT NULL REFERENCES "MentoringSession"("_id") ON DELETE CASCADE,
    "action"       VARCHAR(20) NOT NULL CHECK ("action" IN ('CREATE', 'UPDATE', 'ADMIN_OVERRIDE', 'CANCEL')),
    "oldStartAt"   TIMESTAMPTZ,
    "oldEndAt"     TIMESTAMPTZ,
    "newStartAt"   TIMESTAMPTZ,
    "newEndAt"     TIMESTAMPTZ,
    "actorUserId"  VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "reason"       TEXT,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "MentoringScheduleLog_session_idx" ON "MentoringScheduleLog" ("sessionId", "createdAt");

-- Recap: mỗi buổi tối đa 1 recap của mentor + 1 recap của mentee
CREATE TABLE "MentoringRecap" (
    "_id"               VARCHAR(24) PRIMARY KEY,
    "sessionId"         VARCHAR(24) NOT NULL REFERENCES "MentoringSession"("_id") ON DELETE CASCADE,
    "memberId"          VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "role"              VARCHAR(10) NOT NULL CHECK ("role" IN ('MENTOR', 'MENTEE')),
    "content"           TEXT NOT NULL,
    "firstSubmittedAt"  TIMESTAMPTZ NOT NULL,   -- lần nộp đầu: dùng cho trạng thái và điểm sớm
    "lastSubmittedAt"   TIMESTAMPTZ NOT NULL,   -- lần sửa gần nhất
    "isLate"            BOOLEAN NOT NULL,        -- firstSubmittedAt > recapDeadlineAt
    "reviewStatus"      VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                        CHECK ("reviewStatus" IN ('PENDING', 'APPROVED', 'REJECTED')),
    "reviewedBy"        VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "reviewedAt"        TIMESTAMPTZ,
    "reviewNote"        TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MentoringRecap_session_role_key" UNIQUE ("sessionId", "role"),
    CONSTRAINT "MentoringRecap_submit_order" CHECK ("lastSubmittedAt" >= "firstSubmittedAt")
);
CREATE INDEX "MentoringRecap_member_idx" ON "MentoringRecap" ("memberId");
CREATE INDEX "MentoringRecap_review_idx" ON "MentoringRecap" ("reviewStatus");

-- Kết quả xếp giải nhất/nhì/ba theo tháng (nguồn của điểm giải thưởng)
CREATE TABLE "MentoringAward" (
    "_id"           VARCHAR(24) PRIMARY KEY,
    "periodId"      VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE CASCADE,
    "sessionId"     VARCHAR(24) NOT NULL UNIQUE REFERENCES "MentoringSession"("_id") ON DELETE CASCADE,
    "rank"          SMALLINT NOT NULL CHECK ("rank" BETWEEN 1 AND 3),
    "rankingBasis"  JSONB NOT NULL DEFAULT '{}',   -- snapshot: scheduledStartAt, completedAt...
    "decidedBy"     VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "decidedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "MentoringAward_period_rank_key" UNIQUE ("periodId", "rank")
);

-- -----------------------------------------------------------------------------
-- C. MODULE HỌC TẬP ĐỘNG (đọc sách, bài tâm đắc, ban học tập, ...)
-- -----------------------------------------------------------------------------

-- Thư viện dùng chung: sách (đọc sách) và tài liệu (ban học tập)
CREATE TABLE "LibraryItem" (
    "_id"           VARCHAR(24) PRIMARY KEY,
    "libraryType"   VARCHAR(10) NOT NULL CHECK ("libraryType" IN ('BOOK', 'DOCUMENT')),
    "departmentId"  VARCHAR(24) REFERENCES "Department"("_id") ON DELETE SET NULL,
    "title"         VARCHAR(500) NOT NULL,
    "author"        VARCHAR(255),
    "category"      VARCHAR(100),
    "description"   TEXT,
    "coverUrl"      TEXT,
    "fileUrl"       TEXT,
    "externalUrl"   TEXT,
    "isActive"      BOOLEAN NOT NULL DEFAULT TRUE,
    "createdBy"     VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "LibraryItem_type_idx" ON "LibraryItem" ("libraryType", "isActive", "category");

CREATE TABLE "LearningModule" (
    "_id"                     VARCHAR(24) PRIMARY KEY,
    "code"                    VARCHAR(50)  NOT NULL UNIQUE,   -- do hệ thống tự sinh (vd LM-0001)
    "name"                    VARCHAR(255) NOT NULL,
    "description"             TEXT,
    "departmentId"            VARCHAR(24) REFERENCES "Department"("_id") ON DELETE SET NULL,  -- ban phụ trách
    "targetMemberType"        VARCHAR(10) NOT NULL DEFAULT 'MENTEE'
                              CHECK ("targetMemberType" IN ('MENTEE', 'MENTOR', 'ALL')),
    "cycleType"               VARCHAR(10) NOT NULL CHECK ("cycleType" IN ('DAILY', 'WEEKLY', 'MONTHLY', 'ONCE')),
    "minSubmissionsPerCycle"  SMALLINT NOT NULL DEFAULT 1 CHECK ("minSubmissionsPerCycle" >= 0),
    "maxSubmissionsPerCycle"  SMALLINT CHECK ("maxSubmissionsPerCycle" IS NULL OR "maxSubmissionsPerCycle" >= 1),
    "libraryType"             VARCHAR(10) CHECK ("libraryType" IN ('BOOK', 'DOCUMENT')),   -- module gắn thư viện
    "requireReview"           BOOLEAN NOT NULL DEFAULT TRUE,     -- người duyệt: xem AdminPermission
    "enableScoring"           BOOLEAN NOT NULL DEFAULT FALSE,
    "maxScore"                NUMERIC(6, 2) NOT NULL DEFAULT 100 CHECK ("maxScore" > 0),  -- thang chấm bài
    "allowLateSubmission"     BOOLEAN NOT NULL DEFAULT TRUE,
    "settings"                JSONB NOT NULL DEFAULT '{}',
    "sortOrder"               INTEGER NOT NULL DEFAULT 0,
    "isActive"                BOOLEAN NOT NULL DEFAULT TRUE,
    "createdBy"               VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "LearningModule_submission_range" CHECK (
        "maxSubmissionsPerCycle" IS NULL OR "maxSubmissionsPerCycle" >= "minSubmissionsPerCycle"
    )
);

-- Ô nhập của form nộp bài (form builder)
CREATE TABLE "ModuleField" (
    "_id"         VARCHAR(24) PRIMARY KEY,
    "moduleId"    VARCHAR(24) NOT NULL REFERENCES "LearningModule"("_id") ON DELETE CASCADE,
    "key"         VARCHAR(50)  NOT NULL,
    "label"       VARCHAR(255) NOT NULL,
    "fieldType"   VARCHAR(20)  NOT NULL CHECK ("fieldType" IN (
                      'TEXT', 'LONG_TEXT', 'URL', 'YOUTUBE_URL', 'IMAGE', 'FILE',
                      'SELECT', 'MULTI_SELECT', 'NUMBER', 'DATE', 'LIBRARY_ITEM')),
    "isRequired"  BOOLEAN NOT NULL DEFAULT FALSE,
    "isUnique"    BOOLEAN NOT NULL DEFAULT FALSE,   -- chặn trùng giá trị trong module (vd link YouTube)
    "options"     JSONB,                            -- lựa chọn cho SELECT
    "validation"  JSONB,                            -- minLength, maxFiles, maxSizeMb...
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "ModuleField_module_key_key" UNIQUE ("moduleId", "key")
);

-- Tiêu chí chấm điểm bài của module (tổng maxScore các tiêu chí = thang của module, kiểm tra ở service)
CREATE TABLE "ModuleCriterion" (
    "_id"          VARCHAR(24) PRIMARY KEY,
    "moduleId"     VARCHAR(24) NOT NULL REFERENCES "LearningModule"("_id") ON DELETE CASCADE,
    "name"         VARCHAR(255) NOT NULL,
    "description"  TEXT,
    "maxScore"     NUMERIC(6, 2) NOT NULL CHECK ("maxScore" > 0),
    "weight"       NUMERIC(5, 2) NOT NULL DEFAULT 1 CHECK ("weight" > 0),
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "ModuleCriterion_module_idx" ON "ModuleCriterion" ("moduleId");

-- Bài tập cụ thể (tùy chọn), ví dụ "Bài tuần 42 - chủ đề X" của ban học tập
CREATE TABLE "ModuleAssignment" (
    "_id"          VARCHAR(24) PRIMARY KEY,
    "moduleId"     VARCHAR(24) NOT NULL REFERENCES "LearningModule"("_id") ON DELETE CASCADE,
    "periodId"     VARCHAR(24) REFERENCES "Period"("_id") ON DELETE SET NULL,
    "cycleKey"     VARCHAR(20) NOT NULL,      -- '2026-10' | '2026-W42' | '2026-10-16'
    "title"        VARCHAR(500) NOT NULL,
    "description"  TEXT,
    "openAt"       TIMESTAMPTZ,
    "dueAt"        TIMESTAMPTZ,
    "isActive"     BOOLEAN NOT NULL DEFAULT TRUE,
    "createdBy"    VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "ModuleAssignment_time_range" CHECK ("openAt" IS NULL OR "dueAt" IS NULL OR "dueAt" > "openAt")
);
CREATE INDEX "ModuleAssignment_module_cycle_idx" ON "ModuleAssignment" ("moduleId", "cycleKey");

-- Bài nộp chung cho mọi module. Giá trị form lưu trong "data" (JSONB, key = ModuleField.key).
CREATE TABLE "Submission" (
    "_id"            VARCHAR(24) PRIMARY KEY,
    "moduleId"       VARCHAR(24) NOT NULL REFERENCES "LearningModule"("_id") ON DELETE RESTRICT,
    "assignmentId"   VARCHAR(24) REFERENCES "ModuleAssignment"("_id") ON DELETE SET NULL,
    "memberId"       VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "periodId"       VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE RESTRICT,
    "cycleKey"       VARCHAR(20) NOT NULL,
    "libraryItemId"  VARCHAR(24) REFERENCES "LibraryItem"("_id") ON DELETE SET NULL,   -- sách được chọn
    "data"           JSONB NOT NULL DEFAULT '{}',
    "status"         VARCHAR(10) NOT NULL DEFAULT 'SUBMITTED' CHECK ("status" IN ('DRAFT', 'SUBMITTED')),
    "submittedAt"    TIMESTAMPTZ,
    "isLate"         BOOLEAN NOT NULL DEFAULT FALSE,
    "reviewStatus"   VARCHAR(12) NOT NULL DEFAULT 'PENDING'
                     CHECK ("reviewStatus" IN ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED')),
    "reviewerId"     VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "reviewedAt"     TIMESTAMPTZ,
    "feedback"       TEXT,
    "totalScore"     NUMERIC(6, 2) CHECK ("totalScore" IS NULL OR "totalScore" >= 0),  -- điểm chấm bài, KHÔNG phải điểm phụ cấp
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "Submission_submitted_has_time" CHECK ("status" = 'DRAFT' OR "submittedAt" IS NOT NULL)
);
CREATE INDEX "Submission_period_member_idx" ON "Submission" ("periodId", "memberId", "moduleId");
CREATE INDEX "Submission_module_cycle_idx" ON "Submission" ("moduleId", "cycleKey");
CREATE INDEX "Submission_review_idx" ON "Submission" ("moduleId", "reviewStatus");
CREATE INDEX "Submission_data_gin" ON "Submission" USING GIN ("data");

-- Chặn trùng cho các ô ModuleField.isUnique (vd 1 link YouTube chỉ được nộp 1 lần)
CREATE TABLE "SubmissionUniqueValue" (
    "_id"              VARCHAR(24) PRIMARY KEY,
    "moduleId"         VARCHAR(24) NOT NULL REFERENCES "LearningModule"("_id") ON DELETE CASCADE,
    "fieldId"          VARCHAR(24) NOT NULL REFERENCES "ModuleField"("_id") ON DELETE CASCADE,
    "submissionId"     VARCHAR(24) NOT NULL REFERENCES "Submission"("_id") ON DELETE CASCADE,
    "normalizedValue"  VARCHAR(500) NOT NULL,   -- vd YouTube video id
    "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "SubmissionUniqueValue_key" UNIQUE ("moduleId", "fieldId", "normalizedValue")
);

-- Điểm chấm theo từng tiêu chí
CREATE TABLE "SubmissionScore" (
    "_id"           VARCHAR(24) PRIMARY KEY,
    "submissionId"  VARCHAR(24) NOT NULL REFERENCES "Submission"("_id") ON DELETE CASCADE,
    "criterionId"   VARCHAR(24) NOT NULL REFERENCES "ModuleCriterion"("_id") ON DELETE RESTRICT,
    "score"         NUMERIC(6, 2) NOT NULL CHECK ("score" >= 0),
    "comment"       TEXT,
    "scoredBy"      VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "SubmissionScore_key" UNIQUE ("submissionId", "criterionId")
);

-- -----------------------------------------------------------------------------
-- D. HLC FUND
-- -----------------------------------------------------------------------------

-- Minh chứng đóng quỹ: mỗi lần nộp tiền là 1 bản ghi (một tháng có thể nộp nhiều lần).
-- Ảnh nằm trong Attachment. Admin quỹ duyệt từng bản ghi; tổng tiền DONE trong tháng
-- đạt mức của rule FUND_MONTHLY (mặc định 150.000đ) -> +2 điểm phụ cấp.
CREATE TABLE "FundContribution" (
    "_id"               VARCHAR(24) PRIMARY KEY,
    "memberId"          VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "periodId"          VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE RESTRICT,
    "contributionDate"  DATE NOT NULL,
    "amount"            NUMERIC(14, 2) NOT NULL CHECK ("amount" > 0),
    "note"              TEXT,
    "submittedAt"       TIMESTAMPTZ NOT NULL,
    "status"            VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'DONE', 'NOT_DONE')),
    "reviewedBy"        VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "reviewedAt"        TIMESTAMPTZ,
    "reviewNote"        TEXT,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "FundContribution_date_status_idx" ON "FundContribution" ("contributionDate", "status");
CREATE INDEX "FundContribution_period_idx" ON "FundContribution" ("periodId", "memberId", "status");

-- -----------------------------------------------------------------------------
-- E. ĐIỂM PHỤ CẤP / ĐIỂM THƯỞNG
-- -----------------------------------------------------------------------------

-- Danh mục loại điểm = các cột của bảng tổng hợp
CREATE TABLE "PointType" (
    "_id"          VARCHAR(24) PRIMARY KEY,
    "code"         VARCHAR(50)  NOT NULL UNIQUE,
    "name"         VARCHAR(255) NOT NULL,
    "category"     VARCHAR(12)  NOT NULL
                   CHECK ("category" IN ('MENTORING', 'POSITION', 'LEARNING', 'FUND', 'BONUS', 'PENALTY', 'OTHER')),
    "description"  TEXT,
    "isAllowance"  BOOLEAN NOT NULL DEFAULT TRUE,   -- có quy đổi ra tiền không
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "isActive"     BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quy tắc tính điểm (rule engine): nguồn dữ liệu + điều kiện + số điểm
CREATE TABLE "PointRule" (
    "_id"                 VARCHAR(24) PRIMARY KEY,
    "code"                VARCHAR(50)  NOT NULL UNIQUE,
    "name"                VARCHAR(255) NOT NULL,
    "pointTypeId"         VARCHAR(24) NOT NULL REFERENCES "PointType"("_id") ON DELETE RESTRICT,
    "ruleKind"            VARCHAR(10) NOT NULL CHECK ("ruleKind" IN ('AUTO', 'RANKING', 'POSITION', 'MANUAL')),
    "sourceType"          VARCHAR(30) NOT NULL CHECK ("sourceType" IN (
                              'MENTORING_RECAP', 'MENTORING_AWARD', 'MEMBER_POSITION',
                              'SUBMISSION', 'FUND_MONTHLY', 'POINT_ADJUSTMENT')),
    "targetMemberType"    VARCHAR(10) NOT NULL DEFAULT 'MENTEE'
                          CHECK ("targetMemberType" IN ('MENTEE', 'MENTOR', 'ALL')),
    "conditions"          JSONB NOT NULL DEFAULT '{}',
    "points"              NUMERIC(6, 2) NOT NULL,
    "exclusiveGroup"      VARCHAR(50),       -- cùng nhóm: mỗi nguồn chỉ nhận rule có priority cao nhất
    "priority"            INTEGER NOT NULL DEFAULT 0,
    "maxPointsPerPeriod"  NUMERIC(6, 2) CHECK ("maxPointsPerPeriod" IS NULL OR "maxPointsPerPeriod" > 0),
    "effectiveFrom"       DATE,
    "effectiveTo"         DATE,
    "isActive"            BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "PointRule_effective_range" CHECK (
        "effectiveFrom" IS NULL OR "effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom"
    )
);

-- Cộng/trừ thủ công và khiếu nại điểm (cần duyệt). Khi APPROVED -> sinh PointEntry.
CREATE TABLE "PointAdjustment" (
    "_id"             VARCHAR(24) PRIMARY KEY,
    "periodId"        VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE CASCADE,
    "memberId"        VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "pointTypeId"     VARCHAR(24) NOT NULL REFERENCES "PointType"("_id") ON DELETE RESTRICT,
    "kind"            VARCHAR(10) NOT NULL CHECK ("kind" IN ('MANUAL', 'APPEAL')),
    "points"          NUMERIC(6, 2) NOT NULL CHECK ("points" <> 0),
    "reason"          TEXT NOT NULL,
    "relatedEntryId"  VARCHAR(24),            -- PointEntry bị khiếu nại (FK thêm ở dưới)
    "status"          VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
    "requestedBy"     VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "reviewedBy"      VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "reviewedAt"      TIMESTAMPTZ,
    "reviewNote"      TEXT,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "PointAdjustment_period_idx" ON "PointAdjustment" ("periodId", "status");

-- Sổ cái điểm: mỗi lần cộng/trừ là 1 dòng, luôn trỏ về bản ghi gốc (sourceType + sourceId).
-- Không sửa / xóa: muốn hủy thì chuyển VOID kèm lý do.
CREATE TABLE "PointEntry" (
    "_id"          VARCHAR(24) PRIMARY KEY,
    "periodId"     VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE RESTRICT,
    "memberId"     VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "pointTypeId"  VARCHAR(24) NOT NULL REFERENCES "PointType"("_id") ON DELETE RESTRICT,
    "ruleId"       VARCHAR(24) REFERENCES "PointRule"("_id") ON DELETE RESTRICT,   -- NULL = điều chỉnh tay
    "points"       NUMERIC(6, 2) NOT NULL CHECK ("points" <> 0),
    "sourceType"   VARCHAR(30) NOT NULL CHECK ("sourceType" IN (
                       'MENTORING_RECAP', 'MENTORING_AWARD', 'MEMBER_POSITION',
                       'SUBMISSION', 'FUND_MONTHLY', 'POINT_ADJUSTMENT')),
    "sourceId"     VARCHAR(24) NOT NULL,       -- FUND_MONTHLY: sourceId = Period._id
    "description"  TEXT,
    "status"       VARCHAR(6) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'VOID')),
    "voidReason"   TEXT,
    "voidedBy"     VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "voidedAt"     TIMESTAMPTZ,
    "createdBy"    VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,      -- NULL = hệ thống
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "PointEntry_rule_or_adjustment" CHECK (
        "ruleId" IS NOT NULL OR "sourceType" = 'POINT_ADJUSTMENT'
    ),
    CONSTRAINT "PointEntry_void_has_reason" CHECK ("status" = 'ACTIVE' OR "voidReason" IS NOT NULL)
);
-- Chống cộng trùng: 1 rule chỉ cộng 1 lần cho 1 bản ghi gốc / thành viên / kỳ
CREATE UNIQUE INDEX "PointEntry_no_duplicate" ON "PointEntry"
    ("periodId", "memberId", COALESCE("ruleId", ''), "sourceType", "sourceId")
    WHERE "status" = 'ACTIVE';
CREATE INDEX "PointEntry_period_member_idx" ON "PointEntry" ("periodId", "memberId", "pointTypeId");
CREATE INDEX "PointEntry_source_idx" ON "PointEntry" ("sourceType", "sourceId");

ALTER TABLE "PointAdjustment"
    ADD CONSTRAINT "PointAdjustment_relatedEntryId_fkey"
    FOREIGN KEY ("relatedEntryId") REFERENCES "PointEntry"("_id") ON DELETE SET NULL;

-- Bảng tổng hợp theo kỳ: chốt kỳ thì snapshot lại (kể cả thông tin ngân hàng)
CREATE TABLE "AllowanceSummary" (
    "_id"               VARCHAR(24) PRIMARY KEY,
    "periodId"          VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE CASCADE,
    "memberId"          VARCHAR(24) NOT NULL REFERENCES "Member"("_id") ON DELETE RESTRICT,
    "pointsByType"      JSONB NOT NULL DEFAULT '{}',   -- { "MENTORING_EARLY": 2, "POSITION": 4 }
    "totalPoints"       NUMERIC(8, 2)  NOT NULL DEFAULT 0,
    "pointRate"         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "baseAllowance"     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    "amount"            NUMERIC(14, 2) NOT NULL DEFAULT 0,
    "status"            VARCHAR(8) NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'LOCKED', 'PAID')),
    "fullNameSnapshot"  VARCHAR(255),
    "bankAccountSnapshot" VARCHAR(50),
    "bankNameSnapshot"  VARCHAR(255),
    "calculatedAt"      TIMESTAMPTZ NOT NULL,
    "lockedAt"          TIMESTAMPTZ,
    "paidAt"            TIMESTAMPTZ,
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "AllowanceSummary_period_member_key" UNIQUE ("periodId", "memberId")
);
CREATE INDEX "AllowanceSummary_rank_idx" ON "AllowanceSummary" ("periodId", "totalPoints" DESC);

-- Lịch sử file đã xuất (Excel/CSV phụ cấp mùng 10, báo cáo tháng)
CREATE TABLE "PeriodExport" (
    "_id"         VARCHAR(24) PRIMARY KEY,
    "periodId"    VARCHAR(24) NOT NULL REFERENCES "Period"("_id") ON DELETE CASCADE,
    "exportType"  VARCHAR(20) NOT NULL
                  CHECK ("exportType" IN ('ALLOWANCE_XLSX', 'ALLOWANCE_CSV', 'MONTHLY_REPORT_XLSX')),
    "fileUrl"     TEXT NOT NULL,
    "checksum"    VARCHAR(64),
    "exportedBy"  VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "exportedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "note"        TEXT,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "PeriodExport_period_idx" ON "PeriodExport" ("periodId", "exportType");

-- -----------------------------------------------------------------------------
-- F. PHÂN QUYỀN ADMIN THEO PHẠM VI
-- Admin tổng = User.systemRole 'Admin' (toàn quyền, không cần dòng ở đây).
-- Admin phụ trách: mỗi dòng cấp 1 phạm vi cho 1 tài khoản. Một người có thể giữ nhiều dòng
--   (vd admin của nhiều module học tập), và có thể là mentee/mentor (vd trưởng ban học tập).
-- -----------------------------------------------------------------------------

CREATE TABLE "AdminPermission" (
    "_id"        VARCHAR(24) PRIMARY KEY,
    "userId"     VARCHAR(24) NOT NULL REFERENCES "User"("_id") ON DELETE CASCADE,
    "scope"      VARCHAR(20) NOT NULL CHECK ("scope" IN ('LEARNING_MODULE', 'FUND', 'MENTORING', 'POINT')),
    "moduleId"   VARCHAR(24) REFERENCES "LearningModule"("_id") ON DELETE CASCADE,
    "grantedBy"  VARCHAR(24) REFERENCES "User"("_id") ON DELETE SET NULL,
    "note"       TEXT,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- quyền module học tập phải chỉ rõ module; các phạm vi khác không gắn module
    CONSTRAINT "AdminPermission_module_scope" CHECK (
        ("scope" = 'LEARNING_MODULE') = ("moduleId" IS NOT NULL)
    )
);
CREATE UNIQUE INDEX "AdminPermission_key" ON "AdminPermission" ("userId", "scope", COALESCE("moduleId", ''));
CREATE INDEX "AdminPermission_module_idx" ON "AdminPermission" ("moduleId");

-- -----------------------------------------------------------------------------
-- G. TRẠNG THÁI MENTORING (tính theo thời điểm, không lưu cứng)
-- Truyền p_now để dùng được "ngày giả lập" khi test.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mentoring_session_status(p_now TIMESTAMPTZ DEFAULT now())
RETURNS TABLE (
    "sessionId"        VARCHAR(24),
    "periodId"         VARCHAR(24),
    "mentorStatus"     TEXT,     -- PENDING | SUBMITTED | MISSING | LATE | NO_SCHEDULE
    "menteeStatus"     TEXT,
    "pairStatus"       TEXT,     -- NO_SCHEDULE | PENDING | DONE | MISSING | LATE | CANCELLED
    "completedAt"      TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
    WITH role_status AS (
        SELECT
            s."_id" AS session_id,
            s."periodId" AS period_id,
            s."status" AS session_status,
            s."scheduledStartAt" AS start_at,
            r_mentor."firstSubmittedAt" AS mentor_at,
            r_mentee."firstSubmittedAt" AS mentee_at,
            CASE
                WHEN s."scheduledStartAt" IS NULL THEN 'NO_SCHEDULE'
                WHEN r_mentor."_id" IS NOT NULL AND r_mentor."reviewStatus" <> 'REJECTED'
                    THEN CASE WHEN r_mentor."isLate" THEN 'LATE' ELSE 'SUBMITTED' END
                WHEN p_now > s."recapDeadlineAt" THEN 'MISSING'
                ELSE 'PENDING'
            END AS mentor_status,
            CASE
                WHEN s."scheduledStartAt" IS NULL THEN 'NO_SCHEDULE'
                WHEN r_mentee."_id" IS NOT NULL AND r_mentee."reviewStatus" <> 'REJECTED'
                    THEN CASE WHEN r_mentee."isLate" THEN 'LATE' ELSE 'SUBMITTED' END
                WHEN p_now > s."recapDeadlineAt" THEN 'MISSING'
                ELSE 'PENDING'
            END AS mentee_status
        FROM "MentoringSession" s
        LEFT JOIN "MentoringRecap" r_mentor ON r_mentor."sessionId" = s."_id" AND r_mentor."role" = 'MENTOR'
             AND r_mentor."firstSubmittedAt" <= p_now
        LEFT JOIN "MentoringRecap" r_mentee ON r_mentee."sessionId" = s."_id" AND r_mentee."role" = 'MENTEE'
             AND r_mentee."firstSubmittedAt" <= p_now
    )
    SELECT
        session_id,
        period_id,
        mentor_status,
        mentee_status,
        CASE
            WHEN session_status = 'CANCELLED' THEN 'CANCELLED'
            WHEN start_at IS NULL THEN 'NO_SCHEDULE'
            WHEN 'MISSING' IN (mentor_status, mentee_status) THEN 'MISSING'
            WHEN 'LATE' IN (mentor_status, mentee_status) THEN 'LATE'
            WHEN mentor_status = 'SUBMITTED' AND mentee_status = 'SUBMITTED' THEN 'DONE'
            ELSE 'PENDING'
        END,
        CASE WHEN mentor_at IS NOT NULL AND mentee_at IS NOT NULL
             THEN GREATEST(mentor_at, mentee_at) END
    FROM role_status;
$$;
