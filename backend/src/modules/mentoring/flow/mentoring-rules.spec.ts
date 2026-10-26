import {
    recapDeadlineOf,
    canAdminPair,
    canChoosePreference,
    canEditSchedule,
    canWriteRecap,
    combineRecapStatuses,
    isWithinMonth,
    pairCode,
    pairRecapStatus,
    quarterDates,
    quarterOfDate,
    quarterTimeline,
    roleRecapStatus,
    sessionCode,
} from "./mentoring-rules";

const vn = (text: string) => new Date(`${text}+07:00`);

describe("mentoring rules", () => {
    it("tính mốc quý theo tháng cuối quý trước, giờ VN", () => {
        const timeline = quarterTimeline({ year: 2026, quarter: 4 });
        expect(timeline.preferenceOpenAt).toEqual(vn("2026-09-05T00:00:00"));
        expect(timeline.pairingOpenAt).toEqual(vn("2026-09-10T00:00:00"));
        expect(timeline.visibleAt).toEqual(vn("2026-09-25T00:00:00"));
        // Q1 lấy mốc từ tháng 12 năm trước
        expect(
            quarterTimeline({ year: 2027, quarter: 1 }).pairingOpenAt,
        ).toEqual(vn("2026-12-10T00:00:00"));
        expect(quarterDates({ year: 2026, quarter: 1 })).toEqual({
            startDate: "2026-01-01",
            endDate: "2026-03-31",
        });
    });

    it("xác định quý theo giờ VN", () => {
        // 30/09 23:30 giờ VN vẫn là Q3 dù UTC là 30/09 16:30; 01/10 00:30 VN là Q4
        expect(quarterOfDate(vn("2026-09-30T23:30:00"))).toEqual({
            year: 2026,
            quarter: 3,
        });
        expect(quarterOfDate(vn("2026-10-01T00:30:00"))).toEqual({
            year: 2026,
            quarter: 4,
        });
    });

    it("admin ghép quý hiện tại, quý kế tiếp chỉ từ ngày 10", () => {
        const q4 = { year: 2026, quarter: 4 };
        expect(canAdminPair(q4, vn("2026-09-09T23:59:00"))).toBe(false);
        expect(canAdminPair(q4, vn("2026-09-10T00:00:00"))).toBe(true);
        expect(canAdminPair(q4, vn("2026-11-15T10:00:00"))).toBe(true);
        expect(canAdminPair(q4, vn("2027-01-02T10:00:00"))).toBe(false);
        expect(
            canAdminPair({ year: 2027, quarter: 2 }, vn("2026-11-15T10:00:00")),
        ).toBe(false);
    });

    it("nguyện vọng mở từ ngày 5 đến trước ngày 10", () => {
        const timeline = quarterTimeline({ year: 2026, quarter: 4 });
        expect(canChoosePreference(timeline, vn("2026-09-04T23:59:00"))).toBe(
            false,
        );
        expect(canChoosePreference(timeline, vn("2026-09-05T00:00:00"))).toBe(
            true,
        );
        expect(canChoosePreference(timeline, vn("2026-09-09T23:59:00"))).toBe(
            true,
        );
        expect(canChoosePreference(timeline, vn("2026-09-10T00:00:00"))).toBe(
            false,
        );
    });

    it("sinh mã cặp và mã tháng theo định dạng đang dùng", () => {
        const q4 = { year: 2026, quarter: 4 };
        expect(pairCode(q4, "HLC-MTO-00012", "HLC-MTE-00034")).toBe(
            "Q42026O00012E00034",
        );
        expect(sessionCode(q4, 10, "HLC-MTO-00012", "HLC-MTE-00034")).toBe(
            "T10Q42026O00012E00034",
        );
    });

    it("hạn recap = giờ kết thúc buổi + 24h (giờ VN)", () => {
        // Kết thúc 20:00 ngày 10 -> hạn 20:00 ngày 11
        expect(recapDeadlineOf(vn("2026-10-10T20:00:00"))).toEqual(
            vn("2026-10-11T20:00:00"),
        );
    });

    describe("trạng thái recap", () => {
        const start = vn("2026-10-02T10:00:00");
        const session = {
            status: "ACTIVE",
            scheduledStartAt: start,
            scheduledEndAt: vn("2026-10-02T11:00:00"),
            firstScheduledStartAt: start,
            recapDeadlineAt: recapDeadlineOf(vn("2026-10-02T11:00:00")),
        };
        const recap = (
            at: string,
            isLate = false,
            reviewStatus = "PENDING",
        ) => ({
            firstSubmittedAt: vn(at),
            isLate,
            reviewStatus,
        });

        it("trong 24h: Chờ / Đã nộp; ngoài 24h: Chưa xong / Nộp muộn", () => {
            const within = vn("2026-10-03T09:00:00");
            const after = vn("2026-10-04T00:00:00");
            expect(roleRecapStatus(session, null, within)).toBe("PENDING");
            expect(
                roleRecapStatus(session, recap("2026-10-02T20:00:00"), within),
            ).toBe("SUBMITTED");
            expect(roleRecapStatus(session, null, after)).toBe("MISSING");
            expect(
                roleRecapStatus(
                    session,
                    recap("2026-10-03T12:00:00", true),
                    after,
                ),
            ).toBe("LATE");
        });

        it("recap bị từ chối coi như chưa nộp; recap ở tương lai (ngày giả lập) chưa tính", () => {
            const after = vn("2026-10-04T00:00:00");
            expect(
                roleRecapStatus(
                    session,
                    recap("2026-10-02T20:00:00", false, "REJECTED"),
                    after,
                ),
            ).toBe("MISSING");
            expect(
                roleRecapStatus(
                    session,
                    recap("2026-10-02T20:00:00"),
                    vn("2026-10-02T19:00:00"),
                ),
            ).toBe("PENDING");
        });

        it("trạng thái cặp", () => {
            expect(pairRecapStatus(session, "SUBMITTED", "SUBMITTED")).toBe(
                "DONE",
            );
            expect(pairRecapStatus(session, "SUBMITTED", "PENDING")).toBe(
                "PENDING",
            );
            expect(pairRecapStatus(session, "LATE", "SUBMITTED")).toBe("LATE");
            expect(pairRecapStatus(session, "LATE", "MISSING")).toBe("MISSING");
            expect(
                pairRecapStatus(
                    { ...session, status: "CANCELLED" },
                    "SUBMITTED",
                    "SUBMITTED",
                ),
            ).toBe("CANCELLED");
            expect(
                pairRecapStatus(
                    { status: "ACTIVE" },
                    "NO_SCHEDULE",
                    "NO_SCHEDULE",
                ),
            ).toBe("NO_SCHEDULE");
            expect(combineRecapStatuses("SUBMITTED", "LATE")).toBe("LATE");
        });

        it("chỉ sửa lịch trước thời điểm đã chốt lần đầu", () => {
            expect(
                canEditSchedule(
                    { status: "ACTIVE" },
                    vn("2026-10-20T00:00:00"),
                ),
            ).toBe(true);
            expect(canEditSchedule(session, vn("2026-10-02T09:59:00"))).toBe(
                true,
            );
            expect(canEditSchedule(session, vn("2026-10-02T10:00:00"))).toBe(
                false,
            );
        });

        it("viết recap sau khi buổi kết thúc, chưa duyệt", () => {
            expect(
                canWriteRecap(session, null, vn("2026-10-02T10:30:00")),
            ).toBe(false);
            expect(
                canWriteRecap(session, null, vn("2026-10-02T11:00:00")),
            ).toBe(true);
            expect(
                canWriteRecap(
                    session,
                    { reviewStatus: "APPROVED" },
                    vn("2026-10-05T00:00:00"),
                ),
            ).toBe(false);
        });
    });

    it("lịch phải nằm trong tháng của buổi theo giờ VN", () => {
        expect(
            isWithinMonth(
                vn("2026-10-31T22:00:00"),
                vn("2026-10-31T23:30:00"),
                2026,
                10,
            ),
        ).toBe(true);
        expect(
            isWithinMonth(
                vn("2026-10-31T23:00:00"),
                vn("2026-11-01T00:30:00"),
                2026,
                10,
            ),
        ).toBe(false);
        // 01/10 06:00 VN = 30/09 23:00 UTC: vẫn thuộc tháng 10
        expect(
            isWithinMonth(
                vn("2026-10-01T06:00:00"),
                vn("2026-10-01T07:00:00"),
                2026,
                10,
            ),
        ).toBe(true);
    });
});
