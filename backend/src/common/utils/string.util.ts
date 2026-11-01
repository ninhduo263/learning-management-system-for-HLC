export class StringUtil {
    private static collator = new Intl.Collator("vi", {
        numeric: true,
        sensitivity: "base",
    });
    static capitalize(s: string): string {
        if (!s) {
            return "";
        }
        s.trim();
        return `${s.charAt(0).toUpperCase()}${s.slice(1).toLowerCase()}`;
    }

    static capitalizeComponent(s: string): string {
        if (!s) {
            return "";
        }
        return s
            .split(" ")
            .map((component) => this.capitalize(component))
            .join(" ");
    }

    static getNameComponent(name: string): {
        fullname: string;
        firstname?: string;
        lastname?: string;
    } {
        if (!name) {
            return { fullname: "" };
        }
        name.trim();
        try {
            const temp = name
                .split(" ")
                .map((component) => this.capitalize(component));
            const fullname = temp.join(" ");
            const firstname = temp.splice(-1)[0];
            const lastname = temp.join(" ");
            return { fullname, firstname, lastname };
        } catch (err) {
            return { fullname: name };
        }
    }

    static compareName(
        name1: string,
        name2: string,
        firstnameFirst = true,
    ): number {
        const c1 = this.getNameComponent(name1);
        const c2 = this.getNameComponent(name2);
        return firstnameFirst
            ? this.collator.compare(c1.firstname, c2.firstname) ||
                  this.collator.compare(c1.lastname, c2.lastname) ||
                  0
            : this.collator.compare(c1.lastname, c2.lastname) ||
                  this.collator.compare(c1.firstname, c2.firstname) ||
                  0;
    }

    static normalizeFileName(filename: string): string {
        return this.removeAccents(filename)
            .replace(
                /!|@|%|\^|\*|\(|\)|\+|=|<|>|\?|\/|,|:|;|'|"|&|#|\[|\]|~|\$|_|`|-|{|}|\||\\/g,
                "",
            )
            .trim();
    }

    // TODO: Update base;
    static regexMatch(keyword: string): string {
        if (keyword) {
            const str = this.removeAccents(
                keyword.replace(
                    /!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g,
                    "[\\$&]",
                ),
            )
                .replace(/a|â|ă/g, "[aàáạảãâầấậẩẫăằắặẳẵ]")
                .replace(/e|ê/g, "[eèéẹẻẽêềếệểễ]")
                .replace(/i/g, "[iìíịỉĩ]")
                .replace(/o|ô|ơ/g, "[oòóọỏõôồốộổỗơờớợởỡ]")
                .replace(/u|ư/g, "[uùúụủũưừứựửữ]")
                .replace(/y/g, "[yỳýỵỷỹ]")
                .replace(/d|đ/g, "[dđ]")
                .trim();
            return str;
        }
        return keyword;
    }

    static removeAccents(str: string): string {
        if (!str) {
            return "";
        }
        return str
            .toString()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/đ/g, "d");
    }
}
