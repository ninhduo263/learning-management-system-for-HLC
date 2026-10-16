export class ObjectUtil {
    static isEmptyObject(obj: any) {
        for (const _ in obj) return false;
        return true;
    }
}
