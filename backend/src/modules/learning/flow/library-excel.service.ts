import { ApiError } from "@config/exception/api-error";
import { User } from "@module/user/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import * as XLSX from "xlsx";
import { LibraryType } from "../common/constant";
import { LibraryItemModel } from "../models/library-item.model";

const HEADERS = [
    "Loại (Sách / Tài liệu)",
    "Tên sách",
    "Tác giả",
    "Thể loại",
    "Mô tả",
    "Link Google Drive (PDF)",
    "Link tham khảo khác",
];
const text = (value: unknown) => String(value ?? "").trim();
/** So khớp trùng: bỏ dấu, chữ thường, gộp khoảng trắng */
const normalize = (value: string) =>
    value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/gi, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
/** Link file Google Drive: /file/d/<id> hoặc ?id=<id> */
export const isDriveFileLink = (value: string) =>
    /^https:\/\/(drive|docs)\.google\.com\/(file\/d\/[\w-]{10,}|open\?id=[\w-]{10,}|uc\?(.*&)?id=[\w-]{10,})/.test(
        value,
    );

/** Xuất / nhập hàng loạt sách & tài liệu của Thư viện HLC */
@Injectable()
export class LibraryExcelService {
    constructor(
        @InjectModel(LibraryItemModel)
        private readonly libraryModel: typeof LibraryItemModel,
    ) {}

    async export(): Promise<{ fileName: string; buffer: Buffer }> {
        const items = await this.libraryModel.findAll({
            order: [
                ["libraryType", "ASC"],
                ["title", "ASC"],
            ],
            raw: true,
        });
        const rows = [
            HEADERS,
            ...items.map((item) => [
                item.libraryType === LibraryType.BOOK ? "Sách" : "Tài liệu",
                item.title,
                item.author ?? "",
                item.category ?? "",
                item.description ?? "",
                item.fileUrl ?? "",
                item.externalUrl ?? "",
            ]),
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [16, 40, 24, 18, 40, 50, 40].map((wch) => ({ wch }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "THU_VIEN_HLC");
        return {
            fileName: "hlc-thu-vien.xlsx",
            buffer: XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            }) as Buffer,
        };
    }

    /**
     * Nhập hàng loạt: kiểm tra mẫu, link Drive, cảnh báo trùng (bỏ qua dòng trùng).
     * Dòng lỗi được báo riêng, dòng hợp lệ vẫn được thêm. dryRun = true chỉ kiểm tra.
     */
    async import(buffer: Buffer, user: User, dryRun: boolean) {
        let workbook: XLSX.WorkBook;
        try {
            workbook = XLSX.read(buffer, { type: "buffer" });
        } catch {
            throw ApiError.BadRequest("error-import-file-invalid");
        }
        const sheet =
            workbook.Sheets["THU_VIEN_HLC"] ??
            workbook.Sheets[workbook.SheetNames[0]];
        const rows = sheet
            ? XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                  header: 1,
                  raw: false,
                  defval: "",
              })
            : [];
        if (
            HEADERS.some((header, index) => text(rows[0]?.[index]) !== header)
        ) {
            return {
                valid: false,
                applied: false,
                added: [],
                duplicates: [],
                errors: [
                    {
                        row: 1,
                        message:
                            "File không đúng mẫu thư viện. Hãy xuất file mẫu rồi điền vào.",
                    },
                ],
            };
        }
        const existing = await this.libraryModel.findAll({
            attributes: ["title", "author", "fileUrl"],
            raw: true,
        });
        const keys = new Set(
            existing.map(
                (item) =>
                    `${normalize(item.title)}|${normalize(item.author ?? "")}`,
            ),
        );
        const links = new Set(
            existing.map((item) => item.fileUrl).filter(Boolean),
        );
        const added: {
            row: number;
            title: string;
            author: string;
            libraryType: LibraryType;
            category: string;
            description: string;
            fileUrl: string | null;
            externalUrl: string | null;
        }[] = [];
        const duplicates: { row: number; title: string; message: string }[] =
            [];
        const errors: { row: number; message: string }[] = [];
        for (let index = 1; index < rows.length; index += 1) {
            const row = rows[index];
            const line = index + 1;
            if (!row || row.every((cell) => text(cell) === "")) continue;
            const kind = normalize(text(row[0]));
            const libraryType =
                kind === "sach"
                    ? LibraryType.BOOK
                    : kind === "tai lieu"
                      ? LibraryType.DOCUMENT
                      : null;
            const title = text(row[1]);
            const author = text(row[2]);
            const fileUrl = text(row[5]);
            const externalUrl = text(row[6]);
            if (!libraryType) {
                errors.push({
                    row: line,
                    message: `Loại "${text(row[0])}" không hợp lệ (Sách hoặc Tài liệu)`,
                });
                continue;
            }
            if (!title) {
                errors.push({ row: line, message: "Thiếu tên sách" });
                continue;
            }
            if (fileUrl && !isDriveFileLink(fileUrl)) {
                errors.push({
                    row: line,
                    message: `${title}: link Google Drive không hợp lệ (cần dạng https://drive.google.com/file/d/...)`,
                });
                continue;
            }
            if (externalUrl && !/^https?:\/\/\S+\.\S+/.test(externalUrl)) {
                errors.push({
                    row: line,
                    message: `${title}: link tham khảo không hợp lệ`,
                });
                continue;
            }
            const key = `${normalize(title)}|${normalize(author)}`;
            if (keys.has(key) || (fileUrl && links.has(fileUrl))) {
                duplicates.push({
                    row: line,
                    title,
                    message: keys.has(key)
                        ? "Trùng tên + tác giả với sách đã có (bỏ qua)"
                        : "Trùng link Drive với sách đã có (bỏ qua)",
                });
                continue;
            }
            keys.add(key);
            if (fileUrl) links.add(fileUrl);
            added.push({
                row: line,
                title,
                author,
                libraryType,
                category: text(row[3]),
                description: text(row[4]),
                fileUrl: fileUrl || null,
                externalUrl: externalUrl || null,
            });
        }
        if (!dryRun && added.length) {
            await this.libraryModel.bulkCreate(
                added.map((item) => ({
                    libraryType: item.libraryType,
                    title: item.title,
                    author: item.author || null,
                    category: item.category || null,
                    description: item.description || null,
                    fileUrl: item.fileUrl,
                    externalUrl: item.externalUrl,
                    isActive: true,
                    createdBy: user._id,
                })),
            );
        }
        return {
            valid: !errors.length,
            applied: !dryRun && added.length > 0,
            added,
            duplicates,
            errors,
        };
    }
}
